from copy import deepcopy
from datetime import datetime, timedelta, timezone

from config import (
    FLASH_CRASH_ENTRY_MODE,
    FLASH_CRASH_THRESHOLD_1D,
    FLASH_CRASH_THRESHOLD_VIX_JUMP,
    FLASH_CRASH_WAIT_HOURS,
    NEW_MONEY_MATRIX,
    NON_ROTATION_ASSETS,
    OPERABLE_TARGET_WEIGHTS,
    ROTATION_INTENSITY,
    ROTATION_MATRIX,
    SCENARIO_ALLOCATIONS,
    SCENARIO_LABELS,
    SCENARIO_PHASES,
    TARGET_WEIGHT_TOLERANCE_PP,
    VALUATION_INTENSITY_ADJUSTMENTS,
    WEIGHT_SOURCE_KEYS,
)


def compute_valuation(cape, per_global):
    cape_state = "CARO" if cape is not None and cape > 35 else "BARATO" if cape is not None and cape < 28 else "NEUTRO"
    per_state = "CARO" if per_global is not None and per_global > 18 else "BARATO" if per_global is not None and per_global < 15 else "NORMAL"
    if cape_state == "CARO" and per_state == "CARO":
        composite = "MUY_CARO"
    elif cape_state == "CARO" and per_state == "NORMAL":
        composite = "CARO_MODERADO"
    elif cape_state == "CARO" and per_state == "BARATO":
        composite = "CARO_DUDOSO"
    elif cape_state == "BARATO" and per_state == "BARATO":
        composite = "BARATO"
    else:
        composite = "NEUTRO"
    return {"cape_state": cape_state, "per_state": per_state, "composite_state": composite}


def classify_scenario(cape, pmi, lei_trend_3m, drawdown, vix):
    if drawdown <= -0.10 or (vix is not None and vix > 30):
        return "SC4_CORRECCION"
    if cape is not None and cape < 28 and pmi is not None and pmi > 52 and lei_trend_3m is not None and lei_trend_3m >= 0:
        return "SC1_EXPANSION"
    if cape is not None and 28 <= cape <= 35 and lei_trend_3m is not None and lei_trend_3m < 0:
        return "SC2_DESACELERACION"
    return "SC3_SOBREVALORACION"


def resolve_scenario(cape, pmi, lei_trend_3m, drawdown, vix, manual_macro=None):
    manual_macro = manual_macro or {}
    override_enabled = bool(manual_macro.get("scenario_override_enabled"))
    override_code = manual_macro.get("scenario_override_code")
    valid_codes = set(SCENARIO_LABELS.keys())

    if override_enabled and override_code in valid_codes:
        return {
            "scenario_code": override_code,
            "scenario_source": "manual_override",
            "scenario_override_active": True,
        }

    return {
        "scenario_code": classify_scenario(cape, pmi, lei_trend_3m, drawdown, vix),
        "scenario_source": "automatic",
        "scenario_override_active": False,
    }


def get_phase(scenario, drawdown):
    if scenario == "SC4_CORRECCION":
        return "Fase 2 · Entradas"
    if drawdown <= -0.05:
        return "Fase 1 · Preparación"
    return SCENARIO_PHASES[scenario]


def get_entry_label(drawdown):
    if drawdown <= -0.30:
        return "Entrada máxima · 15%"
    if drawdown <= -0.25:
        return "Entrada muy fuerte · 25%"
    if drawdown <= -0.20:
        return "Entrada fuerte · 30%"
    if drawdown <= -0.15:
        return "Segunda entrada · 20%"
    if drawdown <= -0.10:
        return "Entrada inicial · 10%"
    if drawdown <= -0.05:
        return "Preparación"
    return "Sin entrada"


def get_next_trigger(drawdown):
    if drawdown > -0.05:
        return "-5%"
    if drawdown > -0.10:
        return "-10%"
    if drawdown > -0.15:
        return "-15%"
    if drawdown > -0.20:
        return "-20%"
    if drawdown > -0.25:
        return "-25%"
    if drawdown > -0.30:
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
    flags.append("CAPE alto" if cape is not None and cape > 35 else "CAPE OK" if cape is not None else "CAPE n/d")
    flags.append("PMI débil" if pmi is not None and pmi < 50 else "PMI OK" if pmi is not None else "PMI n/d")
    flags.append("LEI negativo" if lei_trend_3m is not None and lei_trend_3m < 0 else "LEI OK" if lei_trend_3m is not None else "LEI n/d")
    flags.append("VIX alto" if vix is not None and vix > 25 else "VIX normal" if vix is not None else "VIX n/d")
    return " · ".join(flags)


def get_valuation_adjustment(valuation):
    composite = (valuation or {}).get("composite_state", "NEUTRO")
    base = VALUATION_INTENSITY_ADJUSTMENTS.get(composite, VALUATION_INTENSITY_ADJUSTMENTS["NEUTRO"])
    return {"valuation_state": composite, **base}



def get_new_money_plan(scenario, valuation_adjustment=None):
    base = deepcopy(NEW_MONEY_MATRIX[scenario])
    if valuation_adjustment:
        base["valuation_adjustment"] = valuation_adjustment
    return base



def get_rotation_intensity(scenario, valuation_adjustment=None):
    payload = {"base": ROTATION_INTENSITY[scenario]}
    if valuation_adjustment:
        payload["valuation_state"] = valuation_adjustment.get("valuation_state")
        payload["bias"] = valuation_adjustment.get("rotation_bias")
        payload["multiplier"] = valuation_adjustment.get("multiplier")
    return payload



def detect_flash_crash(drawdown, vix, previous_vix=None, nav_change_1d=None):
    vix_jump = None
    if vix is not None and previous_vix is not None:
        vix_jump = vix - previous_vix
    active = bool(
        (nav_change_1d is not None and nav_change_1d <= FLASH_CRASH_THRESHOLD_1D)
        or (vix_jump is not None and vix_jump >= FLASH_CRASH_THRESHOLD_VIX_JUMP)
        or drawdown <= -0.20
    )
    return {
        "active": active,
        "reason": "Shock de mercado detectado" if active else "Sin flash crash",
        "nav_change_1d": nav_change_1d,
        "vix_jump": vix_jump,
        "wait_hours": FLASH_CRASH_WAIT_HOURS,
        "entry_mode": FLASH_CRASH_ENTRY_MODE,
    }



def apply_flash_crash_window(flash_crash, now, event_time=None):
    if not flash_crash.get("active"):
        return {**flash_crash, "blocking_window_active": False, "wait_until": None}
    reference = event_time or now
    wait_until = reference + timedelta(hours=FLASH_CRASH_WAIT_HOURS)
    return {
        **flash_crash,
        "blocking_window_active": now < wait_until,
        "wait_until": wait_until.astimezone(timezone.utc).isoformat(),
    }



def get_rotation_plan(scenario, drawdown, vix, flash_crash=None, valuation_adjustment=None):
    active = drawdown <= -0.10 or (vix is not None and vix > 30)
    blocked_by_flash_crash = bool(flash_crash and flash_crash.get("blocking_window_active"))
    matrix = ROTATION_MATRIX[scenario] if active and not blocked_by_flash_crash else None
    return {
        "active": active,
        "matrix": matrix,
        "blocked_by_flash_crash": blocked_by_flash_crash,
        "intensity": get_rotation_intensity(scenario, valuation_adjustment),
    }



def get_pause_mode(drawdown, vix):
    active = bool(drawdown > -0.10 and (vix is not None and vix < 20))
    return {"active": active, "reason": "Drawdown insuficiente y VIX por debajo de validación" if active else "Sin pausa", "rule": "No actuar si drawdown < -10% y VIX < 20"}



def get_action_label(scenario, drawdown, vix, pause_mode, decision_blocked=False, flash_crash=None):
    if decision_blocked:
        return "SISTEMA BLOQUEADO"
    if flash_crash and flash_crash.get("blocking_window_active"):
        return "ESPERAR 48H"
    if pause_mode["active"]:
        return "NO HACER NADA"
    if scenario == "SC4_CORRECCION":
        return "ACTIVAR ROTACIÓN"
    if drawdown <= -0.05:
        return "PREPARAR LIQUIDEZ"
    if scenario == "SC3_SOBREVALORACION":
        return "DEFENSIVO"
    return "ESPERAR"



def get_scenario_label(code):
    return SCENARIO_LABELS[code]



def get_allocations(code):
    return SCENARIO_ALLOCATIONS[code]



def build_current_weights_from_payload(previous_payload):
    current = {}
    composition = (previous_payload or {}).get("current_weights") or {}
    if composition:
        return composition
    for asset, source_key in WEIGHT_SOURCE_KEYS.items():
        value = (previous_payload or {}).get("composition_target", {}).get(source_key)
        current[asset] = value
    for asset, value in list(current.items()):
        if value is None:
            current[asset] = OPERABLE_TARGET_WEIGHTS.get(asset)
    return current



def compute_asset_permissions(current_weights, target_weights=None, rotation_active=False, trigger_active=False, pause_mode=None, flash_crash=None):
    target_weights = target_weights or OPERABLE_TARGET_WEIGHTS
    pause_active = bool((pause_mode or {}).get("active"))
    flash_crash_block = bool((flash_crash or {}).get("blocking_window_active"))
    allowed_assets = []
    blocked_assets = []
    blocked_reasons = {}

    for asset, target in target_weights.items():
        current = (current_weights or {}).get(asset)
        reasons = []
        if pause_active:
            reasons.append("modo pausa activo")
        if flash_crash_block:
            reasons.append("espera de 48h por flash crash")
        if rotation_active and asset in NON_ROTATION_ASSETS:
            reasons.append("activo excluido de la rotación")
        if trigger_active and current is not None and current >= target + TARGET_WEIGHT_TOLERANCE_PP:
            reasons.append("peso actual igual o superior al objetivo")
        if not trigger_active and rotation_active:
            reasons.append("sin trigger operativo")

        if reasons:
            blocked_assets.append(asset)
            blocked_reasons[asset] = reasons
        else:
            allowed_assets.append(asset)

    for asset, reason in {
        "gold": "oro no participa en rotación ni financia compras",
        "pensions": "plan de pensiones no participa en decisiones operativas",
        "dnca": "DNCA no se compra en caídas",
        "jupiter": "Jupiter no se compra en caídas",
    }.items():
        blocked_assets.append(asset)
        blocked_reasons.setdefault(asset, []).append(reason)

    return {
        "allowed_assets": allowed_assets,
        "blocked_assets": blocked_assets,
        "blocked_reasons_by_asset": blocked_reasons,
    }



def compute_weight_deviations(current_weights, target_weights=None):
    target_weights = target_weights or OPERABLE_TARGET_WEIGHTS
    deviations = {}
    for asset, target in target_weights.items():
        current = (current_weights or {}).get(asset)
        deviations[asset] = None if current is None else round(current - target, 6)
    return deviations
