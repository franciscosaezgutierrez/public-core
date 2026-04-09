import csv
import json
import os
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

NAV_URL = "https://query1.finance.yahoo.com/v8/finance/chart/0P00000RQC.F?interval=1d&range=1d"
VIX_URL = "https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d"

TRIGGER_PREPARACION = -0.05
TRIGGER_ENTRADA_1 = -0.10
TRIGGER_ENTRADA_2 = -0.15
TRIGGER_ENTRADA_3 = -0.20
TRIGGER_ENTRADA_4 = -0.25
TRIGGER_ENTRADA_5 = -0.30

CSV_PATH = "data/nav_history.csv"
LATEST_PATH = "data/latest.json"


def get_last_valid_close(result):
    closes = result["indicators"]["quote"][0].get("close", [])
    return next((x for x in reversed(closes) if x is not None), None)


def get_nav():
    r = requests.get(
        NAV_URL,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    r.raise_for_status()
    data = r.json()
    result = data["chart"]["result"][0]

    nav = result["meta"].get("regularMarketPrice")
    if nav is None:
        nav = get_last_valid_close(result)

    if nav is None:
        raise ValueError("No se pudo obtener el NAV")

    nav_ts = result["meta"].get("regularMarketTime")
    if nav_ts is not None:
        nav_time = datetime.fromtimestamp(nav_ts, tz=timezone.utc)
    else:
        nav_time = datetime.now(timezone.utc)

    return float(nav), nav_time


def get_vix():
    r = requests.get(
        VIX_URL,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    r.raise_for_status()
    data = r.json()
    result = data["chart"]["result"][0]

    vix = result["meta"].get("regularMarketPrice")
    if vix is None:
        vix = get_last_valid_close(result)

    if vix is None:
        raise ValueError("No se pudo obtener el VIX")

    return float(vix)


def load_history():
    if not os.path.exists(CSV_PATH):
        return pd.DataFrame(columns=["timestamp", "nav", "max52", "drop_pct", "scenario", "signal", "vix", "phase"])

    df = pd.read_csv(CSV_PATH)

    if "timestamp" not in df.columns:
        return pd.DataFrame(columns=["timestamp", "nav", "max52", "drop_pct", "scenario", "signal", "vix", "phase"])

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["timestamp"]).copy()

    for col in ["nav", "max52", "drop_pct", "vix"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

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


def get_scenario(drop):
    if drop <= -0.10:
        return "Escenario 4"
    return "Escenario 3"


def get_phase(drop):
    if drop > -0.05:
        return "Fase 0 · Normal"
    elif drop > -0.10:
        return "Fase 1 · Preparación"
    return "Fase 2 · Entradas"


def get_action(drop, vix):
    if drop <= -0.10 and vix > 30:
        return "COMPRAR FUERTE"
    if drop <= -0.10 and vix > 20:
        return "COMPRAR"
    if drop <= -0.10:
        return "VIGILAR VIX"
    if drop <= -0.05:
        return "PREPARAR LIQUIDEZ"
    return "ESPERAR"


def get_entry_label(drop):
    if drop <= -0.30:
        return "Entrada máxima · 15%"
    if drop <= -0.25:
        return "Entrada muy fuerte · 25%"
    if drop <= -0.20:
        return "Entrada fuerte · 30%"
    if drop <= -0.15:
        return "Segunda entrada · 20%"
    if drop <= -0.10:
        return "Entrada inicial · 10%"
    if drop <= -0.05:
        return "Preparación"
    return "Sin entrada"


def get_next_trigger(drop):
    if drop > -0.05:
        return "-5%"
    if drop > -0.10:
        return "-10%"
    if drop > -0.15:
        return "-15%"
    if drop > -0.20:
        return "-20%"
    if drop > -0.25:
        return "-25%"
    if drop > -0.30:
        return "-30%"
    return "Completado"


def market_score(vix):
    score = 0
    if vix > 25:
        score += 1
    return score


def score_label(score):
    if score >= 1:
        return "Oportunidad"
    if score <= -2:
        return "Defensivo"
    return "Neutral"


def get_allocations(scenario):
    if scenario == "Escenario 4":
        return {
            "rv": "62–70%",
            "bonos": "Reducir antes de comprar",
            "liquidez": "Usar por tramos",
            "oro": "4–6%"
        }

    return {
        "rv": "60–62%",
        "bonos": "12–15%",
        "liquidez": "15–18%",
        "oro": "3–5%"
    }


def append_csv(now, nav, max52, drop, scenario, signal, vix, phase):
    os.makedirs("data", exist_ok=True)

    today = now.date().isoformat()

    if os.path.exists(CSV_PATH):
        existing = pd.read_csv(CSV_PATH)
        if "timestamp" in existing.columns:
            existing["timestamp"] = pd.to_datetime(existing["timestamp"], errors="coerce", utc=True)
            existing = existing.dropna(subset=["timestamp"]).copy()

            if (existing["timestamp"].dt.date.astype(str) == today).any():
                return

    file_exists = os.path.exists(CSV_PATH)

    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        if not file_exists:
            writer.writerow(["timestamp", "nav", "max52", "drop_pct", "scenario", "signal", "vix", "phase"])

        writer.writerow([
            now.isoformat(),
            round(nav, 2),
            round(max52, 2),
            round(drop, 5),
            scenario,
            signal,
            round(vix, 2),
            phase
        ])


def save_latest(now, nav, max52, drop, scenario, signal, vix, phase, entry_label, next_trigger, score, score_text, allocations):
    drop_pct_value = round(drop, 5)

    payload = {
        "timestamp": now.isoformat(),
        "nav_date": now.date().isoformat(),
        "nav": round(nav, 2),
        "max52": round(max52, 2),
        "drop_pct": drop_pct_value,
        "drop_percent_display": round(drop * 100, 2),
        "scenario": scenario,
        "signal": signal,
        "vix": round(vix, 2),
        "phase": phase,
        "entry_label": entry_label,
        "next_trigger": next_trigger,
        "score": score,
        "score_text": score_text,
        "allocations": allocations
    }

    os.makedirs("data", exist_ok=True)

    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def main():
    nav, nav_time = get_nav()
    vix = get_vix()
    history = load_history()
    max52 = compute_max52(history, nav, nav_time)

    drop = (nav - max52) / max52
    scenario = get_scenario(drop)
    phase = get_phase(drop)
    signal = get_action(drop, vix)
    entry_label = get_entry_label(drop)
    next_trigger = get_next_trigger(drop)
    score = market_score(vix)
    score_text = score_label(score)
    allocations = get_allocations(scenario)

    append_csv(nav_time, nav, max52, drop, scenario, signal, vix, phase)
    save_latest(
        nav_time,
        nav,
        max52,
        drop,
        scenario,
        signal,
        vix,
        phase,
        entry_label,
        next_trigger,
        score,
        score_text,
        allocations
    )

    print("NAV:", round(nav, 2))
    print("NAV DATE:", nav_time.date().isoformat())
    print("MAX52:", round(max52, 2))
    print("DROP %:", round(drop * 100, 2))
    print("VIX:", round(vix, 2))
    print("SCENARIO:", scenario)
    print("PHASE:", phase)
    print("SIGNAL:", signal)
    print("ENTRY:", entry_label)
    print("NEXT TRIGGER:", next_trigger)
    print("SCORE:", score, score_text)


if __name__ == "__main__":
    main()
