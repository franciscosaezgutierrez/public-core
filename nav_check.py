import json
import os
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

NAV_URL = "https://query1.finance.yahoo.com/v8/finance/chart/0P00000RQC.F?interval=1d&range=1d"
VIX_URL = "https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d"

CSV_PATH = "data/nav_history.csv"
LATEST_PATH = "data/latest.json"
MANUAL_MACRO_PATH = "data/manual_macro.json"

SYSTEM_LIMITS = {
    "rv_max": 0.70,
    "cash_min": 0.10,
    "cash_max": 0.25,
    "gold_max": 0.07,
    "bond_max_s3": 0.15,
    "emerging_max": 0.08,
    "concentrated_asset_max": 0.12,
}

BASE_COMPOSITION_S3 = {
    "vanguard_global_stock": 0.29,
    "robeco_bp_global_premium": 0.16,
    "heptagon_kopernik": 0.065,
    "robeco_qi_emerging_conservative": 0.065,
    "plan_pensiones_caixabank": 0.025,
    "dnca_alpha_bonds": 0.15,
    "jupiter_global_equity_absolute_return": 0.08,
    "dws_euro_ultra_short": 0.16,
    "invesco_physical_gold": 0.04,
}

NEW_MONEY_RULES = {
    "caro": {
        "invest": 0.50,
        "reserve": 0.50,
        "destination": "Core + calidad",
        "reserve_destination": "Liquidez",
    },
    "neutral": {
        "invest": 0.70,
        "reserve": 0.30,
        "destination": "Core + calidad",
        "reserve_destination": "Liquidez",
    },
    "barato": {
        "invest": 0.90,
        "reserve": 0.10,
        "destination": "Core + calidad",
        "reserve_destination": "Liquidez",
    },
    "defensive_use": {
        "enabled_if_cash_above_target": True,
        "requires_no_rv_increase": True,
        "dnca": 0.60,
        "jupiter": 0.40,
    },
}


def http_get(url):
    r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    return r


def get_last_valid_close(result):
    closes = result["indicators"]["quote"][0].get("close", [])
    return next((x for x in reversed(closes) if x is not None), None)


def get_nav():
    data = http_get(NAV_URL).json()
    result = data["chart"]["result"][0]
    nav = result["meta"].get("regularMarketPrice") or get_last_valid_close(result)
    if nav is None:
        raise ValueError("No se pudo obtener el NAV")
    nav_ts = result["meta"].get("regularMarketTime")
    nav_time = (
        datetime.fromtimestamp(nav_ts, tz=timezone.utc)
        if nav_ts is not None
        else datetime.now(timezone.utc)
    )
    return float(nav), nav_time


def get_vix():
    try:
        data = http_get(VIX_URL).json()
        result = data["chart"]["result"][0]
        vix = result["meta"].get("regularMarketPrice") or get_last_valid_close(result)
        if vix is None:
            return None, None
        vix_ts = result["meta"].get("regularMarketTime")
        vix_time = (
            datetime.fromtimestamp(vix_ts, tz=timezone.utc)
            if vix_ts is not None
            else datetime.now(timezone.utc)
        )
        return float(vix), vix_time
    except Exception:
        return None, None


def load_manual_macro():
    if not os.path.exists(MANUAL_MACRO_PATH):
        return {
            "cape": None,
            "cape_date": None,
            "pmi": None,
            "pmi_date": None,
            "lei_value": None,
            "lei_date": None,
            "lei_value_3m_ago": None,
            "lei_trend_3m": None,
        }

    with open(MANUAL_MACRO_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    return {
        "cape": float(raw["cape"]) if raw.get("cape") is not None else None,
        "cape_date": raw.get("cape_date"),
        "pmi": float(raw["pmi"]) if raw.get("pmi") is not None else None,
        "pmi_date": raw.get("pmi_date"),
        "lei_value": float(raw["lei_value"]) if raw.get("lei_value") is not None else None,
        "lei_date": raw.get("lei_date"),
        "lei_value_3m_ago": (
            float(raw["lei_value_3m_ago"])
            if raw.get("lei_value_3m_ago") is not None
            else None
        ),
        "lei_trend_3m": (
            float(raw["lei_trend_3m"]) if raw.get("lei_trend_3m") is not None else None
        ),
    }


def load_history():
    expected_columns = [
        "timestamp",
        "nav",
        "max52",
        "drop_pct",
        "scenario",
        "signal",
        "vix",
        "phase",
        "cape",
        "pmi",
        "lei",
        "score",
    ]

    if not os.path.exists(CSV_PATH):
        return pd.DataFrame(columns=expected_columns)

    df = pd.read_csv(CSV_PATH)

    if "timestamp" not in df.columns:
        return pd.DataFrame(columns=expected_columns)

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)

    numeric_cols = ["nav", "max52", "drop_pct", "vix", "cape", "pmi", "lei", "score"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["timestamp"]).copy()
    return df


def load_previous_latest():
    if not os.path.exists(LATEST_PATH):
        return {}

    try:
        with open(LATEST_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


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
    if drop > -0.10:
        return "Fase 1 · Preparación"
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
        "vix": 1 if vix is not None and vix > 25 else 0,
    }
    return sum(components.values()), components


def score_label(score):
    if score <= -2:
        return "Defensivo"
    if score >= 1:
        return "Oportunidad"
    return "Neutral"


def get_macro_signal(cape, pmi, lei_trend_3m, vix):
    flags = []
    flags.append(
        "CAPE alto"
        if cape is not None and cape > 35
        else "CAPE OK" if cape is not None else "CAPE n/d"
    )
    flags.append(
        "PMI débil"
        if pmi is not None and pmi < 50
        else "PMI OK" if pmi is not None else "PMI n/d"
    )
    flags.append(
        "LEI negativo"
        if lei_trend_3m is not None and lei_trend_3m < 0
        else "LEI OK" if lei_trend_3m is not None else "LEI n/d"
    )
    flags.append(
        "VIX alto"
        if vix is not None and vix > 25
        else "VIX normal" if vix is not None else "VIX n/d"
    )
    return " · ".join(flags)


def get_scenario(drop, cape, pmi, lei_trend_3m, vix):
    if drop <= -0.10 or (vix is not None and vix > 30):
        return "Escenario 4"
    if (
        cape is not None
        and cape < 28
        and pmi is not None
        and pmi > 52
        and lei_trend_3m is not None
        and lei_trend_3m >= 0
    ):
        return "Escenario 1"
    if (
        cape is not None
        and 28 <= cape <= 35
        and lei_trend_3m is not None
        and lei_trend_3m < 0
    ):
        return "Escenario 2"
    return "Escenario 3"


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
        return {"rv": "70–72%", "bonos": "8–10%", "liquidez": "~10%", "oro": "3–4%"}
    if scenario == "Escenario 2":
        return {"rv": "65–67%", "bonos": "~13%", "liquidez": "~13%", "oro": "3–4%"}
    if scenario == "Escenario 4":
        return {"rv": "60–70%", "bonos": "0–10%", "liquidez": "10–25%", "oro": "4–7%"}
    return {"rv": "60–62%", "bonos": "12–15%", "liquidez": "15–18%", "oro": "3–5%"}


def iso_date(dt_or_text):
    if isinstance(dt_or_text, datetime):
        return dt_or_text.date().isoformat()
    return dt_or_text


def days_old(reference_dt, date_text):
    if not date_text:
        return None
    try:
        ref_date = reference_dt.date()
        target_date = datetime.fromisoformat(str(date_text)).date()
        return max(0, (ref_date - target_date).days)
    except Exception:
        return None


def detect_market_plus_20_from_low(history, nav, now):
    if history.empty:
        return False, None, None

    cutoff_date = (now - timedelta(days=364)).date()
    recent = history.loc[history["timestamp"].dt.date >= cutoff_date, "nav"].dropna().astype(float)
    if recent.empty:
        return False, None, None

    low = min(float(recent.min()), float(nav))
    if low <= 0:
        return False, low, None

    increase = (float(nav) / low) - 1
    return increase >= 0.20, low, increase


def detect_risk_reduction(cape, vix, market_plus_20):
    return bool(cape is not None and cape > 42 and vix is not None and vix < 15 and market_plus_20)


def compute_decision_block(data_freshness, nav_available, vix_available):
    reasons = []
    warnings = []

    if not nav_available:
        reasons.append("Sin NAV")
    if not vix_available:
        reasons.append("Sin VIX")

    thresholds = {
        "nav_days": {"warn": 1, "block": 3, "label": "NAV"},
        "vix_days": {"warn": 1, "block": 3, "label": "VIX"},
        "cape_days": {"warn": 7, "block": 35, "label": "CAPE"},
        "pmi_days": {"warn": 7, "block": 35, "label": "PMI"},
        "lei_days": {"warn": 7, "block": 35, "label": "LEI"},
    }

    for key, cfg in thresholds.items():
        value = (data_freshness or {}).get(key)
        if value is None:
            continue
        if value > cfg["block"]:
            reasons.append(f'{cfg["label"]} > {cfg["block"]} días')
        elif value > cfg["warn"]:
            warnings.append(f'{cfg["label"]} > {cfg["warn"]} días')

    return {
        "blocked": len(reasons) > 0,
        "reasons": reasons,
        "warnings": warnings,
    }


def validate_composition():
    issues = []

    if BASE_COMPOSITION_S3["heptagon_kopernik"] > SYSTEM_LIMITS["concentrated_asset_max"]:
        issues.append("Kopernik supera límite concentrado")
    if (
        BASE_COMPOSITION_S3["robeco_qi_emerging_conservative"]
        > SYSTEM_LIMITS["emerging_max"]
    ):
        issues.append("Emergentes supera límite")
    if BASE_COMPOSITION_S3["invesco_physical_gold"] > SYSTEM_LIMITS["gold_max"]:
        issues.append("Oro supera máximo")
    if BASE_COMPOSITION_S3["dnca_alpha_bonds"] > SYSTEM_LIMITS["bond_max_s3"]:
        issues.append("Bonos superan máximo de escenario 3")

    return issues


def save_history_row(history, row):
    flat = {
        "timestamp": row.get("timestamp"),
        "nav": row.get("nav"),
        "max52": row.get("max52"),
        "drop_pct": row.get("drop_pct"),
        "scenario": row.get("scenario"),
        "signal": row.get("signal"),
        "vix": row.get("vix"),
        "phase": row.get("phase"),
        "cape": row.get("cape"),
        "pmi": row.get("pmi"),
        "lei": (
            row.get("lei", {}).get("value")
            if isinstance(row.get("lei"), dict)
            else row.get("lei")
        ),
        "score": row.get("score"),
    }

    new_row_df = pd.DataFrame([flat])
    df = pd.concat([history, new_row_df], ignore_index=True)

    if "timestamp" not in df.columns:
        df["timestamp"] = pd.NaT

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)

    numeric_cols = ["nav", "max52", "drop_pct", "vix", "cape", "pmi", "lei", "score"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["timestamp"]).copy()
    df = df.sort_values("timestamp").drop_duplicates(
        subset=["timestamp"], keep="last"
    )

    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    df.to_csv(CSV_PATH, index=False)


def save_latest(payload):
    os.makedirs(os.path.dirname(LATEST_PATH), exist_ok=True)
    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def main():
    history = load_history()
    previous = load_previous_latest()

    nav, nav_time = get_nav()
    vix, vix_time = get_vix()
    macro = load_manual_macro()

    cape = macro["cape"]
    pmi = macro["pmi"]
    lei_value = macro["lei_value"]
    lei_date = macro["lei_date"]
    lei_value_3m_ago = macro["lei_value_3m_ago"]
    lei_trend_3m = macro["lei_trend_3m"]

    max52 = compute_max52(history, nav, nav_time)
    drop_pct = 0.0 if max52 == 0 else (nav / max52) - 1

    score, score_components = compute_score(cape, pmi, lei_trend_3m, vix)
    scenario = get_scenario(drop_pct, cape, pmi, lei_trend_3m, vix)
    phase = get_phase(drop_pct)
    action = get_action(drop_pct, vix, score)
    market_plus_20, market_low_reference, market_rebound = detect_market_plus_20_from_low(history, nav, nav_time)

    prior_rotation = previous.get("rotation_state", {}) if isinstance(previous, dict) else {}
    composition_issues = validate_composition()

    now_iso = nav_time.isoformat()
    data_freshness = {
        "cape_days": days_old(nav_time, macro["cape_date"]),
        "pmi_days": days_old(nav_time, macro["pmi_date"]),
        "lei_days": days_old(nav_time, lei_date),
        "nav_days": 0,
        "vix_days": days_old(nav_time, iso_date(vix_time)) if vix_time else None,
    }
    decision_status = compute_decision_block(data_freshness, nav_available=nav is not None, vix_available=vix is not None)

    payload = {
        "timestamp": now_iso,
        "nav_date": iso_date(nav_time),
        "nav": round(nav, 4),
        "max52": round(max52, 4),
        "drop_pct": round(drop_pct, 6),
        "drop_percent_display": round(drop_pct * 100, 2),
        "scenario": scenario,
        "signal": action,
        "vix": round(vix, 2) if vix is not None else None,
        "vix_date": iso_date(vix_time) if vix_time else None,
        "phase": phase,
        "entry_label": get_entry_label(drop_pct),
        "next_trigger": get_next_trigger(drop_pct),
        "score": score,
        "score_text": score_label(score),
        "cape": cape,
        "cape_date": macro["cape_date"],
        "pmi": pmi,
        "pmi_date": macro["pmi_date"],
        "lei": {
            "value": lei_value,
            "date": lei_date,
            "value_3m_ago": lei_value_3m_ago,
            "trend_3m": lei_trend_3m,
        },
        "macro_signal": get_macro_signal(cape, pmi, lei_trend_3m, vix),
        "score_components": score_components,
        "allocations": get_allocations(scenario),
        "system_limits": SYSTEM_LIMITS,
        "composition_target": BASE_COMPOSITION_S3,
        "composition_validation": {
            "valid": len(composition_issues) == 0,
            "issues": composition_issues,
        },
        "priority_of_purchase": [
            "Fondo indexado global (core)",
            "Fondo calidad (active global)",
            "Emergentes / small caps",
        ],
        "new_money_rules": NEW_MONEY_RULES,
        "cash_policy": {
            "high_cape_target": "15–20%",
            "medium_cape_target": "12–15%",
            "low_cape_target": "10–12%",
        },
        "operational_mapping": {
            "liquidity_assets": ["DWS Euro Ultra Short", "Groupama Trésorerie"],
            "rv_assets": [
                "Vanguard Global Stock",
                "Robeco BP Global Premium",
                "Heptagon Kopernik",
                "Robeco Emerging",
                "Plan Pensiones CaixaBank",
            ],
            "non_operational_assets": ["Plan Pensiones CaixaBank"],
            "gold_asset": "Invesco Physical Gold",
        },
        "rebalance_rules": {
            "deviation_tolerance_pp": 4,
            "review_monthly": True,
            "review_structural_quarterly": True,
            "tolerances": {
                "core": 5,
                "quality": 4,
                "dnca": 3,
                "jupiter": 2,
                "gold": 1,
            },
        },
        "flash_crash_rules": {
            "activation": "-4% diario o -7% en 3 sesiones",
            "buy_same_day": False,
            "wait_hours": 48,
            "follow_up": "Entrada progresiva",
        },
        "risk_reduction_rules": {
            "trigger_cape_gt": 42,
            "trigger_vix_lt": 15,
            "market_plus_20_from_low_required": True,
            "market_plus_20_from_low": market_plus_20,
            "market_low_reference": round(market_low_reference, 4) if market_low_reference is not None else None,
            "market_rebound_from_low": round(market_rebound, 6) if market_rebound is not None else None,
            "action": "Aumentar liquidez 5–10% y reducir RV progresivamente",
            "active_now": detect_risk_reduction(cape, vix, market_plus_20),
        },
        "hard_rules": [
            "No comprar sin trigger",
            "No vender en caídas",
            "No usar oro para financiar compras",
            "No comprar DNCA ni Jupiter en caídas",
            "No usar Jupiter como liquidez estructural",
            "No mezclar dinero nuevo y rotación",
        ],
        "operational_checklist": [
            "¿Drawdown ≥ -10%?",
            "¿VIX > 20?",
            "¿Liquidez suficiente?",
            "¿No es dinero nuevo?",
        ],
        "pause_mode": {
            "active": bool(drop_pct > -0.10 and (vix is not None and vix < 20)),
            "rule": "No actuar si drawdown < -10% y VIX < 20",
        },
        "data_freshness": data_freshness,
        "decision_status": decision_status,
        "rotation_state": {
            "executed_levels": prior_rotation.get("executed_levels", []),
            "last_execution_date": prior_rotation.get("last_execution_date"),
            "last_execution_amount": prior_rotation.get("last_execution_amount", 0),
        },
        "sources": {
            "cape": "Manual · Multpl",
            "pmi": "Manual · Composite PMI",
            "lei": "Manual · Leading Index",
        },
    }

    save_history_row(history, payload)
    save_latest(payload)


if __name__ == "__main__":
    main()
