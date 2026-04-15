from config import NEW_MONEY_MATRIX, ROTATION_MATRIX, SCENARIO_LABELS, SCENARIO_PHASES, SCENARIO_ALLOCATIONS

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

def get_new_money_plan(scenario):
    return NEW_MONEY_MATRIX[scenario]

def get_rotation_plan(scenario, drawdown, vix):
    active = drawdown <= -0.10 or (vix is not None and vix > 30)
    return {"active": active, "matrix": ROTATION_MATRIX[scenario] if active else None}

def get_pause_mode(drawdown, vix):
    active = bool(drawdown > -0.10 and (vix is not None and vix < 20))
    return {"active": active, "reason": "Drawdown insuficiente y VIX por debajo de validación" if active else "Sin pausa", "rule": "No actuar si drawdown < -10% y VIX < 20"}

def get_action_label(scenario, drawdown, vix, pause_mode):
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
