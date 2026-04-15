SYSTEM_LIMITS = {
    "rv_max": 0.70,
    "cash_min": 0.10,
    "cash_max": 0.25,
    "gold_max": 0.07,
    "bond_target": 0.15,
    "absolute_return_target": 0.08,
    "emerging_max": 0.08,
}

BASE_COMPOSITION = {
    "vanguard_global_stock": 0.29,
    "robeco_bp_global_premium": 0.16,
    "heptagon_kopernik": 0.065,
    "robeco_qi_emerging_conservative": 0.065,
    "plan_pensiones_caixabank": 0.025,
    "dnca_alpha_bonds": 0.15,
    "jupiter_global_equity_absolute_return": 0.08,
    "dws_euro_ultra_short": 0.09,
    "groupama_tresorerie": 0.08,
    "invesco_physical_gold": 0.04,
}

OPERABLE_UNIVERSE = {
    "core": "Vanguard Global Stock",
    "quality": "Robeco BP Global Premium",
    "emerging": "Robeco Emerging",
    "kopernik": "Heptagon Kopernik",
}

NON_OPERABLE_UNIVERSE = {
    "pensions": "Plan Pensiones CaixaBank",
    "gold": "Invesco Physical Gold",
}

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
]
