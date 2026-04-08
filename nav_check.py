import csv
import json
import os
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

API_URL = "https://query1.finance.yahoo.com/v8/finance/chart/0P00000RQC.F?interval=1d&range=1d"
TRIGGER_COMPRA = 50.74
TRIGGER_PREALERTA = 51.00
CSV_PATH = "data/nav_history.csv"
LATEST_PATH = "data/latest.json"


def get_nav():
    r = requests.get(
        API_URL,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    r.raise_for_status()
    data = r.json()
    result = data["chart"]["result"][0]

    nav = result["meta"].get("regularMarketPrice")
    if nav is None:
        closes = result["indicators"]["quote"][0].get("close", [])
        nav = next((x for x in reversed(closes) if x is not None), None)

    if nav is None:
        raise ValueError("No se pudo obtener el NAV")

    nav_ts = result["meta"].get("regularMarketTime")
    if nav_ts is not None:
        nav_time = datetime.fromtimestamp(nav_ts, tz=timezone.utc)
    else:
        nav_time = datetime.now(timezone.utc)

    return float(nav), nav_time


def load_history():
    if not os.path.exists(CSV_PATH):
        return pd.DataFrame(columns=["timestamp", "nav", "max52", "drop_pct", "scenario", "signal"])

    df = pd.read_csv(CSV_PATH)

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["timestamp"]).copy()
    df["nav"] = pd.to_numeric(df["nav"], errors="coerce")

    return df


def compute_max52(history, nav, now):
    if history.empty:
        return nav

    cutoff_date = (now - timedelta(days=364)).date()

    recent = (
        history.loc[history["timestamp"].dt.date >= cutoff_date, "nav"]
        .dropna()
        .astype(float)
        .tolist()
    )

    recent.append(nav)
    return max(recent)


def classify(nav, max52):
    drop = (nav - max52) / max52

    if drop <= -0.20:
        scenario = "E4B Crisis"
    elif drop <= -0.10:
        scenario = "E4A Correccion"
    else:
        scenario = "E3 Sobrevaloracion"

    if nav <= TRIGGER_COMPRA:
        signal = "COMPRAR"
    elif nav <= TRIGGER_PREALERTA:
        signal = "PREALERTA"
    else:
        signal = "ESPERAR"

    return drop, scenario, signal


def append_csv(now, nav, max52, drop, scenario, signal):
    os.makedirs("data", exist_ok=True)
    file_exists = os.path.exists(CSV_PATH)

    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        if not file_exists:
            writer.writerow(["timestamp", "nav", "max52", "drop_pct", "scenario", "signal"])

        writer.writerow([
            now.isoformat(),
            round(nav, 2),
            round(max52, 2),
            round(drop, 5),
            scenario,
            signal
        ])


def save_latest(now, nav, max52, drop, scenario, signal):
    payload = {
        "timestamp": now.isoformat(),
        "nav_date": now.date().isoformat(),
        "nav": round(nav, 2),
        "max52": round(max52, 2),
        "drop_pct": round(drop, 5),
        "scenario": scenario,
        "signal": signal
    }

    os.makedirs("data", exist_ok=True)

    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def main():
    nav, nav_time = get_nav()
    history = load_history()
    max52 = compute_max52(history, nav, nav_time)
    drop, scenario, signal = classify(nav, max52)

    append_csv(nav_time, nav, max52, drop, scenario, signal)
    save_latest(nav_time, nav, max52, drop, scenario, signal)

    print("NAV:", round(nav, 2))
    print("NAV DATE:", nav_time.date().isoformat())
    print("MAX52:", round(max52, 2))
    print("DROP:", round(drop * 100, 2), "%")
    print("SCENARIO:", scenario)
    print("SIGNAL:", signal)


if __name__ == "__main__":
    main()
