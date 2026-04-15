async function loadManualMacro() {
  const res = await fetch("./data/manual_macro.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando manual_macro.json");
  return await res.json();
}

async function loadNavHistory() {
  const res = await fetch("./data/nav_history.csv", { cache: "no-store" });
  if (!res.ok) throw new Error("Error cargando nav_history.csv");
  return await res.text();
}

function parseCsv(text) {
  if (!text || !text.trim()) return [];
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cols[i] || "").trim();
    });
    return row;
  });
}

function getLastNavRow(rows) {
  if (!rows.length) return null;
  return rows[rows.length - 1];
}

function computeMax52FromHistory(rows) {
  const last52 = rows.slice(-365);
  const values = last52
    .map(r => Number(r.nav))
    .filter(v => !Number.isNaN(v));
  if (!values.length) return null;
  return Math.max(...values);
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
  if (dd > -3) return "MÁXIMOS PRÁCTICOS";
  if (dd > -7) return "CORRECCIÓN LEVE";
  if (dd > -10) return "PRE-TRIGGER";
  return "TRIGGER";
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

function formatDate(value) {
  return value || "—";
}

function formatEuro(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals).replace(".", ",");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderNewMoneySimulator(ruleData) {
  const input = document.getElementById("new-money-input");
  const amount = Number(input?.value || 0);

  const investNow = amount * ruleData.investPct;
  const reserve = amount * ruleData.reservePct;

  const core = investNow * 0.70;
  const quality = investNow * 0.30;

  setText("sim-new-invest-now", formatEuro(investNow));
  setText("sim-new-reserve", formatEuro(reserve));
  setText("sim-new-core", formatEuro(core));
  setText("sim-new-quality", formatEuro(quality));
  setText("sim-new-reserve-destination", "Liquidez");
}

function renderRotationSimulator(auto) {
  const input = document.getElementById("rotation-input");
  const amount = Number(input?.value || 0);
  const dd = Number(auto.drop_percent_display);
  const vix = Number(auto.vix);

  let state = "Sin señal";
  let action = "No actuar";

  if (dd <= -10 && vix > 20) {
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
  const [auto, manual, navHistoryText] = await Promise.all([
    fetch("./data/latest.json", { cache: "no-store" }).then(r => {
      if (!r.ok) throw new Error("Error cargando latest.json");
      return r.json();
    }),
    loadManualMacro(),
    loadNavHistory()
  ]);

  const navRows = parseCsv(navHistoryText);
  const lastNavRow = getLastNavRow(navRows);
  const navFromHistory = lastNavRow ? Number(lastNavRow.nav) : null;
  const max52FromHistory = computeMax52FromHistory(navRows);

  const navValue = navFromHistory ?? Number(auto.nav);
  const max52Value = max52FromHistory ?? Number(auto.max52);
  const dd = max52Value ? ((navValue / max52Value) - 1) * 100 : Number(auto.drop_percent_display);

  const valuation = computeValuation(manual.cape, manual.per_global);

  let action = "NO HACER NADA";
  if (auto.pause_mode?.active) {
    action = "NO HACER NADA";
  } else if (dd <= -10 && Number(auto.vix) > 20) {
    action = "ACTIVAR ROTACIÓN";
  } else if (dd <= -5) {
    action = "PREPARAR LIQUIDEZ";
  }

  const newMoneyRule = getNewMoneyRuleData(valuation.composite_state);

  setText("signal-current", `${auto.scenario} · ${auto.phase} · ${action}`);
  setText("signal-summary", auto.macro_signal || "—");

  setText("nav-value", formatNumber(navValue, 4));
  setText("max52-value", formatNumber(max52Value, 4));
  setText("drawdown-value", `${formatNumber(dd, 2)}% (${getDrawdownLabel(dd)})`);
  setText("vix-value", formatNumber(auto.vix, 2));
  setText("next-trigger-value", auto.next_trigger || "—");
  setText("freshness-value", auto.data_freshness || "—");

  setText("scenario-value", auto.scenario || "—");
  setText("phase-value", auto.phase || "—");
  setText("pause-value", auto.pause_mode?.active ? "Sí" : "No");
  setText("pause-reason-value", auto.pause_mode?.reason || "—");
  setText("macro-signal-value", auto.macro_signal || "—");

  setText("valuation-cape", `${formatNumber(valuation.cape_sp500, 2)} (${valuation.cape_state})`);
  setText("valuation-per", `${formatNumber(valuation.per_global, 2)} (${valuation.per_state})`);
  setText("valuation-state", valuation.composite_state);
  setText("valuation-source", "Vanguard (manual)");
  setText("valuation-date", formatDate(manual.per_global_date));

  setText("new-money-rule", newMoneyRule.rule);
  setText("new-money-destination", "Core + Calidad");
  setText("new-money-reserve-destination", "Liquidez");
  setText("new-money-note", newMoneyRule.note);

  setText("action-value", action);
  setText("blocked-value", auto.decision_status?.blocked ? "Sí" : "No");
  setText(
    "warnings-value",
    (auto.decision_status?.warnings || []).length
      ? auto.decision_status.warnings.join(" · ")
      : "Sin warnings"
  );
  setText("updated-at-value", auto.updated_at || auto.timestamp || "—");

  renderNewMoneySimulator(newMoneyRule);
  renderRotationSimulator({ ...auto, drop_percent_display: dd });

  document.getElementById("new-money-input")?.addEventListener("input", () => {
    renderNewMoneySimulator(newMoneyRule);
  });

  document.getElementById("rotation-input")?.addEventListener("input", () => {
    renderRotationSimulator({ ...auto, drop_percent_display: dd });
  });
}

loadDashboard().catch(err => {
  console.error(err);
  setText("signal-current", "Error cargando dashboard");
  setText("signal-summary", err.message);
});
