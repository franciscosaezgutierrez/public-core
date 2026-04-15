async function loadManualMacro() {
  const res = await fetch("./data/manual_macro.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando manual_macro.json");
  return await res.json();
}

function computeValuation(cape, per) {
  const capeState = cape > 35 ? "CARO" : cape < 28 ? "BARATO" : "NEUTRO";
  const perState  = per  > 18 ? "CARO" : per  < 15 ? "BARATO" : "NORMAL";

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
  if (dd > -3) return "MÁXIMOS PRÁCTICOS";
  if (dd > -7) return "CORRECCIÓN LEVE";
  if (dd > -10) return "PRE-TRIGGER";
  return "TRIGGER";
}

function getNewMoneyRule(state) {
  switch (state) {
    case "MUY_CARO": return "50% invertir / 50% reservar";
    case "CARO_MODERADO": return "60% invertir / 40% reservar";
    case "NEUTRO": return "70% / 30%";
    case "BARATO": return "90% / 10%";
    default: return "50% / 50%";
  }
}

function formatDate(value) {
  if (!value) return "—";
  return value;
}

async function loadDashboard() {
  const [auto, manual] = await Promise.all([
    fetch("./data/latest.json", { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error("Error cargando latest.json");
      return r.json();
    }),
    loadManualMacro()
  ]);

  const valuation = computeValuation(manual.cape, manual.per_global);
  const dd = Number(auto.drop_percent_display);

  let action = "NO HACER NADA";
  if (auto.pause_mode?.active) {
    action = "NO HACER NADA";
  } else if (dd <= -10 && Number(auto.vix) > 20) {
    action = "ACTIVAR ROTACIÓN";
  } else if (dd <= -5) {
    action = "PREPARAR LIQUIDEZ";
  }

  document.getElementById("signal-current").textContent =
    `${auto.scenario} · ${auto.phase} · ${action}`;

  document.getElementById("signal-summary").textContent =
    auto.macro_signal || "—";

  document.getElementById("drawdown-value").textContent =
    `${dd}% (${getDrawdownLabel(dd)})`;

  document.getElementById("vix-value").textContent =
    `${auto.vix}`;

  document.getElementById("next-trigger-value").textContent =
    auto.next_trigger || "—";

  document.getElementById("freshness-value").textContent =
    auto.data_freshness || "—";

  document.getElementById("scenario-value").textContent =
    auto.scenario || "—";

  document.getElementById("phase-value").textContent =
    auto.phase || "—";

  document.getElementById("pause-value").textContent =
    auto.pause_mode?.active ? "Sí" : "No";

  document.getElementById("pause-reason-value").textContent =
    auto.pause_mode?.reason || "—";

  document.getElementById("macro-signal-value").textContent =
    auto.macro_signal || "—";

  document.getElementById("valuation-cape").textContent =
    `${valuation.cape_sp500} (${valuation.cape_state})`;

  document.getElementById("valuation-per").textContent =
    `${valuation.per_global} (${valuation.per_state})`;

  document.getElementById("valuation-state").textContent =
    valuation.composite_state;

  document.getElementById("valuation-source").textContent =
    "Vanguard (manual)";

  document.getElementById("valuation-date").textContent =
    formatDate(manual.per_global_date);

  document.getElementById("new-money-rule").textContent =
    getNewMoneyRule(valuation.composite_state);

  document.getElementById("action-value").textContent =
    action;

  document.getElementById("blocked-value").textContent =
    auto.decision_status?.blocked ? "Sí" : "No";

  document.getElementById("warnings-value").textContent =
    (auto.decision_status?.warnings || []).length
      ? auto.decision_status.warnings.join(" · ")
      : "Sin warnings";

  document.getElementById("updated-at-value").textContent =
    auto.updated_at || auto.timestamp || "—";
}

loadDashboard().catch(err => {
  console.error(err);
  document.getElementById("signal-current").textContent = "Error cargando dashboard";
  document.getElementById("signal-summary").textContent = err.message;
});
