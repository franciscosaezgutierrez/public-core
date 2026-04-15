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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el && href) el.href = href;
}

function getNewMoneyRuleData(state) {
  switch (state) {
    case "MUY_CARO":
      return {
        rule: "50% invertir / 50% reservar",
        investPct: 0.50,
        reservePct: 0.50,
        note: "Mercado muy caro. Máxima prudencia."
      };
    case "CARO_MODERADO":
      return {
        rule: "60% invertir / 40% reservar",
        investPct: 0.60,
        reservePct: 0.40,
        note: "Mercado caro, pero no extremo globalmente."
      };
    case "NEUTRO":
      return {
        rule: "70% / 30%",
        investPct: 0.70,
        reservePct: 0.30,
        note: "Valoración razonable."
      };
    case "BARATO":
      return {
        rule: "90% / 10%",
        investPct: 0.90,
        reservePct: 0.10,
        note: "Valoración favorable."
      };
    default:
      return {
        rule: "50% / 50%",
        investPct: 0.50,
        reservePct: 0.50,
        note: "Sin clasificación. Se aplica prudencia."
      };
  }
}

function getScenarioData(auto, valuation, override) {
  if (override === "SC1") {
    return {
      scenario: "🟢 Escenario 1 · Expansión",
      phase: "Manual",
      pauseActive: false,
      pauseReason: "Override manual",
      action: "RIESGO ALTO",
      newMoneyState: "BARATO"
    };
  }

  if (override === "SC2") {
    return {
      scenario: "🟡 Escenario 2 · Desaceleración",
      phase: "Manual",
      pauseActive: false,
      pauseReason: "Override manual",
      action: "EQUILIBRIO",
      newMoneyState: "NEUTRO"
    };
  }

  if (override === "SC3") {
    return {
      scenario: "🟠 Escenario 3 · Sobrevaloración",
      phase: "Manual",
      pauseActive: true,
      pauseReason: "Override manual",
      action: "NO HACER NADA",
      newMoneyState: valuation.composite_state
    };
  }

  if (override === "SC4") {
    return {
      scenario: "🔴 Escenario 4 · Corrección",
      phase: "Manual",
      pauseActive: false,
      pauseReason: "Override manual",
      action: "ACTIVAR ROTACIÓN",
      newMoneyState: valuation.composite_state
    };
  }

  const dd = Number(auto.drop_percent_display);
  const vix = Number(auto.vix);

  let action = "NO HACER NADA";
  if (auto.pause_mode?.active) {
    action = "NO HACER NADA";
  } else if (dd <= -10 && vix > 20) {
    action = "ACTIVAR ROTACIÓN";
  } else if (dd <= -5) {
    action = "PREPARAR LIQUIDEZ";
  }

  return {
    scenario: auto.scenario || "—",
    phase: auto.phase || "—",
    pauseActive: !!auto.pause_mode?.active,
    pauseReason: auto.pause_mode?.reason || "—",
    action,
    newMoneyState: valuation.composite_state
  };
}

function renderNewMoneySimulator(ruleData) {
  const amount = Number(document.getElementById("new-money-input")?.value || 0);

  const investNow = amount * ruleData.investPct;
  const reserve = amount * ruleData.reservePct;
  const core = investNow * 0.70;
  const quality = investNow * 0.30;

  setText("sim-new-invest-now", formatEuro(investNow));
  setText("sim-new-reserve", formatEuro(reserve));
  setText("sim-new-core", formatEuro(core));
  setText("sim-new-quality", formatEuro(quality));
}

function renderRotationSimulator(dd, vix, override) {
  const amount = Number(document.getElementById("rotation-input")?.value || 0);

  let state = "Sin señal";
  let action = "No actuar";

  if (override === "SC4") {
    state = "Trigger activo (manual)";
    action = "Comprar";
  } else if (dd <= -10 && vix > 20) {
    state = "Trigger activo";
    action = "Comprar";
  } else if (dd <= -5) {
    state = "Pre-trigger";
    action = "Preparar liquidez";
  }

  let core = 0;
  let quality = 0;
  let emerging = 0;

  if (action === "Comprar") {
    core = amount * 0.50;
    quality = amount * 0.30;
    emerging = amount * 0.20;
  }

  setText("rotation-state", state);
  setText("rotation-action", action);
  setText("sim-rot-core", formatEuro(core));
  setText("sim-rot-quality", formatEuro(quality));
  setText("sim-rot-emerging", formatEuro(emerging));
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

  const valuation = computeValuation(Number(manual.cape), Number(manual.per_global));

  function renderAll() {
    const override = document.getElementById("scenario-select")?.value || "AUTO";
    const scenarioData = getScenarioData(
      { ...auto, drop_percent_display: dd },
      valuation,
      override
    );

    const newMoneyRule = getNewMoneyRuleData(scenarioData.newMoneyState);

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
    setText(
      "warnings-value",
      (auto.decision_status?.warnings || []).length
        ? auto.decision_status.warnings.join(" · ")
        : "Sin warnings"
    );
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

    setText("new-money-rule", newMoneyRule.rule);
    setText("new-money-note", newMoneyRule.note);

    renderNewMoneySimulator(newMoneyRule);
    renderRotationSimulator(dd, Number(auto.vix), override);
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
