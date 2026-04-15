import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests

NAV_URL = "https://query1.finance.yahoo.com/v8/finance/chart/0P00000RQC.F?interval=1d&range=1d"
VIX_URL = "https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1d"

CSV_PATH = "data/nav_history.csv"
LATEST_PATH = "data/latest.json"
MANUAL_MACRO_PATH = "data/manual_macro.json"

PROJECT_VERSION = "2.3"
PROJECT_NAME = "Sistema de Rotación de Cartera"

SYSTEM_LIMITS = {
    "rv_max": 0.70,
    "cash_min": 0.10,
    "cash_max": 0.25,
    "gold_max": 0.07,
    "bond_max_s3": 0.15,
    "emerging_max": 0.08,
    "concentrated_asset_max": 0.12,
}

STRUCTURAL_TARGETS = {
    "SC1": {
        "label": "🟢 Escenario 1 · Expansión",
        "weights": {"rv": "70–72%", "bonos": "8–10%", "retorno_absoluto": "6–8%", "liquidez": "~10%", "oro": "3–4%"},
    },
    "SC2": {
        "label": "🟡 Escenario 2 · Desaceleración",
        "weights": {"rv": "65–67%", "bonos": "~13%", "retorno_absoluto": "~8%", "liquidez": "~13%", "oro": "3–4%"},
    },
    "SC3": {
        "label": "🟠 Escenario 3 · Sobrevaloración",
        "weights": {"rv": "60–62%", "bonos": "15%", "retorno_absoluto": "8%", "liquidez": "15–18%", "oro": "3–5%"},
    },
    "SC4": {
        "label": "🔴 Escenario 4 · Corrección",
        "weights": {"rv": "60–70%", "bonos": "0–10%", "retorno_absoluto": "8%", "liquidez": "10–25%", "oro": "4–7%"},
    },
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

ROTATION_BUCKETS = [
    {"trigger_dd": -10, "label": "Entrada inicial", "allocation": 0.10},
    {"trigger_dd": -15, "label": "Segunda entrada", "allocation": 0.20},
    {"trigger_dd": -20, "label": "Entrada fuerte", "allocation": 0.30},
    {"trigger_dd": -25, "label": "Entrada muy fuerte", "allocation": 0.25},
    {"trigger_dd": -30, "label": "Entrada máxima", "allocation": 0.15},
]


def http_get(url: str) -> requests.Response:
    response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    response.raise_for_status()
    return response



def get_last_valid_close(result: Dict[str, Any]) -> Optional[float]:
    closes = result["indicators"]["quote"][0].get("close", [])
    return next((x for x in reversed(closes) if x is not None), None)



def get_nav(previous: Optional[Dict[str, Any]] = None) -> Tuple[float, datetime]:
    try:
        data = http_get(NAV_URL).json()
        result = data["chart"]["result"][0]
        nav = result["meta"].get("regularMarketPrice") or get_last_valid_close(result)
        if nav is None:
            raise ValueError("No se pudo obtener el NAV")
        nav_ts = result["meta"].get("regularMarketTime")
        nav_time = datetime.fromtimestamp(nav_ts, tz=timezone.utc) if nav_ts is not None else datetime.now(timezone.utc)
        return float(nav), nav_time
    except Exception:
        if previous and previous.get("nav") is not None:
            fallback_dt = previous.get("timestamp") or previous.get("updated_at")
            try:
                parsed = datetime.fromisoformat(str(fallback_dt).replace("Z", "+00:00")) if fallback_dt else datetime.now(timezone.utc)
            except Exception:
                parsed = datetime.now(timezone.utc)
            return float(previous["nav"]), parsed
        raise



def get_vix(previous: Optional[Dict[str, Any]] = None) -> Tuple[Optional[float], Optional[datetime]]:
    try:
        data = http_get(VIX_URL).json()
        result = data["chart"]["result"][0]
        vix = result["meta"].get("regularMarketPrice") or get_last_valid_close(result)
        if vix is None:
            return None, None
        vix_ts = result["meta"].get("regularMarketTime")
        vix_time = datetime.fromtimestamp(vix_ts, tz=timezone.utc) if vix_ts is not None else datetime.now(timezone.utc)
        return float(vix), vix_time
    except Exception:
        if previous and previous.get("vix") is not None:
            fallback_dt = previous.get("vix_date") or previous.get("timestamp")
            try:
                parsed = datetime.fromisoformat(str(fallback_dt).replace("Z", "+00:00")) if fallback_dt else None
            except Exception:
                parsed = None
            return float(previous["vix"]), parsed
        return None, None



def load_manual_macro() -> Dict[str, Any]:
    defaults = {
        "cape": None,
        "cape_date": None,
        "pmi": None,
        "pmi_date": None,
        "lei_value": None,
        "lei_date": None,
        "lei_value_3m_ago": None,
        "lei_trend_3m": None,
        "per_global": None,
        "per_global_date": None,
        "per_global_source": None,
    }
    if not os.path.exists(MANUAL_MACRO_PATH):
        return defaults

    with open(MANUAL_MACRO_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)

    parsed = defaults.copy()
    for key in ["cape", "pmi", "lei_value", "lei_value_3m_ago", "lei_trend_3m", "per_global"]:
        parsed[key] = float(raw[key]) if raw.get(key) is not None else None
    for key in ["cape_date", "pmi_date", "lei_date", "per_global_date", "per_global_source"]:
        parsed[key] = raw.get(key)
    return parsed



def load_history() -> pd.DataFrame:
    expected_columns = [
        "timestamp", "nav", "max52", "drop_pct", "scenario_code", "scenario",
        "signal", "vix", "phase", "cape", "pmi", "lei", "score"
    ]
    if not os.path.exists(CSV_PATH):
        return pd.DataFrame(columns=expected_columns)

    df = pd.read_csv(CSV_PATH)
    if "timestamp" not in df.columns:
        return pd.DataFrame(columns=expected_columns)

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    for col in ["nav", "max52", "drop_pct", "vix", "cape", "pmi", "lei", "score"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.dropna(subset=["timestamp"]).copy()



def load_previous_latest() -> Dict[str, Any]:
    if not os.path.exists(LATEST_PATH):
        return {}
    try:
        with open(LATEST_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}



def compute_max52(history: pd.DataFrame, nav: float, now: datetime) -> float:
    if history.empty:
        return nav
    cutoff_date = (now - timedelta(days=364)).date()
    recent = history.loc[history["timestamp"].dt.date >= cutoff_date, "nav"].dropna().astype(float).tolist()
    recent.append(nav)
    return max(recent)



def days_old(reference_dt: datetime, date_text: Optional[str]) -> Optional[int]:
    if not date_text:
        return None
    try:
        target_date = datetime.fromisoformat(str(date_text)).date()
        return max(0, (reference_dt.date() - target_date).days)
    except Exception:
        return None



def iso_date(dt_or_text: Any) -> Any:
    if isinstance(dt_or_text, datetime):
        return dt_or_text.date().isoformat()
    return dt_or_text



def detect_market_plus_20_from_low(history: pd.DataFrame, nav: float, now: datetime) -> Tuple[bool, Optional[float], Optional[float]]:
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



def classify_valuation(cape: Optional[float], per_global: Optional[float]) -> Dict[str, Any]:
    cape_state = "N/D"
    if cape is not None:
        cape_state = "ALTO" if cape > 35 else "BAJO" if cape < 28 else "MEDIO"

    per_state = "N/D"
    if per_global is not None:
        per_state = "ALTO" if per_global > 18 else "BAJO" if per_global < 15 else "NORMAL"

    mapping = {
        ("ALTO", "ALTO"): ("MUY_CARO", "Muy caro"),
        ("ALTO", "NORMAL"): ("CARO_MODERADO", "Caro moderado"),
        ("ALTO", "BAJO"): ("CARO_DUDOSO", "Caro dudoso"),
        ("MEDIO", "NORMAL"): ("NEUTRAL", "Neutral"),
        ("BAJO", "BAJO"): ("BARATO", "Barato"),
    }
    code, label = mapping.get((cape_state, per_state), ("INDETERMINADO", "Indeterminado"))
    return {
        "cape_state": cape_state,
        "per_global_state": per_state,
        "composite_code": code,
        "composite_label": label,
    }



def get_scenario(cape: Optional[float], pmi: Optional[float], lei_trend_3m: Optional[float], per_global: Optional[float], drop_percent: float, vix: Optional[float]) -> Dict[str, Any]:
    if drop_percent <= -10 or (vix is not None and vix > 30):
        return {"code": "SC4", "label": STRUCTURAL_TARGETS["SC4"]["label"], "reason": "Drawdown ≥ -10% o VIX > 30"}

    if cape is not None and cape < 28 and pmi is not None and pmi > 52 and lei_trend_3m is not None and lei_trend_3m >= 0:
        return {"code": "SC1", "label": STRUCTURAL_TARGETS["SC1"]["label"], "reason": "CAPE < 28, PMI > 52 y LEI no negativo"}

    if cape is not None and 28 <= cape <= 35 and lei_trend_3m is not None and lei_trend_3m < 0:
        return {"code": "SC2", "label": STRUCTURAL_TARGETS["SC2"]["label"], "reason": "CAPE 28–35 y LEI negativo"}

    reason = "CAPE > 35 y sin corrección suficiente"
    if cape is not None and cape > 35 and per_global is not None and per_global <= 18:
        reason = "Sobrevaloración moderada: CAPE alto, PER global no extremo"
    return {"code": "SC3", "label": STRUCTURAL_TARGETS["SC3"]["label"], "reason": reason}



def get_phase(drop_percent: float) -> Dict[str, Any]:
    if drop_percent > -5:
        return {"code": "P0", "label": "Fase 0 · No actuar"}
    if drop_percent > -10:
        return {"code": "P1", "label": "Fase 1 · Preparar liquidez"}
    return {"code": "P2", "label": "Fase 2 · Entradas"}



def get_entry_label(drop_percent: float) -> str:
    for bucket in reversed(ROTATION_BUCKETS):
        if drop_percent <= bucket["trigger_dd"]:
            return f'{bucket["label"]} · {int(bucket["allocation"] * 100)}%'
    return "Sin entrada"



def get_next_trigger(drop_percent: float) -> str:
    for bucket in ROTATION_BUCKETS:
        if drop_percent > bucket["trigger_dd"]:
            return f'{bucket["trigger_dd"]}%'
    return "Completado"



def compute_score(cape: Optional[float], pmi: Optional[float], lei_trend_3m: Optional[float], vix: Optional[float]) -> Tuple[int, Dict[str, int]]:
    components = {
        "cape": -1 if cape is not None and cape > 35 else 0,
        "pmi": -1 if pmi is not None and pmi < 50 else 0,
        "lei": -1 if lei_trend_3m is not None and lei_trend_3m < 0 else 0,
        "vix": 1 if vix is not None and vix > 25 else 0,
    }
    return sum(components.values()), components



def score_label(score: int) -> str:
    if score <= -2:
        return "Defensivo"
    if score >= 1:
        return "Oportunidad"
    return "Neutral"



def get_macro_signal(cape: Optional[float], pmi: Optional[float], lei_trend_3m: Optional[float], vix: Optional[float]) -> str:
    parts = []
    parts.append("CAPE alto" if cape is not None and cape > 35 else "CAPE OK" if cape is not None else "CAPE n/d")
    parts.append("PMI débil" if pmi is not None and pmi < 50 else "PMI OK" if pmi is not None else "PMI n/d")
    parts.append("LEI negativo" if lei_trend_3m is not None and lei_trend_3m < 0 else "LEI OK" if lei_trend_3m is not None else "LEI n/d")
    parts.append("VIX alto" if vix is not None and vix > 25 else "VIX normal" if vix is not None else "VIX n/d")
    return " · ".join(parts)



def get_new_money_rule(valuation_code: str) -> Dict[str, Any]:
    rules = {
        "MUY_CARO": {"rule": "50% invertir / 50% reservar", "invest": 0.50, "reserve": 0.50, "note": "Mercado muy caro. Prudencia máxima."},
        "CARO_MODERADO": {"rule": "60% invertir / 40% reservar", "invest": 0.60, "reserve": 0.40, "note": "Mercado caro, pero no extremo globalmente."},
        "NEUTRAL": {"rule": "70% invertir / 30% reservar", "invest": 0.70, "reserve": 0.30, "note": "Valoración razonable."},
        "BARATO": {"rule": "90% invertir / 10% reservar", "invest": 0.90, "reserve": 0.10, "note": "Valoración favorable."},
        "CARO_DUDOSO": {"rule": "60% invertir / 40% reservar", "invest": 0.60, "reserve": 0.40, "note": "CAPE alto sin confirmación del PER. Se mantiene prudencia."},
        "INDETERMINADO": {"rule": "50% invertir / 50% reservar", "invest": 0.50, "reserve": 0.50, "note": "Datos insuficientes. Se aplica prudencia."},
    }
    selected = rules.get(valuation_code, rules["INDETERMINADO"]).copy()
    selected.update({
        "destination": ["Vanguard Global Stock", "Robeco BP Global Premium"],
        "reserve_destination": "Liquidez",
        "defensive_use": {
            "enabled_if_cash_above_target": True,
            "requires_no_rv_increase": True,
            "distribution": {"dnca": 0.60, "jupiter": 0.40},
        },
    })
    return selected



def compute_rotation_plan(drop_percent: float, vix: Optional[float], previous_rotation: Dict[str, Any]) -> Dict[str, Any]:
    executed_levels = previous_rotation.get("executed_levels", []) if isinstance(previous_rotation, dict) else []
    reached = [bucket for bucket in ROTATION_BUCKETS if drop_percent <= bucket["trigger_dd"]]
    pending = [bucket for bucket in reached if bucket["trigger_dd"] not in executed_levels]

    trigger_active = drop_percent <= -10 or (vix is not None and vix > 30)
    validated_for_purchase = drop_percent <= -10 and vix is not None and vix > 20
    pretrigger = -10 < drop_percent <= -5

    if validated_for_purchase:
        action = "COMPRAR POR TRAMOS"
    elif trigger_active:
        action = "TRIGGER PARCIAL · FALTA VALIDACIÓN VIX>20"
    elif pretrigger:
        action = "PREPARAR LIQUIDEZ"
    else:
        action = "NO ACTUAR"

    destination = {
        "core": 0.50,
        "quality": 0.30,
        "emerging": 0.20,
    }

    return {
        "trigger_active": trigger_active,
        "validated_for_purchase": validated_for_purchase,
        "pretrigger": pretrigger,
        "action": action,
        "entry_label": get_entry_label(drop_percent),
        "next_trigger": get_next_trigger(drop_percent),
        "source_order": ["Liquidez", "DNCA", "Jupiter (solo si necesario)"],
        "destination_order": ["Core", "Calidad", "Emergentes"],
        "destination_weights": destination,
        "available_buckets": ROTATION_BUCKETS,
        "reached_buckets": reached,
        "pending_buckets": pending,
        "executed_levels": executed_levels,
        "last_execution_date": previous_rotation.get("last_execution_date"),
        "last_execution_amount": previous_rotation.get("last_execution_amount", 0),
        "forbidden_uses": [
            "No usar dinero nuevo",
            "No usar oro",
            "No comprar DNCA en caídas",
            "No comprar Jupiter en caídas",
        ],
    }



def detect_risk_reduction(cape: Optional[float], vix: Optional[float], market_plus_20: bool) -> bool:
    return bool(cape is not None and cape > 42 and vix is not None and vix < 15 and market_plus_20)



def compute_decision_block(data_freshness: Dict[str, Optional[int]], nav_available: bool, vix_available: bool) -> Dict[str, Any]:
    reasons: List[str] = []
    warnings: List[str] = []
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
        "per_global_days": {"warn": 7, "block": 21, "label": "PER global"},
    }
    for key, cfg in thresholds.items():
        value = data_freshness.get(key)
        if value is None:
            continue
        if value > cfg["block"]:
            reasons.append(f'{cfg["label"]} > {cfg["block"]} días')
        elif value > cfg["warn"]:
            warnings.append(f'{cfg["label"]} > {cfg["warn"]} días')
    return {"blocked": bool(reasons), "reasons": reasons, "warnings": warnings}



def validate_composition() -> List[str]:
    issues: List[str] = []
    if BASE_COMPOSITION_S3["heptagon_kopernik"] > SYSTEM_LIMITS["concentrated_asset_max"]:
        issues.append("Kopernik supera límite concentrado")
    if BASE_COMPOSITION_S3["robeco_qi_emerging_conservative"] > SYSTEM_LIMITS["emerging_max"]:
        issues.append("Emergentes supera límite")
    if BASE_COMPOSITION_S3["invesco_physical_gold"] > SYSTEM_LIMITS["gold_max"]:
        issues.append("Oro supera máximo")
    if BASE_COMPOSITION_S3["dnca_alpha_bonds"] > SYSTEM_LIMITS["bond_max_s3"]:
        issues.append("Bonos superan máximo de escenario 3")
    return issues



def compute_pause_mode(drop_percent: float, vix: Optional[float]) -> Dict[str, Any]:
    active = drop_percent > -10 and vix is not None and vix < 20
    reason = "Drawdown insuficiente y VIX por debajo de validación" if active else "No aplica"
    return {"active": active, "rule": "No actuar si drawdown < -10% y VIX < 20", "reason": reason}



def build_operational_action(rotation: Dict[str, Any], pause_mode: Dict[str, Any], decision_status: Dict[str, Any]) -> str:
    if decision_status.get("blocked"):
        return "BLOQUEADO"
    if pause_mode.get("active"):
        return "NO ACTUAR"
    return rotation["action"]



def save_history_row(history: pd.DataFrame, row: Dict[str, Any]) -> None:
    flat = {
        "timestamp": row.get("timestamp"),
        "nav": row.get("nav"),
        "max52": row.get("max52"),
        "drop_pct": row.get("drop_pct"),
        "scenario_code": row.get("scenario_code"),
        "scenario": row.get("scenario"),
        "signal": row.get("signal"),
        "vix": row.get("vix"),
        "phase": row.get("phase"),
        "cape": row.get("cape"),
        "pmi": row.get("pmi"),
        "lei": row.get("lei", {}).get("value") if isinstance(row.get("lei"), dict) else row.get("lei"),
        "score": row.get("score"),
    }
    new_row_df = pd.DataFrame([flat])
    df = pd.concat([history, new_row_df], ignore_index=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    for col in ["nav", "max52", "drop_pct", "vix", "cape", "pmi", "lei", "score"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["timestamp"]).sort_values("timestamp").drop_duplicates(subset=["timestamp"], keep="last")
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    df.to_csv(CSV_PATH, index=False)



def save_latest(payload: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(LATEST_PATH), exist_ok=True)
    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)



def main() -> None:
    history = load_history()
    previous = load_previous_latest()

    nav, nav_time = get_nav(previous)
    vix, vix_time = get_vix(previous)
    macro = load_manual_macro()

    cape = macro["cape"]
    pmi = macro["pmi"]
    lei_value = macro["lei_value"]
    lei_date = macro["lei_date"]
    lei_value_3m_ago = macro["lei_value_3m_ago"]
    lei_trend_3m = macro["lei_trend_3m"]
    per_global = macro["per_global"]

    max52 = compute_max52(history, nav, nav_time)
    drop_pct = 0.0 if max52 == 0 else (nav / max52) - 1
    drop_percent_display = round(drop_pct * 100, 2)

    valuation = classify_valuation(cape, per_global)
    scenario = get_scenario(cape, pmi, lei_trend_3m, per_global, drop_percent_display, vix)
    phase = get_phase(drop_percent_display)
    score, score_components = compute_score(cape, pmi, lei_trend_3m, vix)

    prior_rotation = previous.get("rotation_state", {}) if isinstance(previous, dict) else {}
    rotation = compute_rotation_plan(drop_percent_display, vix, prior_rotation)
    market_plus_20, market_low_reference, market_rebound = detect_market_plus_20_from_low(history, nav, nav_time)
    pause_mode = compute_pause_mode(drop_percent_display, vix)
    composition_issues = validate_composition()

    data_freshness = {
        "cape_days": days_old(nav_time, macro["cape_date"]),
        "pmi_days": days_old(nav_time, macro["pmi_date"]),
        "lei_days": days_old(nav_time, lei_date),
        "per_global_days": days_old(nav_time, macro["per_global_date"]),
        "nav_days": 0,
        "vix_days": days_old(nav_time, iso_date(vix_time)) if vix_time else None,
        "status": "Datos frescos",
    }
    decision_status = compute_decision_block(data_freshness, nav_available=nav is not None, vix_available=vix is not None)
    action = build_operational_action(rotation, pause_mode, decision_status)

    payload = {
        "project": PROJECT_NAME,
        "version": PROJECT_VERSION,
        "timestamp": nav_time.isoformat(),
        "updated_at": nav_time.isoformat(),
        "nav_date": iso_date(nav_time),
        "scenario_code": scenario["code"],
        "scenario": scenario["label"],
        "scenario_reason": scenario["reason"],
        "phase_code": phase["code"],
        "phase": phase["label"],
        "signal": action,
        "score": score,
        "score_text": score_label(score),
        "macro_signal": get_macro_signal(cape, pmi, lei_trend_3m, vix),
        "nav": round(nav, 4),
        "max52": round(max52, 4),
        "drop_pct": round(drop_pct, 6),
        "drop_percent_display": drop_percent_display,
        "vix": round(vix, 2) if vix is not None else None,
        "vix_date": iso_date(vix_time) if vix_time else None,
        "entry_label": rotation["entry_label"],
        "next_trigger": rotation["next_trigger"],
        "valuation": {
            "cape_sp500": cape,
            "cape_date": macro["cape_date"],
            "per_global": per_global,
            "per_global_date": macro["per_global_date"],
            "per_global_source": macro["per_global_source"],
            **valuation,
        },
        "cape": cape,
        "cape_date": macro["cape_date"],
        "pmi": pmi,
        "pmi_date": macro["pmi_date"],
        "lei": {"value": lei_value, "date": lei_date, "value_3m_ago": lei_value_3m_ago, "trend_3m": lei_trend_3m},
        "score_components": score_components,
        "structural_targets": STRUCTURAL_TARGETS,
        "allocations": STRUCTURAL_TARGETS[scenario["code"]]["weights"],
        "composition_target": BASE_COMPOSITION_S3,
        "system_limits": SYSTEM_LIMITS,
        "composition_validation": {"valid": not composition_issues, "issues": composition_issues},
        "new_money_rule": get_new_money_rule(valuation["composite_code"]),
        "rotation_state": rotation,
        "capital_layers": {
            "structural": "Asignación objetivo",
            "tactical": "Rotación por caídas",
            "flows": "Dinero nuevo",
            "key_rule": "Nunca mezclar estas tres capas",
        },
        "operational_mapping": {
            "liquidity_assets": ["DWS Euro Ultra Short", "Groupama Trésorerie"],
            "bond_asset": "DNCA Invest Alpha Bonds",
            "absolute_return_asset": "Jupiter Global Equity Absolute Return",
            "gold_asset": "Invesco Physical Gold ETC",
            "rv_assets": [
                "Vanguard Global Stock",
                "Robeco BP Global Premium",
                "Heptagon Kopernik",
                "Robeco Emerging",
                "Plan Pensiones CaixaBank",
            ],
            "non_rotational_assets": ["Plan Pensiones CaixaBank", "Invesco Physical Gold ETC"],
        },
        "cash_policy": {
            "high_cape_target": "15–20%",
            "medium_cape_target": "12–15%",
            "low_cape_target": "10–12%",
            "liquidity_definition": ["DWS Euro Ultra Short", "Groupama Trésorerie"],
        },
        "rebalance_rules": {
            "review": "Mensual",
            "trigger": "±4 pp",
            "tolerances": {"core": 5, "quality": 4, "dnca": 3, "jupiter": 2, "gold": 1},
        },
        "risk_reduction_rules": {
            "trigger_cape_gt": 42,
            "trigger_vix_lt": 15,
            "market_plus_20_from_low_required": True,
            "market_plus_20_from_low": market_plus_20,
            "market_low_reference": round(market_low_reference, 4) if market_low_reference is not None else None,
            "market_rebound_from_low": round(market_rebound, 6) if market_rebound is not None else None,
            "action": "Reducir RV progresivamente y aumentar liquidez 5–10%",
            "active_now": detect_risk_reduction(cape, vix, market_plus_20),
        },
        "flash_crash_rules": {
            "wait_hours": 48,
            "follow_up": "Entrada progresiva",
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
            {"question": "¿Drawdown ≥ -10%?", "ok": drop_percent_display <= -10},
            {"question": "¿VIX > 20?", "ok": vix is not None and vix > 20},
            {"question": "¿Liquidez suficiente?", "ok": True},
            {"question": "¿No es dinero nuevo?", "ok": True},
        ],
        "pause_mode": pause_mode,
        "data_freshness": data_freshness,
        "decision_status": decision_status,
        "sources": {
            "nav": "Yahoo Finance",
            "vix": "Yahoo Finance",
            "cape": "Manual · Multpl",
            "pmi": "Manual · Composite PMI",
            "lei": "Manual · Leading Index",
            "per_global": "Manual · Vanguard",
        },
    }

    save_history_row(history, payload)
    save_latest(payload)


if __name__ == "__main__":
    main()
