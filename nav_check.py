import json
import os
import re
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

NAV_URL = "https://query1.finance.yahoo.com/v8/finance/chart/0P00000RQC.F?interval=1d&range=1d"
FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
MULTPL_CAPE_URL = "https://www.multpl.com/shiller-pe"

CSV_PATH = "data/nav_history.csv"
LATEST_PATH = "data/latest.json"


def http_get(url):
    r = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0"}
    )
    r.raise_for_status()
    return r


def get_last_valid_close(result):
    closes = result["indicators"]["quote"][0].get("close", [])
    return next((x for x in reversed(closes) if x is not None), None)


def get_nav():
    data = http_get(NAV_URL).json()
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


def get_fred_series(series_id):
    url = FRED_CSV_URL.format(series_id=series_id)
    df = pd.read_csv(url)

    if df.empty:
        raise ValueError(f"Serie FRED vacía: {series_id}")

    df.columns = [str(c).strip() for c in df.columns]

    date_col = None
    for col in df.columns:
        if col.upper() == "DATE":
            date_col = col
            break

    if date_col is None:
        raise ValueError(
            f"No se encontró columna DATE en FRED para {series_id}. Columnas: {list(df.columns)}"
        )

    value_col = None
    if series_id in df.columns:
        value_col = series_id
    else:
        non_date_cols = [c for c in df.columns if c != date_col]
        if non_date_cols:
            value_col = non_date_cols[0]

    if value_col is None:
        raise ValueError(
            f"No se encontró columna de valores en FRED para {series_id}. Columnas: {list(df.columns)}"
        )

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df[value_col] = pd.to_numeric(df[value_col], errors="coerce")
    df = df.dropna(subset=[date_col, value_col]).copy()

    if df.empty:
        raise ValueError(f"Serie FRED sin datos válidos: {series_id}")

    return df.rename(columns={date_col: "date", value_col: "value"})


def get_latest_fred_value(series_id):
    df = get_fred_series(series_id)
    row = df.iloc[-1]
    return float(row["value"]), row["date"]


def get_cape():
    html = http_get(MULTPL_CAPE_URL).text

    patterns = [
        r"Current Shiller PE Ratio:\s*([0-9]+(?:\.[0-9]+)?)",
        r"Shiller PE Ratio:\s*([0-9]+(?:\.[0-9]+)?)"
    ]

    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            return float(match.group(1))

    raise ValueError("No se pudo extraer el CAPE desde Multpl")


def get_vix():
    df = get_fred_series("VIXCLS")
    row = df.iloc[-1]
    return float(row["value"]), row["date"]


def get_pmi():
    """
    Proxy operativo PMI:
    usa la serie FRED NAPM si está disponible.
    Si falla, devuelve None y el sistema sigue funcionando.
    """
    try:
        value, obs_date = get_latest_fred_value("NAPM")
        return float(value), obs_date
    except Exception:
        return None, None


def get_lei():
    """
    Proxy operativo LEI:
    usa OECD CLI normalized para EE.UU. desde FRED.
    """
    df = get_fred_series("USALOLITONOSTSAM")
    current = df.iloc[-1]
    previous_3m = df.iloc[-4] if len(df) >= 4 else df.iloc[0]

    return {
        "value": float(current["value"]),
        "date": current["date"],
        "value_3m_ago": float(previous_3m["value"]),
        "trend_3m": float(current["value"] - previous_3m["value"])
    }


def load_history():
    if not os.path.exists(CSV_PATH):
        return pd.DataFrame(columns=[
            "timestamp", "nav", "max52", "drop_pct", "scenario", "signal",
            "vix", "phase", "cape", "pmi", "lei", "score"
        ])

    df = pd.read_csv(CSV_PATH)

    if "timestamp" not in df.columns:
        return pd.DataFrame(columns=[
            "timestamp", "nav", "max52", "drop_pct", "scenario", "signal",
            "vix", "phase", "cape", "pmi", "lei", "score"
        ])

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["timestamp"]).copy()

    numeric_cols = ["nav", "max52", "drop_pct", "vix", "cape", "pmi", "lei", "score"]
    for col in numeric_cols:
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


def get_phase(drop):
    if drop > -0.05:
        return "Fase 0 · Normal"
    elif drop > -0.10:
        return "Fase 1 · Preparación"
    else:
        return "Fase 2 · Entradas"


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


def compute_score(cape, pmi, lei_trend_3m, vix):
    components = {
        "cape": -1 if cape is not None and cape > 35 else 0,
        "pmi": -1 if pmi is not None and pmi < 50 else 0,
        "lei": -1 if lei_trend_3m is not None and lei_trend_3m < 0 else 0,
        "vix": 1 if vix is not None and vix > 25 else 0
    }
    score = sum(components.values())
    return score, components


def score_label(score):
    if score <= -2:
        return "Defensivo"
    if score >= 1:
        return "Oportunidad"
    return "Neutral"


def get_macro_signal(cape, pmi, lei_trend_3m, vix):
    flags = []

    if cape is not None:
        flags.append("CAPE alto" if cape > 35 else "CAPE controlado")
    else:
        flags.append("CAPE sin dato")

    if pmi is not None:
        flags.append("PMI débil" if pmi < 50 else "PMI expansivo")
    else:
        flags.append("PMI sin dato")

    if lei_trend_3m is not None:
        flags.append("LEI negativo" if lei_trend_3m < 0 else "LEI positivo")
    else:
        flags.append("LEI sin dato")

    if vix is not None:
        flags.append("VIX estrés" if vix > 25 else "VIX normal")
    else:
        flags.append("VIX sin dato")

    return " · ".join(flags)


def get_scenario(drop, cape, pmi, lei_trend_3m, vix):
    if drop <= -0.10 or (vix is not None and vix > 30):
        return "Escenario 4"

    if (
        cape is not None and cape < 28 and
        pmi is not None and pmi > 52 and
        lei_trend_3m is not None and lei_trend_3m >= 0
    ):
        return "Escenario 1"

    if (
        cape is not None and 28 <= cape <= 35 and
        lei_trend_3m is not None and lei_trend_3m < 0
    ):
        return "Escenario 2"

    if cape is not None and cape > 35:
        return "Escenario 3"

    return "Escenario 2"


def get_action(drop, vix, score):
    if drop <= -0.10 and vix is not None and vix > 30:
        return "COMPRAR FUERTE"
    if drop <= -0.10 and vix is not None and vix > 20:
        return "COMPRAR"
    if drop <= -0.10:
        return "VIGILAR VIX"
    if drop <= -0.05:
        return "PREPARAR LIQUIDEZ"
    if score <= -2:
        return "DEFENSIVO"
    return "ESPERAR"


def get_allocations(scenario):
    if scenario == "Escenario 1":
        return {"rv": "70–72%", "bonos": "Reducir", "liquidez": "~10%", "oro": "3–4%"}
    if scenario == "Escenario 2":
        return {"rv": "65–67%", "bonos": "~13%", "liquidez": "~13%", "oro": "3–4%"}
    if scenario == "Escenario 4":
        return {"rv": "62–70%", "bonos": "Reducir antes de usar caja", "liquidez": "Usar por tramos", "oro": "4–6%"}
    return {"rv": "60–62%", "bonos": "12–15%", "liquidez": "15–18%", "oro": "3–5%"}


def append_csv(now, nav, max52, drop, scenario, signal, vix, phase, cape, pmi, lei, score):
    os.makedirs("data", exist_ok=True)

    columns = [
        "timestamp", "nav", "max52", "drop_pct", "scenario", "signal",
        "vix", "phase", "cape", "pmi", "lei", "score"
    ]

    new_row = {
        "timestamp": now.isoformat(),
        "nav": round(nav, 2),
        "max52": round(max52, 2),
        "drop_pct": round(drop, 5),
        "scenario": scenario,
        "signal": signal,
        "vix": round(vix, 2) if vix is not None else None,
        "phase": phase,
        "cape": round(cape, 2) if cape is not None else None,
        "pmi": round(pmi, 2) if pmi is not None else None,
        "lei": round(lei, 4) if lei is not None else None,
        "score": score
    }

    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
    else:
        df = pd.DataFrame(columns=columns)

    if "timestamp" in df.columns and not df.empty:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        today_mask = df["timestamp"].dt.date == now.date()

        if today_mask.any():
            df.loc[today_mask, columns] = [
                new_row["timestamp"],
                new_row["nav"],
                new_row["max52"],
                new_row["drop_pct"],
                new_row["scenario"],
                new_row["signal"],
                new_row["vix"],
                new_row["phase"],
                new_row["cape"],
                new_row["pmi"],
                new_row["lei"],
                new_row["score"]
            ]
        else:
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    else:
        df = pd.DataFrame([new_row], columns=columns)

    df.to_csv(CSV_PATH, index=False, encoding="utf-8")


def save_latest(
    now, nav, max52, drop, scenario, signal, vix, phase,
    entry_label, next_trigger, score, score_text, allocations,
    cape, pmi, lei_payload, macro_signal, score_components
):
    payload = {
        "timestamp": now.isoformat(),
        "nav_date": now.date().isoformat(),
        "nav": round(nav, 2),
        "max52": round(max52, 2),
        "drop_pct": round(drop, 5),
        "drop_percent_display": round(drop * 100, 2),
        "scenario": scenario,
        "signal": signal,
        "vix": round(vix, 2) if vix is not None else None,
        "phase": phase,
        "entry_label": entry_label,
        "next_trigger": next_trigger,
        "score": score,
        "score_text": score_text,
        "cape": round(cape, 2) if cape is not None else None,
        "pmi": round(pmi, 2) if pmi is not None else None,
        "lei": {
            "value": round(lei_payload["value"], 4) if lei_payload["value"] is not None else None,
            "date": lei_payload["date"].strftime("%Y-%m-%d") if lei_payload["date"] is not None else None,
            "value_3m_ago": round(lei_payload["value_3m_ago"], 4) if lei_payload["value_3m_ago"] is not None else None,
            "trend_3m": round(lei_payload["trend_3m"], 4) if lei_payload["trend_3m"] is not None else None
        },
        "macro_signal": macro_signal,
        "score_components": score_components,
        "allocations": allocations
    }

    os.makedirs("data", exist_ok=True)
    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def main():
    nav, nav_time = get_nav()

    try:
        vix, _ = get_vix()
    except Exception:
        vix = None

    try:
        cape = get_cape()
    except Exception:
        cape = None

    try:
        pmi, _ = get_pmi()
    except Exception:
        pmi = None

    try:
        lei_payload = get_lei()
    except Exception:
        lei_payload = {
            "value": None,
            "date": None,
            "value_3m_ago": None,
            "trend_3m": None
        }

    history = load_history()
    max52 = compute_max52(history, nav, nav_time)
    drop = (nav - max52) / max52

    score, score_components = compute_score(cape, pmi, lei_payload["trend_3m"], vix)
    score_text = score_label(score)
    macro_signal = get_macro_signal(cape, pmi, lei_payload["trend_3m"], vix)

    scenario = get_scenario(drop, cape, pmi, lei_payload["trend_3m"], vix)
    phase = get_phase(drop)
    signal = get_action(drop, vix, score)
    entry_label = get_entry_label(drop)
    next_trigger = get_next_trigger(drop)
    allocations = get_allocations(scenario)

    append_csv(
        nav_time, nav, max52, drop, scenario, signal, vix, phase,
        cape, pmi, lei_payload["value"], score
    )

    save_latest(
        nav_time, nav, max52, drop, scenario, signal, vix, phase,
        entry_label, next_trigger, score, score_text, allocations,
        cape, pmi, lei_payload, macro_signal, score_components
    )

    print("NAV:", round(nav, 2))
    print("MAX52:", round(max52, 2))
    print("DROP %:", round(drop * 100, 2))
    print("VIX:", round(vix, 2) if vix is not None else "n/a")
    print("CAPE:", round(cape, 2) if cape is not None else "n/a")
    print("PMI:", round(pmi, 2) if pmi is not None else "n/a")
    print("LEI:", round(lei_payload["value"], 4) if lei_payload["value"] is not None else "n/a")
    print("LEI 3M TREND:", round(lei_payload["trend_3m"], 4) if lei_payload["trend_3m"] is not None else "n/a")
    print("SCENARIO:", scenario)
    print("PHASE:", phase)
    print("SIGNAL:", signal)
    print("SCORE:", score, score_text)


if __name__ == "__main__":
    main()
