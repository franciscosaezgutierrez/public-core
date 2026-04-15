async function loadManualMacro() {
  const res = await fetch("./data/manual_macro.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando manual_macro.json");
  return await res.json();
}

function computeValuation(cape, per) {
  const capeState = cape > 35 ? "CARO" : cape < 28 ? "BARATO" : "NEUTRO";
  const perState = per > 18 ? "CARO" : per < 15 ? "BARATO" : "NORMAL";

  let composite = "NEUTRO";
  if (capeState === "CARO" && perState === "CARO") composite = "MUY_CARO";
  else if (capeState === "CARO" && perState === "NORMAL") composite = "CARO_MODERADO";
  else if (capeState === "CARO" && perState === "BARATO") composite = "CARO_DUDOSO";
  else if (capeState === "BARATO" && perState === "BARATO") composite = "BARATO";

  return {
    cape_sp500: cape,
    per_global: per,
    cape_state: capeState,
    per_state: perState,
    composite_state: composite
  };
}

const SCENARIO_MAP = {
  SC1: {
    label: "🟢 Escenario 1 · Expansión",
    phase: "Manual",
    pauseActive: false,
    pauseReason: "Override manual",
    action: "RIESGO ALTO",
    newMoneyRule: {
      invest_pct: 0.85,
      reserve_pct: 0.15,
      rv_pct: 0.85,
      defensive_pct: 0,
      liquidity_pct: 0.15,
      rv_distribution: { core: 0.45, quality: 0.25, emerging: 0.15, kopernik: 0.15 },
      defensive_distribution: {}
    },
    rotationMatrix: { core: 0.60, quality: 0.30, emerging: 0.10, kopernik: 0 }
  },
  SC2: {
    label: "🟡 Escenario 2 · Desaceleración",
    phase: "Manual",
    pauseActive: false,
    pauseReason: "Override manual",
    action: "EQUILIBRIO",
    newMoneyRule: {
      invest_pct: 0.70,
      reserve_pct: 0.30,
      rv_pct: 0.70,
      defensive_pct: 0,
      liquidity_pct: 0.30,
      rv_distribution: { core: 0.50, quality: 0.30, emerging: 0.10, kopernik: 0.10 },
      defensive_distribution: { dnca: 0.60, jupiter: 0.40 }
    },
    rotationMatrix: { core: 0.55, quality: 0.30, emerging: 0.10, kopernik: 0.05 }
  },
  SC3: {
    label: "🟠 Escenario 3 · Sobrevaloración",
    phase: "Manual",
    pauseActive: true,
    pauseReason: "Override manual",
    action: "NO HACER NADA",
    newMoneyRule: {
      invest_pct: 0.60,
      reserve_pct: 0.40,
      rv_pct: 0.40,
      defensive_pct: 0.20,
      liquidity_pct: 0.40,
      rv_distribution: { core: 0.55, quality: 0.35, emerging: 0.07, kopernik: 0.03 },
      defensive_distribution: { dnca: 0.60, jupiter: 0.40 }
    },
    rotationMatrix: { core: 0.50, quality: 0.30, emerging: 0.15, kopernik: 0.05 }
  },
  SC4: {
    label: "🔴 Escenario 4 · Corrección",
    phase: "Manual",
    pauseActive: false,
    pauseReason: "Override manual",
    action: "ACTIVAR ROTACIÓN",
    newMoneyRule: {
      invest_pct: 0.90,
      reserve_pct: 0.10,
      rv_pct: 0.90,
      defensive_pct: 0,
      liquidity_pct: 0.10,
      rv_distribution: { core: 0.40, quality: 0.25, emerging: 0.20, kopernik: 0.15 },
      defensive_distribution: {}
    },
    rotationMatrix: { core: 0.40, quality: 0.25, emerging: 0.20, kopernik: 0.15 }
  }
};

function getDrawdownLabel(dd) {
  if (dd > -3) return "máximos prácticos";
  if (dd > -7) return "corrección leve";
  if (dd > -10) return "pre-trigger";
  return "trigger";
}

function formatDate(value) {
  return value || "—";
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals).replace(".", ",");
}

function formatEuro(value) {
  return `${formatNumber(value, 2)} €`;
}

function formatFreshness(value) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value.status || value.label || "—";
  return String(value);
}

function percentText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 100)}%`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el && href) el.href = href;
}

function getScenarioData(auto, override) {
  if (override !== "AUTO" && SCENARIO_MAP[override]) {
    return {
      scenario: SCENARIO_MAP[override].label,
      phase: SCENARIO_MAP[override].phase,
      pauseActive: SCENARIO_MAP[override].pauseActive,
      pauseReason: SCENARIO_MAP[override].pauseReason,
      action: SCENARIO_MAP[override].action,
      scenarioCode: override,
      newMoneyRule: SCENARIO_MAP[override].newMoneyRule,
      rotationMatrix: SCENARIO_MAP[override].rotationMatrix
    };
  }

  const dd = Number(auto.drop_percent_display);
  const vix = Number(auto.vix);
  let action = auto.signal || "NO HACER NADA";
  if (auto.pause_mode?.active) action = "NO HACER NADA";
  else if (dd <= -10 && vix > 20) action = "ACTIVAR ROTACIÓN";
  else if (dd <= -5) action = "PREPARAR LIQUIDEZ";

  return {
    scenario: auto.scenario || "—",
    phase: auto.phase || "—",
    pauseActive: !!auto.pause_mode?.active,
    pauseReason: auto.pause_mode?.reason || "—",
    action,
    scenarioCode: auto.scenario_code || "SC3",
    newMoneyRule: auto.new_money_rule || null,
    rotationMatrix: auto.rotation_plan?.matrix || null
  };
}

function renderNewMoneySimulator(ruleData) {
  const amount = Number(document.getElementById("new-money-input")?.value || 0);
  const investNow = amount * Number(ruleData?.invest_pct || 0);
  const reserve = amount * Number(ruleData?.reserve_pct || 0);
  const defensive = amount * Number(ruleData?.defensive_pct || 0);
  const rvTotal = amount * Number(ruleData?.rv_pct || 0);
  const rvDist = ruleData?.rv_distribution || {};
  const defDist = ruleData?.defensive_distribution || {};

  setText("sim-new-invest-now", formatEuro(investNow));
  setText("sim-new-reserve", formatEuro(reserve));
  setText("sim-new-rv-total", formatEuro(rvTotal));
  setText("sim-new-defensive-total", formatEuro(defensive));
  setText("sim-new-core", formatEuro(rvTotal * Number(rvDist.core || 0)));
  setText("sim-new-quality", formatEuro(rvTotal * Number(rvDist.quality || 0)));
  setText("sim-new-emerging", formatEuro(rvTotal * Number(rvDist.emerging || 0)));
  setText("sim-new-kopernik", formatEuro(rvTotal * Number(rvDist.kopernik || 0)));
  setText("sim-new-dnca", formatEuro(defensive * Number(defDist.dnca || 0)));
  setText("sim-new-jupiter", formatEuro(defensive * Number(defDist.jupiter || 0)));
}

function renderRotationSimulator(auto, scenarioCode, override) {
  const amount = Number(document.getElementById("rotation-input")?.value || 0);
  const dd = Number(auto.drop_percent_display);
  const vix = Number(auto.vix);

  let matrix = auto.rotation_plan?.matrix || SCENARIO_MAP[scenarioCode]?.rotationMatrix || null;
  if (override !== "AUTO" && SCENARIO_MAP[override]) {
    matrix = SCENARIO_MAP[override].rotationMatrix;
  }

  let state = "Sin señal";
  let action = "No actuar";

  if (override === "SC4") {
    state = "Trigger activo (manual)";
    action = "Comprar";
  } else if (auto.rotation_plan?.active) {
    state = "Trigger activo";
    action = "Comprar";
  } else if (dd <= -10 || vix > 30) {
    state = "Trigger técnico";
    action = "Comprar";
  } else if (dd <= -5) {
    state = "Pre-trigger";
    action = "Preparar liquidez";
  }

  setText("rotation-state", state);
  setText("rotation-action", action);
  setText("rotation-matrix", matrix ? Object.entries(matrix).map(([k,v]) => `${k} ${percentText(v)}`).join(" · ") : "—");

  const buy = action === "Comprar" && matrix ? matrix : {};
  setText("sim-rot-core", formatEuro(amount * Number(buy.core || 0)));
  setText("sim-rot-quality", formatEuro(amount * Number(buy.quality || 0)));
  setText("sim-rot-emerging", formatEuro(amount * Number(buy.emerging || 0)));
  setText("sim-rot-kopernik", formatEuro(amount * Number(buy.kopernik || 0)));
}

async function loadDashboard() {
  const [auto, manual] = await Promise.all([
    fetch("./data/latest.json", { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error("Error cargando latest.json");
      return r.json();
    }),
    loadManualMacro()
  ]);

  const navValue = Number(auto.nav);
  const max52Value = Number(auto.max52);
  const dd = Number(auto.drop_percent_display);
  const valuation = auto.valuation || computeValuation(Number(manual.cape), Number(manual.per_global));

  function renderAll() {
    const override = document.getElementById("scenario-select")?.value || "AUTO";
    const scenarioData = getScenarioData({ ...auto, drop_percent_display: dd }, override);
    const newMoneyRule = scenarioData.newMoneyRule || auto.new_money_rule || null;

    setText("signal-current", `${scenarioData.scenario} · ${scenarioData.phase} · ${scenarioData.action}`);
    setText("signal-summary", auto.macro_signal || "—");

    setText("nav-value", formatNumber(navValue, 2));
    setText("max52-value", formatNumber(max52Value, 2));
    setText("drawdown-value", `${formatNumber(dd, 2)}%`);
    setText("drawdown-label", getDrawdownLabel(dd));
    setText("vix-value", formatNumber(auto.vix, 2));
    setText("next-trigger-value", auto.next_trigger || "—");
    setText("freshness-value", formatFreshness(auto.data_freshness));

    setText("scenario-value", auto.scenario || "—");
    setText("scenario-override-status", override === "AUTO" ? "Desactivado" : override);
    setText("phase-value", scenarioData.phase);
    setText("action-value", scenarioData.action);
    setText("pause-value", scenarioData.pauseActive ? "Sí" : "No");
    setText("pause-reason-value", scenarioData.pauseReason);
    setText("blocked-value", auto.decision_status?.blocked ? "Sí" : "No");
    setText("warnings-value", (auto.decision_status?.warnings || []).length ? auto.decision_status.warnings.join(" · ") : "Sin warnings");
    setText("updated-at-value", auto.updated_at || auto.timestamp || "—");

    setText("macro-signal-value", auto.macro_signal || "—");
    setText("cape-value", formatNumber(manual.cape, 2));
    setText("cape-date-value", formatDate(manual.cape_date));
    setText("pmi-value", formatNumber(manual.pmi, 2));
    setText("pmi-date-value", formatDate(manual.pmi_date));
    setText("lei-value", formatNumber(manual.lei_value, 2));
    setText("lei-3m-ago-value", `3m: ${formatNumber(manual.lei_value_3m_ago, 2)}`);
    setText("lei-trend-value", `tendencia: ${formatNumber(manual.lei_trend_3m, 2)}`);
    setText("lei-date-value", formatDate(manual.lei_date));

    setText("valuation-cape", `${formatNumber(valuation.cape_sp500, 2)} (${valuation.cape_state})`);
    setText("valuation-per", `${formatNumber(valuation.per_global, 2)} (${valuation.per_state})`);
    setText("valuation-state", valuation.composite_state);
    setText("valuation-date", formatDate(manual.per_global_date));
    setHref("per-source-link", manual.per_global_source);

    setText("new-money-rule", newMoneyRule ? `${percentText(newMoneyRule.invest_pct)} invertir / ${percentText(newMoneyRule.reserve_pct)} reservar` : "—");
    setText("new-money-destinations", newMoneyRule ? `RV ${percentText(newMoneyRule.rv_pct)} · Defensivo ${percentText(newMoneyRule.defensive_pct)} · Liquidez ${percentText(newMoneyRule.liquidity_pct)}` : "—");
    setText("new-money-rv-mix", newMoneyRule?.rv_distribution ? Object.entries(newMoneyRule.rv_distribution).map(([k,v]) => `${k} ${percentText(v)}`).join(" · ") : "—");
    setText("new-money-defensive-mix", newMoneyRule?.defensive_distribution && Object.keys(newMoneyRule.defensive_distribution).length ? Object.entries(newMoneyRule.defensive_distribution).map(([k,v]) => `${k} ${percentText(v)}`).join(" · ") : "No aplica");
    setText("new-money-note", newMoneyRule?.note || "Regla calculada en backend.");

    setText("allowed-assets", (auto.allowed_assets || []).join(" · ") || "—");
    setText("blocked-assets", (auto.blocked_assets || []).join(" · ") || "—");
    setText("checklist-value", (auto.operational_checklist || []).join(" · ") || "—");
    setText("cash-policy-value", auto.cash_policy ? `${auto.cash_policy.high_cape_target} / ${auto.cash_policy.medium_cape_target} / ${auto.cash_policy.low_cape_target}` : "—");

    renderNewMoneySimulator(newMoneyRule || {});
    renderRotationSimulator(auto, scenarioData.scenarioCode, override);
  }

  renderAll();
  document.getElementById("new-money-input")?.addEventListener("input", renderAll);
  document.getElementById("rotation-input")?.addEventListener("input", renderAll);
  document.getElementById("scenario-select")?.addEventListener("change", renderAll);
}

loadDashboard().catch(err => {
  console.error(err);
  setText("signal-current", "Error cargando dashboard");
  setText("signal-summary", err.message);
});
