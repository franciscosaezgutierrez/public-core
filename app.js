function euro(value) {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value));
}

function num(value, digits = 2) {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number(value));
}

function pctFromDecimal(value) {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
    return "—";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES");
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES");
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
      row[h] = cols[i];
    });
    return row;
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value ?? "—";
  }
}

function signalClass(signal) {
  if (signal === "COMPRAR FUERTE") return "signal-comprar-fuerte";
  if (signal === "COMPRAR") return "signal-comprar";
  if (signal === "VIGILAR VIX") return "signal-vigilar";
  if (signal === "PREPARAR LIQUIDEZ") return "signal-preparar";
  if (signal === "DEFENSIVO") return "signal-esperar";
  return "signal-esperar";
}

function buildLevelLine(length, value) {
  return Array.from({ length }, () => value);
}

function pctTextToDecimal(text) {
  if (!text || typeof text !== "string") return null;

  const match = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;

  const numberText = match[1].replace(",", ".");
  const value = Number(numberText);
  if (isNaN(value)) return null;

  return value / 100;
}

function normalizeScenarioValue(value) {
  if (value === "1" || value === "2" || value === "3" || value === "defensivo" || value === "auto") {
    return value;
  }
  return "auto";
}

function buildNewMoneyPlan(latest, scenarioOverride = "auto") {
  const selectedScenario = normalizeScenarioValue(scenarioOverride);
  const phase = (latest.phase || "").toLowerCase();
  const entryLabel = latest.entry_label || "Sin trigger";
  const dropPct = Number(latest.drop_pct);
  const vix = Number(latest.vix);
  const realScenario = String(latest.scenario || "");
  const effectiveScenario = selectedScenario === "auto" ? realScenario : selectedScenario;

  if (
    selectedScenario === "auto" &&
    phase.includes("entradas") &&
    !isNaN(dropPct) &&
    !isNaN(vix) &&
    dropPct <= -0.10 &&
    vix > 20
  ) {
    let investNow = "25% del dinero nuevo";
    let reserve = "75% para siguientes tramos";
    let note = `Trigger activo: ${entryLabel}. Ejecutar solo un tramo.`;

    if (dropPct <= -0.15 && dropPct > -0.20) {
      investNow = "35% del dinero nuevo";
      reserve = "65% para siguientes tramos";
    } else if (dropPct <= -0.20 && dropPct > -0.25) {
      investNow = "50% del dinero nuevo";
      reserve = "50% para siguientes tramos";
    } else if (dropPct <= -0.25 && dropPct > -0.30) {
      investNow = "60% del dinero nuevo";
      reserve = "40% para siguientes tramos";
    } else if (dropPct <= -0.30) {
      investNow = "75% del dinero nuevo";
      reserve = "25% de colchón final";
    }

    return {
      mode: "TRAMO ACTIVO",
      scenarioAppliedText: `${realScenario} · Automático`,
      investNow,
      reserve,
      destination: "Vanguard + Robeco BP + Kopernik + Emergentes",
      reserveDestination: "DWS Euro Ultra Short",
      note,
      investNowPct: pctTextToDecimal(investNow) ?? 0,
      reservePct: pctTextToDecimal(reserve) ?? 1,

      investVanguardPct: 0.50,
      investRobecoBpPct: 0.20,
      investKopernikPct: 0.15,
      investEmergingPct: 0.15,
      investDncaPct: 0.00,

      reserveDncaPct: 0.00,
      reserveDwsPct: 1.00
    };
  }

  if (String(effectiveScenario).includes("1")) {
    return {
      mode: selectedScenario === "auto" ? "MERCADO BARATO" : "SIMULACIÓN",
      scenarioAppliedText: selectedScenario === "auto" ? "Escenario 1 · Automático" : "Escenario 1 · Manual",
      investNow: "90% del dinero nuevo",
      reserve: "10% en liquidez",
      destination: "Vanguard + Robeco BP + Kopernik + Emergentes",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Mercado favorable. Se permite ampliar satélites.",
      investNowPct: 0.90,
      reservePct: 0.10,

      investVanguardPct: 0.50,
      investRobecoBpPct: 0.20,
      investKopernikPct: 0.15,
      investEmergingPct: 0.15,
      investDncaPct: 0.00,

      reserveDncaPct: 0.00,
      reserveDwsPct: 1.00
    };
  }

  if (String(effectiveScenario).includes("2")) {
    return {
      mode: selectedScenario === "auto" ? "MERCADO NEUTRAL" : "SIMULACIÓN",
      scenarioAppliedText: selectedScenario === "auto" ? "Escenario 2 · Automático" : "Escenario 2 · Manual",
      investNow: "70% del dinero nuevo",
      reserve: "30% en liquidez",
      destination: "Vanguard + Robeco BP + algo de Kopernik/Emergentes",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Neutral. Satélites reducidos.",
      investNowPct: 0.70,
      reservePct: 0.30,

      investVanguardPct: 0.55,
      investRobecoBpPct: 0.25,
      investKopernikPct: 0.10,
      investEmergingPct: 0.10,
      investDncaPct: 0.00,

      reserveDncaPct: 0.00,
      reserveDwsPct: 1.00
    };
  }

  if (String(effectiveScenario).includes("3")) {
    return {
      mode: selectedScenario === "auto" ? "MERCADO CARO" : "SIMULACIÓN",
      scenarioAppliedText: selectedScenario === "auto" ? "Escenario 3 · Automático" : "Escenario 3 · Manual",
      investNow: "50% del dinero nuevo",
      reserve: "50% en liquidez",
      destination: "Vanguard + Robeco BP",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Mercado caro. No usar dinero nuevo en Kopernik ni Emergentes. DNCA solo por rebalanceo.",
      investNowPct: 0.50,
      reservePct: 0.50,

      investVanguardPct: 0.70,
      investRobecoBpPct: 0.30,
      investKopernikPct: 0.00,
      investEmergingPct: 0.00,
      investDncaPct: 0.00,

      reserveDncaPct: 0.00,
      reserveDwsPct: 1.00
    };
  }

  return {
    mode: selectedScenario === "auto" ? "MODO DEFENSIVO" : "SIMULACIÓN",
    scenarioAppliedText: selectedScenario === "auto" ? "Defensivo · Automático" : "Defensivo · Manual",
    investNow: "0% o mínimo táctico",
    reserve: "100% conservador",
    destination: "Sin riesgo adicional",
    reserveDestination: "DNCA + DWS Euro Ultra Short",
    note: "Modo defensivo. Sin satélites de riesgo.",
    investNowPct: 0.00,
    reservePct: 1.00,

    investVanguardPct: 0.00,
    investRobecoBpPct: 0.00,
    investKopernikPct: 0.00,
    investEmergingPct: 0.00,
    investDncaPct: 0.00,

    reserveDncaPct: 0.30,
    reserveDwsPct: 0.70
  };
}

function calculateNewMoneyBreakdown(amount, plan) {
  const total = Number(amount);

  if (isNaN(total) || total < 0) {
    return null;
  }

  const investNowAmount = total * plan.investNowPct;
  const reserveAmount = total * plan.reservePct;

  const vanguardAmount = investNowAmount * (plan.investVanguardPct || 0);
  const robecoBpAmount = investNowAmount * (plan.investRobecoBpPct || 0);
  const kopernikAmount = investNowAmount * (plan.investKopernikPct || 0);
  const emergingAmount = investNowAmount * (plan.investEmergingPct || 0);
  const dncaAmount =
    (investNowAmount * (plan.investDncaPct || 0)) +
    (reserveAmount * (plan.reserveDncaPct || 0));
  const dwsAmount = reserveAmount * (plan.reserveDwsPct || 0);

  return {
    total,
    investNowAmount,
    reserveAmount,
    vanguardAmount,
    robecoBpAmount,
    kopernikAmount,
    emergingAmount,
    dncaAmount,
    dwsAmount
  };
}

function renderSimulator(plan) {
  const input = document.getElementById("newMoneyAmountInput");
  if (!input) return;

  const amount = Number(input.value);
  const breakdown = calculateNewMoneyBreakdown(amount, plan);

  if (!breakdown) {
    setText("simInvestNowAmount", "—");
    setText("simReserveAmount", "—");
    setText("simVanguardAmount", "—");
    setText("simRobecoAmount", "—");
    setText("simKopernikAmount", "—");
    setText("simEmergingAmount", "—");
    setText("simDncaAmount", "—");
    setText("simDwsAmount", "—");
    return;
  }

  setText("simInvestNowAmount", euro(breakdown.investNowAmount));
  setText("simReserveAmount", euro(breakdown.reserveAmount));
  setText("simVanguardAmount", euro(breakdown.vanguardAmount));
  setText("simRobecoAmount", euro(breakdown.robecoBpAmount));
  setText("simKopernikAmount", euro(breakdown.kopernikAmount));
  setText("simEmergingAmount", euro(breakdown.emergingAmount));
  setText("simDncaAmount", euro(breakdown.dncaAmount));
  setText("simDwsAmount", euro(breakdown.dwsAmount));
}

function renderNewMoneySection(plan) {
  setText("newMoneyPill", plan.mode);
  setText("newMoneyScenarioApplied", plan.scenarioAppliedText);
  setText("newMoneyInvestNow", plan.investNow);
  setText("newMoneyReserve", plan.reserve);
  setText("newMoneyDestination", plan.destination);
  setText("newMoneyReserveDestination", plan.reserveDestination);
  setText("newMoneyNote", plan.note);
  renderSimulator(plan);
}

function setupScenarioSelector(latest) {
  const selector = document.getElementById("scenarioSelector");
  if (!selector) return;

  const updatePlan = () => {
    const plan = buildNewMoneyPlan(latest, selector.value);
    renderNewMoneySection(plan);
  };

  selector.addEventListener("change", updatePlan);
  updatePlan();
}

function setupSimulator(latest) {
  const input = document.getElementById("newMoneyAmountInput");
  const button = document.getElementById("newMoneyCalcButton");
  const selector = document.getElementById("scenarioSelector");

  if (!input || !button || !selector) return;

  const update = () => {
    const plan = buildNewMoneyPlan(latest, selector.value);
    renderSimulator(plan);
  };

  button.addEventListener("click", update);
  input.addEventListener("input", update);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Error cargando ${url}: ${response.status}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Error cargando ${url}: ${response.status}`);
  }
  return response.text();
}

async function loadDashboard() {
  const latest = await fetchJson("./data/latest.json");
  const historyText = await fetchText("./data/nav_history.csv");
  const history = parseCsv(historyText);

  setText("navValue", euro(latest.nav));
  setText("navDate", formatDate(latest.nav_date || latest.timestamp));
  setText("maxValue", euro(latest.max52));
  setText("dropValue", pctFromDecimal(latest.drop_pct));
  setText("vixValue", num(latest.vix, 2));

  setText("capeValue", num(latest.cape, 2));
  setText("pmiValue", num(latest.pmi, 2));
  setText("leiValue", num(latest.lei?.value, 4));

  const leiTrend = latest.lei?.trend_3m;
  if (leiTrend === null || leiTrend === undefined || isNaN(Number(leiTrend))) {
    setText("leiTrendText", "Sin tendencia");
  } else {
    const sign = Number(leiTrend) > 0 ? "+" : "";
    setText("leiTrendText", `3M: ${sign}${num(leiTrend, 4)}`);
  }

  setText("scoreValue", latest.score ?? "—");
  setText("scoreText", latest.score_text ?? "—");

  setText("scenarioValue", latest.scenario ?? "—");
  setText("phaseValue", latest.phase ?? "—");
  setText("entryValue", latest.entry_label ?? "—");
  setText("macroSignalValue", latest.macro_signal ?? "—");

  setText("scenarioText", latest.scenario ?? "—");
  setText("scenarioPill", latest.scenario ?? "—");
  setText("actionValue", latest.signal ?? "—");
  setText("nextTrigger", latest.next_trigger ?? "—");
  setText("updatedText", formatDateTime(latest.timestamp));

  setText("allocRv", latest.allocations?.rv ?? "—");
  setText("allocBonds", latest.allocations?.bonos ?? "—");
  setText("allocCash", latest.allocations?.liquidez ?? "—");
  setText("allocGold", latest.allocations?.oro ?? "—");

  setText("capeSource", latest.sources?.cape || "—");
  setText("pmiSource", latest.sources?.pmi || "—");
  setText("leiSource", latest.sources?.lei || "—");

  setupScenarioSelector(latest);
  setupSimulator(latest);

  const signalBadge = document.getElementById("signalBadge");
  if (signalBadge) {
    signalBadge.textContent = latest.signal ?? "—";
    signalBadge.className = signalClass(latest.signal ?? "");
  }

  const chartEl = document.getElementById("navChart");
  if (!chartEl || !history.length) return;

  const labels = history.map(r => formatDate(r.timestamp));
  const navValues = history.map(r => Number(r.nav));
  const maxValues = history.map(r => Number(r.max52));

  const referenceMax = Number(latest.max52);
  const level10 = buildLevelLine(labels.length, referenceMax * 0.90);
  const level15 = buildLevelLine(labels.length, referenceMax * 0.85);
  const level20 = buildLevelLine(labels.length, referenceMax * 0.80);
  const level25 = buildLevelLine(labels.length, referenceMax * 0.75);
  const level30 = buildLevelLine(labels.length, referenceMax * 0.70);

  new Chart(chartEl, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "NAV",
          data: navValues,
          borderWidth: 2.5,
          tension: 0.25
        },
        {
          label: "Máx. 52 semanas",
          data: maxValues,
          borderDash: [6, 6],
          borderWidth: 1.5,
          tension: 0
        },
        {
          label: "Nivel -10%",
          data: level10,
          borderDash: [4, 4],
          borderWidth: 1,
          tension: 0
        },
        {
          label: "Nivel -15%",
          data: level15,
          borderDash: [4, 4],
          borderWidth: 1,
          tension: 0
        },
        {
          label: "Nivel -20%",
          data: level20,
          borderDash: [4, 4],
          borderWidth: 1,
          tension: 0
        },
        {
          label: "Nivel -25%",
          data: level25,
          borderDash: [4, 4],
          borderWidth: 1,
          tension: 0
        },
        {
          label: "Nivel -30%",
          data: level30,
          borderDash: [4, 4],
          borderWidth: 1,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: "#dce6f8"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#8ea3c7"
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        },
        y: {
          ticks: {
            color: "#8ea3c7"
          },
          grid: {
            color: "rgba(255,255,255,0.06)"
          }
        }
      }
    }
  });
}

loadDashboard().catch(err => {
  const badge = document.getElementById("signalBadge");
  if (badge) {
    badge.textContent = "Error";
    badge.className = "signal-esperar";
  }

  const scenarioText = document.getElementById("scenarioText");
  if (scenarioText) {
    scenarioText.textContent = err.message;
  }
});
