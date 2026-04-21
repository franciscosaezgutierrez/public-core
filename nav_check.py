import json
import os
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

from config import (
    BASE_COMPOSITION,
    HARD_RULES,
    OPERABLE_TARGET_WEIGHTS,
    OPERABLE_UNIVERSE,
    ROTATION_CAPITAL_SOURCES,
    SYSTEM_LIMITS,
    TOTAL_TARGET_WEIGHTS,
    WEIGHT_SOURCE_KEYS,
)
from engine import (
    apply_flash_crash_window,
    build_current_weights_from_payload,
    compute_asset_permissions,
    compute_score,
    compute_valuation,
    compute_weight_deviations,
    detect_flash_crash,
    get_action_label,
    get_allocations,
    get_entry_label,
    get_macro_signal,
    get_new_money_plan,
    get_next_trigger,
    get_pause_mode,
    get_phase,
    get_rotation_plan,
    get_scenario_label,
    get_valuation_adjustment,
    resolve_scenario,
    score_label,
)

NAV_URL = "https://query1.finance.yahoo.com/v8/finance/chart/0P00000RQC.F?interval=1d&range=5d"
VIX_URL = "https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=5d"
CSV_PATH = "data/nav_history.csv"
LATEST_PATH = "data/latest.json"
MANUAL_MACRO_PATH = "data/manual_macro.json"


def http_get(url):
    r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    return r


def get_last_valid_close(result):
    closes = result["indicators"]["quote"][0].get("close", [])
    return next((x for x in reversed(closes) if x is not None), None)


def get_last_two_valid_closes(result):
    closes = [x for x in result["indicators"]["quote"][0].get("close", []) if x is not None]
    if not closes:
        return None, None
    if len(closes) == 1:
        return closes[-1], None
    return closes[-1], closes[-2]


def get_nav():
    data = http_get(NAV_URL).json()
    result = data["chart"]["result"][0]
    nav = result["meta"].get("regularMarketPrice") or get_last_valid_close(result)
    if nav is None:
        raise ValueError("No se pudo obtener el NAV")
    last_close, prev_close = get_last_two_valid_closes(result)
    nav_ts = result["meta"].get("regularMarketTime")
    nav_time = datetime.fromtimestamp(nav_ts, tz=timezone.utc) if nav_ts is not None else datetime.now(timezone.utc)
    return float(nav), nav_time, float(prev_close) if prev_close is not None else None


def get_vix():
    data = http_get(VIX_URL).json()
    result = data["chart"]["result"][0]
    vix = result["meta"].get("regularMarketPrice") or get_last_valid_close(result)
    if vix is None:
        raise ValueError("No se pudo obtener el VIX")
    last_close, prev_close = get_last_two_valid_closes(result)
    vix_ts = result["meta"].get("regularMarketTime")
    vix_time = datetime.fromtimestamp(vix_ts, tz=timezone.utc) if vix_ts is not None else datetime.now(timezone.utc)
    return float(vix), vix_time, float(prev_close) if prev_close is not None else None


def load_manual_macro():
    if not os.path.exists(MANUAL_MACRO_PATH):
        return {}
    with open(MANUAL_MACRO_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    keys = [
        "cape", "cape_date", "pmi", "pmi_date", "lei_value", "lei_date",
        "lei_value_3m_ago", "lei_trend_3m", "per_global", "per_global_date",
        "per_global_source", "current_weights", "scenario_override_enabled", "scenario_override_code",
    ]
    out = {}
    for k in keys:
        v = raw.get(k)
        if k in {"cape", "pmi", "lei_value", "lei_value_3m_ago", "lei_trend_3m", "per_global"} and v is not None:
            try:
                out[k] = float(v)
            except Exception:
                out[k] = None
        else:
            out[k] = v
    return out


def load_history():
    expected_columns = ["timestamp", "nav", "max52", "drop_pct", "scenario", "signal", "vix", "phase", "cape", "pmi", "lei", "score"]
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
    recent = history.loc[history["timestamp"].dt.date >= cutoff_date, "nav"].dropna().astype(float).tolist()
    recent.append(nav)
    return max(recent)


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
        "per_global_days": {"warn": 7, "block": 35, "label": "PER"},
    }
    for key, cfg in thresholds.items():
        value = (data_freshness or {}).get(key)
        if value is None:
            continue
        if value > cfg["block"]:
            reasons.append(f'{cfg["label"]} > {cfg["block"]} días')
        elif value > cfg["warn"]:
            warnings.append(f'{cfg["label"]} > {cfg["warn"]} días')
    return {"blocked": len(reasons) > 0, "reasons": reasons, "warnings": warnings}


def save_history_row(history, row):
    flat = {
        "timestamp": row.get("timestamp"), "nav": row.get("nav"), "max52": row.get("max52"), "drop_pct": row.get("drop_pct"),
        "scenario": row.get("scenario"), "signal": row.get("signal"), "vix": row.get("vix"), "phase": row.get("phase"),
        "cape": row.get("cape"), "pmi": row.get("pmi"), "lei": row.get("lei", {}).get("value") if isinstance(row.get("lei"), dict) else row.get("lei"),
        "score": row.get("score"),
    }
    new_row_df = pd.DataFrame([flat])
    df = pd.concat([history, new_row_df], ignore_index=True)
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    for col in ["nav", "max52", "drop_pct", "vix", "cape", "pmi", "lei", "score"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["timestamp"]).copy()
    df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"], keep="last")
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    df.to_csv(CSV_PATH, index=False)


def save_latest(payload):
    os.makedirs(os.path.dirname(LATEST_PATH), exist_ok=True)
    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def normalize_current_weights(raw_weights, previous_payload):
    if isinstance(raw_weights, dict) and raw_weights:
        normalized = {}
        legacy_groupama = raw_weights.get("groupama")
        for asset in TOTAL_TARGET_WEIGHTS:
            value = raw_weights.get(asset)
            if asset == "cash_real" and value is None:
                value = legacy_groupama
            normalized[asset] = float(value) if value is not None else TOTAL_TARGET_WEIGHTS[asset]
        return normalized

    previous_weights = build_current_weights_from_payload(previous_payload)
    normalized = {}
    for asset, default in TOTAL_TARGET_WEIGHTS.items():
        normalized[asset] = float(previous_weights.get(asset, default))
    return normalized


def main():
    history = load_history()
    previous = load_previous_latest()
    macro = load_manual_macro()
    nav_available = True
    vix_available = True

    try:
        nav, nav_time, prev_nav_close = get_nav()
    except Exception:
        nav = float(previous.get("nav"))
        nav_time = datetime.fromisoformat(previous.get("timestamp").replace("Z", "+00:00"))
        prev_nav_close = None
        nav_available = False

    try:
        vix, vix_time, prev_vix_close = get_vix()
    except Exception:
        prev_vix = previous.get("vix")
        vix = float(prev_vix) if prev_vix is not None else None
        vix_time = datetime.fromisoformat(previous.get("timestamp").replace("Z", "+00:00")) if vix is not None else None
        prev_vix_close = previous.get("previous_vix_close")
        vix_available = False

    max52 = compute_max52(history, nav, nav_time)
    drop_pct = 0.0 if max52 == 0 else (nav / max52) - 1
    nav_change_1d = ((nav / prev_nav_close) - 1) if prev_nav_close else None

    cape = macro.get("cape")
    pmi = macro.get("pmi")
    per_global = macro.get("per_global")
    lei_value = macro.get("lei_value")
    lei_date = macro.get("lei_date")
    lei_value_3m_ago = macro.get("lei_value_3m_ago")
    lei_trend_3m = macro.get("lei_trend_3m")

    valuation = compute_valuation(cape, per_global)
    valuation_adjustment = get_valuation_adjustment(valuation)
    scenario_info = resolve_scenario(cape, pmi, lei_trend_3m, drop_pct, vix, manual_macro=macro)
    scenario_code = scenario_info["scenario_code"]
    scenario_source = scenario_info["scenario_source"]
    scenario_override_active = scenario_info["scenario_override_active"]
    scenario_label = get_scenario_label(scenario_code)
    phase = get_phase(scenario_code, drop_pct)
    pause_mode = get_pause_mode(drop_pct, vix)
    score, score_components = compute_score(cape, pmi, lei_trend_3m, vix)
    new_money_plan = get_new_money_plan(scenario_code, valuation_adjustment)

    flash_crash = detect_flash_crash(drawdown=drop_pct, vix=vix, previous_vix=prev_vix_close, nav_change_1d=nav_change_1d)
    flash_crash = apply_flash_crash_window(flash_crash, now=nav_time, event_time=nav_time)

    rotation_plan = get_rotation_plan(scenario_code, drop_pct, vix, flash_crash=flash_crash, valuation_adjustment=valuation_adjustment)

    market_plus_20, market_low_reference, market_rebound = detect_market_plus_20_from_low(history, nav, nav_time)
    data_freshness = {
        "cape_days": days_old(nav_time, macro.get("cape_date")),
        "pmi_days": days_old(nav_time, macro.get("pmi_date")),
        "lei_days": days_old(nav_time, lei_date),
        "per_global_days": days_old(nav_time, macro.get("per_global_date")),
        "nav_days": 0,
        "vix_days": days_old(nav_time, iso_date(vix_time)) if vix_time else None,
        "status": "Datos frescos" if nav_available and vix_available else "Fallback sobre último latest.json",
    }
    decision_status = compute_decision_block(data_freshness, nav_available=nav is not None and nav_available, vix_available=vix_available)
    action = get_action_label(scenario_code, drop_pct, vix, pause_mode, decision_blocked=decision_status["blocked"], flash_crash=flash_crash)

    current_weights = normalize_current_weights(macro.get("current_weights"), previous)
    current_operable_weights = {asset: current_weights.get(asset) for asset in OPERABLE_TARGET_WEIGHTS}
    deviations_pp = compute_weight_deviations(current_operable_weights, OPERABLE_TARGET_WEIGHTS)
    permissions = compute_asset_permissions(
        current_weights=current_operable_weights,
        target_weights=OPERABLE_TARGET_WEIGHTS,
        rotation_active=rotation_plan["active"],
        trigger_active=rotation_plan["active"],
        pause_mode=pause_mode,
        flash_crash=flash_crash,
    )

    rotation_state_prev = previous.get("rotation_state", {}) if isinstance(previous, dict) else {}
    now_iso = nav_time.isoformat()
    payload = {
        "timestamp": now_iso,
        "updated_at": now_iso,
        "nav_date": iso_date(nav_time),
        "nav": round(nav, 4),
        "previous_nav_close": round(prev_nav_close, 4) if prev_nav_close is not None else None,
        "nav_change_1d": round(nav_change_1d, 6) if nav_change_1d is not None else None,
        "max52": round(max52, 4),
        "drop_pct": round(drop_pct, 6),
        "drop_percent_display": round(drop_pct * 100, 2),
        "scenario_code": scenario_code,
        "scenario": scenario_label,
        "scenario_source": scenario_source,
        "scenario_override_active": scenario_override_active,
        "scenario_mode": "manual" if scenario_override_active else "automatic",
        "signal": action,
        "vix": round(vix, 2) if vix is not None else None,
        "previous_vix_close": round(prev_vix_close, 2) if prev_vix_close is not None else None,
        "vix_date": iso_date(vix_time) if vix_time else None,
        "phase": phase,
        "entry_label": get_entry_label(drop_pct),
        "next_trigger": get_next_trigger(drop_pct),
        "score": score,
        "score_text": score_label(score),
        "cape": cape,
        "cape_date": macro.get("cape_date"),
        "pmi": pmi,
        "pmi_date": macro.get("pmi_date"),
        "per_global": per_global,
        "per_global_date": macro.get("per_global_date"),
        "lei": {"value": lei_value, "date": lei_date, "value_3m_ago": lei_value_3m_ago, "trend_3m": lei_trend_3m},
        "macro_signal": get_macro_signal(cape, pmi, lei_trend_3m, vix),
        "score_components": score_components,
        "valuation": {"cape_sp500": cape, "per_global": per_global, **valuation},
        "valuation_adjustment": valuation_adjustment,
        "allocations": get_allocations(scenario_code),
        "system_limits": SYSTEM_LIMITS,
        "composition_target": BASE_COMPOSITION,
        "current_weights": current_weights,
        "target_weights": TOTAL_TARGET_WEIGHTS,
        "operable_target_weights": OPERABLE_TARGET_WEIGHTS,
        "deviations_pp": deviations_pp,
        "priority_of_purchase": ["Core", "Calidad", "Emergentes", "Kopernik"],
        "new_money_rule": new_money_plan,
        "new_money_rules": {"state": valuation["composite_state"], "scenario_based": True, **new_money_plan},
        "rotation_plan": rotation_plan,
        "rotation_intensity": rotation_plan.get("intensity"),
        "flash_crash": flash_crash,
        "cash_policy": {"high_cape_target": "15–20%", "medium_cape_target": "12–15%", "low_cape_target": "10–12%"},
        "operational_mapping": {
            "liquidity_assets": ["DWS Euro Ultra Short", "Cash real"],
            "xray_cash_proxy": "Groupama Trésorerie",
            "rv_assets": ["Vanguard Global Stock", "Robeco BP Global Premium", "Heptagon Kopernik", "Robeco Emerging", "Plan Pensiones CaixaBank"],
            "operable_universe": OPERABLE_UNIVERSE,
            "non_operable_assets": ["Plan Pensiones CaixaBank", "Invesco Physical Gold"],
            "rotation_capital_sources": ROTATION_CAPITAL_SOURCES,
            "gold_asset": "Invesco Physical Gold",
        },
        "capital_layers": {"structural": "escenario", "tactical": "rotación", "flows": "dinero nuevo", "do_not_mix": True},
        "allowed_assets": permissions["allowed_assets"],
        "blocked_assets": permissions["blocked_assets"],
        "allowed_assets_dynamic": permissions["allowed_assets"],
        "blocked_assets_dynamic": permissions["blocked_assets"],
        "blocked_reasons_by_asset": permissions["blocked_reasons_by_asset"],
        "rebalance_rules": {
            "deviation_tolerance_pp": 4, "review_monthly": True, "review_structural_quarterly": True, "only_operable_assets": True,
            "tolerances": {"core": 5, "quality": 4, "dnca": 3, "jupiter": 2, "gold": 1},
        },
        "risk_reduction_rules": {
            "trigger_cape_gt": 42, "trigger_vix_lt": 15, "market_plus_20_from_low_required": True,
            "market_plus_20_from_low": market_plus_20, "market_low_reference": round(market_low_reference, 4) if market_low_reference is not None else None,
            "market_rebound_from_low": round(market_rebound, 6) if market_rebound is not None else None,
            "action": "Aumentar liquidez 5–10% y reducir RV progresivamente", "active_now": detect_risk_reduction(cape, vix, market_plus_20),
        },
        "hard_rules": HARD_RULES,
        "operational_checklist": ["¿Drawdown ≥ -10%?", "¿VIX > 30?", "¿Liquidez suficiente?", "¿Peso actual < peso objetivo?", "¿No es dinero nuevo?"],
        "pause_mode": pause_mode,
        "data_freshness": data_freshness,
        "decision_status": decision_status,
        "rotation_state": {
            "executed_levels": rotation_state_prev.get("executed_levels", []),
            "last_execution_date": rotation_state_prev.get("last_execution_date"),
            "last_execution_amount": rotation_state_prev.get("last_execution_amount", 0),
        },
        "sources": {
            "cape": "Manual · Multpl", "pmi": "Manual · Composite PMI", "lei": "Manual · Leading Index",
            "per_global": macro.get("per_global_source"), "nav": "Yahoo Finance", "vix": "Yahoo Finance",
        },
        "compatibility": {"legacy_frontend_supported": True, "app_should_prefer_backend_valuation": True},
    }
    save_history_row(history, payload)
    save_latest(payload)


if __name__ == "__main__":
    main()
