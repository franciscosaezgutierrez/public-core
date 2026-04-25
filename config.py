SYSTEM_LIMITS = {
    "rv_max": 0.70,
    "cash_min": 0.10,
    "cash_max": 0.25,
    "gold_max": 0.07,
    "bond_max": 0.15,
    "absolute_return_max": 0.08,
    "emerging_max": 0.08,
}

# ============================================================
# PESOS OBJETIVO — ÚNICO PUNTO DE EDICIÓN MANUAL
# ============================================================
# Edita aquí los pesos objetivo estructurales del sistema.
# El resto de variables de objetivo se derivan de este bloque.

TARGET_WEIGHTS = {
    "core": 0.30,
    "quality": 0.16,
    "emerging": 0.07,
    "kopernik": 0.07,
    "pensions": 0.025,
    "dnca": 0.12,
    "jupiter": 0.07,
    "dws": 0.15,
    "cash_real": 0.029,
    "gold": 0.025,
}

# Compatibilidad: el código existente usa TOTAL_TARGET_WEIGHTS.
TOTAL_TARGET_WEIGHTS = TARGET_WEIGHTS

OPERABLE_UNIVERSE = {
    "core": "Vanguard Global Stock",
    "quality": "Robeco BP Global Premium",
    "emerging": "Robeco Emerging",
    "kopernik": "Heptagon Kopernik",
}

OPERABLE_TARGET_WEIGHTS = {
    asset: TARGET_WEIGHTS[asset]
    for asset in OPERABLE_UNIVERSE
}

WEIGHT_SOURCE_KEYS = {
    "core": "vanguard_global_stock",
    "quality": "robeco_bp_global_premium",
    "emerging": "robeco_qi_emerging_conservative",
    "kopernik": "heptagon_kopernik",
    "pensions": "plan_pensiones_caixabank",
    "dnca": "dnca_alpha_bonds",
    "jupiter": "jupiter_global_equity_absolute_return",
    "dws": "dws_euro_ultra_short",
    "cash_real": "cash_real",
    "gold": "invesco_physical_gold",
}

BASE_COMPOSITION = {
    source_key: TARGET_WEIGHTS[asset]
    for asset, source_key in WEIGHT_SOURCE_KEYS.items()
}

NON_OPERABLE_UNIVERSE = {
    "pensions": "Plan Pensiones CaixaBank",
    "gold": "Invesco Physical Gold",
}

NON_ROTATION_ASSETS = ["gold", "pensions", "dnca", "jupiter"]
ROTATION_CAPITAL_SOURCES = ["dws", "cash_real", "dnca", "jupiter"]
TARGET_WEIGHT_TOLERANCE_PP = 0.0

DEFENSIVE_DISTRIBUTION = {
    "dnca": 0.60,
    "jupiter": 0.40,
}

SCENARIO_LABELS = {
    "SC1_EXPANSION": "🟢 Escenario 1 · Expansión",
    "SC2_DESACELERACION": "🟡 Escenario 2 · Desaceleración",
    "SC3_SOBREVALORACION": "🟠 Escenario 3 · Sobrevaloración",
    "SC4_CORRECCION": "🔴 Escenario 4 · Corrección",
}

SCENARIO_PHASES = {
    "SC1_EXPANSION": "Fase 0 · Normal",
    "SC2_DESACELERACION": "Fase 0 · Normal",
    "SC3_SOBREVALORACION": "Fase 0 · Normal",
    "SC4_CORRECCION": "Fase 2 · Entradas",
}

SCENARIO_ALLOCATIONS = {
    "SC1_EXPANSION": {"rv": "70–72%", "bonos": "8–10%", "liquidez": "~10%", "oro": "3–4%"},
    "SC2_DESACELERACION": {"rv": "65–67%", "bonos": "~13%", "liquidez": "~13%", "oro": "3–4%"},
    "SC3_SOBREVALORACION": {"rv": "60–62%", "bonos": "15%", "liquidez": "15–18%", "oro": "3–5%"},
    "SC4_CORRECCION": {"rv": "60–70%", "bonos": "0–10%", "liquidez": "10–25%", "oro": "4–7%"},
}

ROTATION_INTENSITY = {
    "SC1_EXPANSION": "baja",
    "SC2_DESACELERACION": "media",
    "SC3_SOBREVALORACION": "progresiva",
    "SC4_CORRECCION": "agresiva",
}

VALUATION_INTENSITY_ADJUSTMENTS = {
    "MUY_CARO": {"new_money_bias": "prudente", "rotation_bias": "reducida", "multiplier": 0.75},
    "CARO_MODERADO": {"new_money_bias": "moderado", "rotation_bias": "normal", "multiplier": 0.90},
    "CARO_DUDOSO": {"new_money_bias": "normal", "rotation_bias": "normal", "multiplier": 1.00},
    "NEUTRO": {"new_money_bias": "normal", "rotation_bias": "normal", "multiplier": 1.00},
    "BARATO": {"new_money_bias": "ofensivo", "rotation_bias": "ampliada", "multiplier": 1.10},
}

FLASH_CRASH_WAIT_HOURS = 48
FLASH_CRASH_ENTRY_MODE = "progresiva"
FLASH_CRASH_THRESHOLD_1D = -0.08
FLASH_CRASH_THRESHOLD_VIX_JUMP = 12.0

NEW_MONEY_MATRIX = {
    "SC1_EXPANSION": {
        "invest_pct": 0.85,
        "reserve_pct": 0.15,
        "rv_pct": 0.85,
        "defensive_pct": 0.00,
        "liquidity_pct": 0.15,
        "rv_distribution": {"core": 0.45, "quality": 0.25, "emerging": 0.15, "kopernik": 0.15},
        "defensive_distribution": None,
        "note": "Expansión: se prioriza riesgo.",
    },
    "SC2_DESACELERACION": {
        "invest_pct": 0.70,
        "reserve_pct": 0.30,
        "rv_pct": 0.70,
        "defensive_pct": 0.00,
        "liquidity_pct": 0.30,
        "rv_distribution": {"core": 0.50, "quality": 0.30, "emerging": 0.10, "kopernik": 0.10},
        "defensive_distribution": DEFENSIVE_DISTRIBUTION,
        "defensive_optional_max_of_invested": 0.15,
        "note": "Desaceleración: sesgo prudente, con defensivo opcional.",
    },
    "SC3_SOBREVALORACION": {
        "invest_pct": 0.60,
        "reserve_pct": 0.40,
        "rv_pct": 0.40,
        "defensive_pct": 0.20,
        "liquidity_pct": 0.40,
        "rv_distribution": {"core": 0.55, "quality": 0.35, "emerging": 0.07, "kopernik": 0.03},
        "defensive_distribution": DEFENSIVE_DISTRIBUTION,
        "note": "Sobrevaloración: parte de la inversión nueva puede ir a defensivos.",
    },
    "SC4_CORRECCION": {
        "invest_pct": 0.90,
        "reserve_pct": 0.10,
        "rv_pct": 0.90,
        "defensive_pct": 0.00,
        "liquidity_pct": 0.10,
        "rv_distribution": {"core": 0.40, "quality": 0.25, "emerging": 0.20, "kopernik": 0.15},
        "defensive_distribution": None,
        "note": "Corrección: ofensivo, sin compras defensivas.",
    },
}

ROTATION_MATRIX = {
    "SC1_EXPANSION": {"core": 0.60, "quality": 0.30, "emerging": 0.10},
    "SC2_DESACELERACION": {"core": 0.55, "quality": 0.30, "emerging": 0.10, "kopernik": 0.05},
    "SC3_SOBREVALORACION": {"core": 0.50, "quality": 0.30, "emerging": 0.15, "kopernik": 0.05},
    "SC4_CORRECCION": {"core": 0.40, "quality": 0.25, "emerging": 0.20, "kopernik": 0.15},
}

HARD_RULES = [
    "No comprar sin trigger",
    "No vender en caídas",
    "No usar oro para financiar compras",
    "No comprar DNCA ni Jupiter en caídas",
    "No usar Jupiter como liquidez estructural",
    "No mezclar dinero nuevo y rotación",
    "El plan de pensiones no participa en decisiones operativas",
    "Bloquear compra si el peso actual ya alcanza o supera el objetivo",
    "Sin NAV o sin VIX no se ejecuta el sistema",
]
