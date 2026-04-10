function daysBetween(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function freshnessLabel(days) {
  if (days === null || days === undefined || isNaN(Number(days))) return "—";
  if (Number(days) <= 10) return "VERDE";
  if (Number(days) <= 30) return "AMARILLO";
  return "ROJO";
}

function freshnessText(days) {
  const label = freshnessLabel(days);
  return label === "—" ? "—" : `${label} · ${days} días`;
}

function getFreshnessClass(label) {
  if (label === "VERDE") return "status-ok";
  if (label === "AMARILLO") return "status-warn";
  if (label === "ROJO") return "status-bad";
  return "";
}

function getTriggerLevel(drawdown) {
  if (drawdown <= -0.30) return -0.30;
  if (drawdown <= -0.25) return -0.25;
  if (drawdown <= -0.20) return -0.20;
  if (drawdown <= -0.15) return -0.15;
  if (drawdown <= -0.10) return -0.10;
  return null;
}

function formatTriggerLevel(level) {
  if (level === null || level === undefined || isNaN(Number(level))) return "Sin trigger";
  return pctFromDecimal(Number(level));
}

function isLevelExecuted(rotationState, level) {
  if (!rotationState || !Array.isArray(rotationState.executed_levels) || level === null) return false;
  return rotationState.executed_levels.some(v => Number(v) === Number(level));
}

function deriveDataFreshness(latest) {
  const explicit = latest.data_freshness || {};
  return {
    cape_days: explicit.cape_days ?? daysBetween(latest.cape_date),
    pmi_days: explicit.pmi_days ?? daysBetween(latest.pmi_date),
    lei_days: explicit.lei_days ?? daysBetween(latest.lei?.date),
    nav_days: explicit.nav_days ?? daysBetween(latest.nav_date),
    vix_days: explicit.vix_days ?? daysBetween(latest.nav_date)
  };
}

function buildScenarioExplanation(latest) {
  const cape = Number(latest.cape);
  const pmi = Number(latest.pmi);
  const leiTrend = Number(latest.lei?.trend_3m);
  const drop = Number(latest.drop_pct);
  const vix = Number(latest.vix);

  return {
    cape: `CAPE ${num(cape, 2)} · ${cape > 35 ? 'Sobrevaloración' : 'No extrema'}`,
    pmi: `PMI ${num(pmi, 1)} · ${pmi > 52 ? 'Expansión' : pmi < 50 ? 'Contracción' : 'Zona neutra'}`,
    lei: `LEI 3M ${num(leiTrend, 1)} · ${leiTrend < 0 ? 'Negativo' : 'No negativo'}`,
    drop: `Drawdown ${pctFromDecimal(drop)} · ${drop <= -0.10 ? 'Corrección activa' : 'Sin corrección'}`,
    vix: `VIX ${num(vix, 2)} · ${vix > 30 ? 'Estrés fuerte' : vix > 20 ? 'Estrés moderado' : 'Normal'}`
  };
}

function validateSystemLimits(latest) {
  const limits = latest.system_limits || {};
  const ranges = latest.allocation_ranges || {};
  const issues = [];

  const rv = ranges.rv_target ?? null;
  const cash = ranges.cash_target ?? null;
  const gold = ranges.gold_target ?? null;
  const emerging = ranges.emerging_target ?? null;
  const kopernik = ranges.kopernik_target ?? null;
  const dnca = ranges.dnca_target ?? null;
  const jupiter = ranges.jupiter_target ?? null;

  if (rv !== null && limits.rv_max !== undefined && rv > limits.rv_max) issues.push(`RV ${pctFromDecimal(rv)} > máximo ${pctFromDecimal(limits.rv_max)}`);
  if (cash !== null && limits.cash_min !== undefined && cash < limits.cash_min) issues.push(`Liquidez ${pctFromDecimal(cash)} < mínimo ${pctFromDecimal(limits.cash_min)}`);
  if (cash !== null && limits.cash_max !== undefined && cash > limits.cash_max) issues.push(`Liquidez ${pctFromDecimal(cash)} > máximo táctico ${pctFromDecimal(limits.cash_max)}`);
  if (gold !== null && limits.gold_max !== undefined && gold > limits.gold_max) issues.push(`Oro ${pctFromDecimal(gold)} > máximo ${pctFromDecimal(limits.gold_max)}`);
  if (emerging !== null && limits.emerging_max !== undefined && emerging > limits.emerging_max) issues.push(`Emergentes ${pctFromDecimal(emerging)} > máximo ${pctFromDecimal(limits.emerging_max)}`);

  [["Kopernik", kopernik], ["DNCA", dnca], ["Jupiter", jupiter]].forEach(([name, value]) => {
    if (value !== null && value !== undefined && limits.concentrated_max !== undefined && value > limits.concentrated_max) {
      issues.push(`${name} ${pctFromDecimal(value)} > máximo concentrado ${pctFromDecimal(limits.concentrated_max)}`);
    }
  });

  return { valid: issues.length === 0, issues };
}

function renderExtraSections(latest) {
  const explanation = buildScenarioExplanation(latest);
  setText("whyCape", explanation.cape);
  setText("whyPmi", explanation.pmi);
  setText("whyLei", explanation.lei);
  setText("whyDrop", explanation.drop);
  setText("whyVix", explanation.vix);

  const fresh = deriveDataFreshness(latest);
  const freshPairs = [["freshCape", fresh.cape_days], ["freshPmi", fresh.pmi_days], ["freshLei", fresh.lei_days], ["freshNav", fresh.nav_days], ["freshVix", fresh.vix_days]];
  freshPairs.forEach(([id, days]) => setText(id, freshnessText(days)));
  const labels = freshPairs.map(([, days]) => freshnessLabel(days)).filter(v => v !== "—");
  const overall = labels.includes("ROJO") ? "ROJO" : labels.includes("AMARILLO") ? "AMARILLO" : labels.includes("VERDE") ? "VERDE" : "—";
  setText("freshnessPill", overall);
  freshPairs.forEach(([id, days]) => {
    const el = document.getElementById(id);
    if (el) el.classList.add(getFreshnessClass(freshnessLabel(days)));
  });
  const fp = document.getElementById("freshnessPill");
  if (fp) fp.classList.add(getFreshnessClass(overall));

  const validation = validateSystemLimits(latest);
  setText("limitsStatus", validation.valid ? "Cumple" : "No cumple");
  setText("limitsIssues", validation.valid ? "Sin incidencias" : validation.issues.join(" · "));
  setText("limitsPill", validation.valid ? "OK" : "REVISAR");
  const ls = document.getElementById("limitsStatus");
  if (ls) ls.classList.add(validation.valid ? "status-ok" : "status-bad");
  const lp = document.getElementById("limitsPill");
  if (lp) lp.classList.add(validation.valid ? "status-ok" : "status-bad");

  const rotationState = latest.rotation_state || {};
  const activeLevel = getTriggerLevel(Number(latest.drop_pct));
  setText("rotationActiveLevel", formatTriggerLevel(activeLevel));
  setText("rotationExecutedLevels", Array.isArray(rotationState.executed_levels) && rotationState.executed_levels.length ? rotationState.executed_levels.map(formatTriggerLevel).join(" · ") : "Ninguno");
  let lastExec = "Sin ejecuciones";
  if (rotationState.last_execution_date) {
    const parts = [formatDate(rotationState.last_execution_date)];
    if (rotationState.last_execution_amount) parts.push(euro(rotationState.last_execution_amount));
    lastExec = parts.join(" · ");
  }
  setText("rotationLastExecution", lastExec);
  setText("rotationStatePill", activeLevel !== null ? "TRIGGER" : "EN ESPERA");
}

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
      destination: "Vanguard + Robeco BP + Jupiter + Kopernik + Emergentes",
      reserveDestination: "DWS Euro Ultra Short",
      note,
      investNowPct: pctTextToDecimal(investNow) ?? 0,
      reservePct: pctTextToDecimal(reserve) ?? 1,

      investVanguardPct: 0.45,
      investRobecoBpPct: 0.20,
      investJupiterPct: 0.15,
      investKopernikPct: 0.10,
      investEmergingPct: 0.10,
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
      destination: "Vanguard + Robeco BP + Jupiter + Kopernik + Emergentes",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Mercado favorable. Se permite ampliar satélites.",
      investNowPct: 0.90,
      reservePct: 0.10,

      investVanguardPct: 0.40,
      investRobecoBpPct: 0.20,
      investJupiterPct: 0.20,
      investKopernikPct: 0.10,
      investEmergingPct: 0.10,
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
      destination: "Vanguard + Robeco BP + Jupiter + algo de Kopernik/Emergentes",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Neutral. Satélites reducidos.",
      investNowPct: 0.70,
      reservePct: 0.30,

      investVanguardPct: 0.45,
      investRobecoBpPct: 0.25,
      investJupiterPct: 0.15,
      investKopernikPct: 0.05,
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
      destination: "Vanguard + Robeco BP + Jupiter",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Mercado caro. No usar dinero nuevo en Kopernik ni Emergentes. DNCA solo por rebalanceo.",
      investNowPct: 0.50,
      reservePct: 0.50,

      investVanguardPct: 0.55,
      investRobecoBpPct: 0.25,
      investJupiterPct: 0.20,
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
    investJupiterPct: 0.00,
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
  const jupiterAmount = investNowAmount * (plan.investJupiterPct || 0);
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
    jupiterAmount,
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
    setText("simJupiterAmount", "—");
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
  setText("simJupiterAmount", euro(breakdown.jupiterAmount));
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

function normalizeDrawdownValue(value, fallbackDropPct) {
  if (value === "auto") {
    return Number(fallbackDropPct);
  }

  const parsed = Number(value);
  if (isNaN(parsed)) {
    return Number(fallbackDropPct);
  }

  return parsed;
}

function resolveVixConfirmation(selectionValue, latestVix) {
  if (selectionValue === "yes") return true;
  if (selectionValue === "no") return false;
  return Number(latestVix) > 20;
}

function getRotationPlanByDrawdown(drawdown, vixConfirmed) {
  if (!vixConfirmed) {
    return {
      enabled: false,
      label: "Sin activación",
      rotatePct: 0,
      vanguardPct: 0,
      robecoBpPct: 0,
      jupiterPct: 0,
      kopernikPct: 0,
      emergingPct: 0,
      note: "Sin validación VIX. No ejecutar rotación."
    };
  }

  if (drawdown <= -0.30) {
    return {
      enabled: true,
      label: "Entrada máxima",
      rotatePct: 0.15,
      vanguardPct: 0.35,
      robecoBpPct: 0.20,
      jupiterPct: 0.15,
      kopernikPct: 0.15,
      emergingPct: 0.15,
      note: "Último tramo. Mayor peso en satélites."
    };
  }

  if (drawdown <= -0.25) {
    return {
      enabled: true,
      label: "Entrada muy fuerte",
      rotatePct: 0.25,
      vanguardPct: 0.40,
      robecoBpPct: 0.20,
      jupiterPct: 0.15,
      kopernikPct: 0.15,
      emergingPct: 0.10,
      note: "Tramo agresivo. Se abre más peso en Kopernik."
    };
  }

  if (drawdown <= -0.20) {
    return {
      enabled: true,
      label: "Entrada fuerte",
      rotatePct: 0.30,
      vanguardPct: 0.45,
      robecoBpPct: 0.20,
      jupiterPct: 0.15,
      kopernikPct: 0.10,
      emergingPct: 0.10,
      note: "Tramo principal. Ampliar core y satélites."
    };
  }

  if (drawdown <= -0.15) {
    return {
      enabled: true,
      label: "Segunda entrada",
      rotatePct: 0.20,
      vanguardPct: 0.50,
      robecoBpPct: 0.20,
      jupiterPct: 0.15,
      kopernikPct: 0.05,
      emergingPct: 0.10,
      note: "Entrada intermedia. Vanguard sigue siendo prioritario."
    };
  }

  if (drawdown <= -0.10) {
    return {
      enabled: true,
      label: "Entrada inicial",
      rotatePct: 0.10,
      vanguardPct: 0.60,
      robecoBpPct: 0.30,
      jupiterPct: 0.10,
      kopernikPct: 0.00,
      emergingPct: 0.00,
      note: "Primer tramo. Jupiter entra como tercer pilar."
    };
  }

  return {
    enabled: false,
    label: "Sin trigger",
    rotatePct: 0,
    vanguardPct: 0,
    robecoBpPct: 0,
    jupiterPct: 0,
    kopernikPct: 0,
    emergingPct: 0,
    note: "No hay caída suficiente para activar rotación."
  };
}

function getRotationTrafficLight(drawdown, vixConfirmed) {
  if (drawdown <= -0.10 && vixConfirmed) {
    return {
      light: "VERDE",
      status: "Ejecutar rotación"
    };
  }

  if (drawdown <= -0.10 && !vixConfirmed) {
    return {
      light: "AMARILLO",
      status: "Vigilar. Falta confirmación VIX"
    };
  }

  return {
    light: "ROJO",
    status: "No hacer nada"
  };
}

function calculateRotationBreakdown(dwsAmount, dncaAmount, drawdown, vixConfirmed, alreadyExecutedAmount = 0, minCashReserve = 0, rotationState = null) {
  const dws = Number(dwsAmount);
  const dnca = Number(dncaAmount);
  const alreadyExecuted = Number(alreadyExecutedAmount);
  const minCash = Number(minCashReserve);

  if (isNaN(dws) || isNaN(dnca) || isNaN(alreadyExecuted) || isNaN(minCash) || dws < 0 || dnca < 0 || alreadyExecuted < 0 || minCash < 0) {
    return null;
  }

  const totalAvailable = dws + dnca;
  const usableCapital = Math.max(0, totalAvailable - minCash);
  const remainingCapital = Math.max(0, usableCapital - alreadyExecuted);

  const triggerLevel = getTriggerLevel(drawdown);
  const alreadyExecutedThisLevel = isLevelExecuted(rotationState, triggerLevel);
  const plan = getRotationPlanByDrawdown(drawdown, vixConfirmed);
  const amountToRotate = alreadyExecutedThisLevel ? 0 : (remainingCapital * plan.rotatePct);

  const fromDws = Math.min(dws, amountToRotate);
  const fromDnca = Math.max(0, amountToRotate - fromDws);

  const toVanguard = amountToRotate * plan.vanguardPct;
  const toRobeco = amountToRotate * plan.robecoBpPct;
  const toJupiter = amountToRotate * plan.jupiterPct;
  const toKopernik = amountToRotate * plan.kopernikPct;
  const toEmerging = amountToRotate * plan.emergingPct;

  let executionOrder = plan.note;

  if (plan.enabled && amountToRotate > 0) {
    const steps = [];

    if (fromDws > 0.009) {
      steps.push(`1. Traspasar ${euro(fromDws)} desde DWS`);
    }

    if (fromDnca > 0.009) {
      steps.push(`${steps.length + 1}. Traspasar ${euro(fromDnca)} desde DNCA`);
    }

    const buys = [
      { name: "Vanguard", amount: toVanguard },
      { name: "Robeco BP", amount: toRobeco },
      { name: "Jupiter", amount: toJupiter },
      { name: "Kopernik", amount: toKopernik },
      { name: "Emergentes", amount: toEmerging }
    ].filter(item => item.amount > 0.009);

    if (buys.length) {
      steps.push(`${steps.length + 1}. Comprar: ${buys.map(item => `${item.name} ${euro(item.amount)}`).join(" · ")}`);
    }

    executionOrder = steps.join(" | ");
  }

  return {
    enabled: plan.enabled && !alreadyExecutedThisLevel,
    label: plan.label,
    rotatePct: plan.rotatePct,
    totalAvailable,
    minCash,
    usableCapital,
    alreadyExecuted,
    remainingCapital,
    triggerLevel,
    alreadyExecutedThisLevel,
    amountToRotate,
    fromDws,
    fromDnca,
    toVanguard,
    toRobeco,
    toJupiter,
    toKopernik,
    toEmerging,
    note: plan.note,
    executionOrder,
    vixConfirmed
  };
}

function renderRotationSummary(latest) {
  const dropPct = Number(latest.drop_pct);
  const vix = Number(latest.vix);
  const vixConfirmed = vix > 20;
  const plan = getRotationPlanByDrawdown(dropPct, vixConfirmed);
  const traffic = getRotationTrafficLight(dropPct, vixConfirmed);

  setText("rotationCurrentDrawdown", pctFromDecimal(dropPct));
  setText("rotationTriggerText", plan.label);
  setText("rotationCurrentVix", num(vix, 2));
  setText("rotationVixValidation", vixConfirmed ? "Sí" : "No");
  setText("rotationActionText", plan.enabled ? `Activable · ${plan.label}` : plan.note);
  setText("rotationTrafficLight", traffic.light);
  setText("rotationStatusText", traffic.status);

  const pillEl = document.getElementById("rotationPill");
  if (pillEl) {
    pillEl.textContent = plan.enabled ? plan.label : "Sin trigger";
  }
}

function renderRotationCalculator(latest) {
  const dwsInput = document.getElementById("rotationDwsInput");
  const dncaInput = document.getElementById("rotationDncaInput");
  const drawdownSelector = document.getElementById("rotationDrawdownSelector");
  const vixSelector = document.getElementById("rotationVixSelector");
  const executedInput = document.getElementById("rotationExecutedInput");
  const minCashInput = document.getElementById("rotationMinCashInput");

  if (!dwsInput || !dncaInput || !drawdownSelector || !vixSelector || !executedInput || !minCashInput) return;

  const drawdown = normalizeDrawdownValue(drawdownSelector.value, latest.drop_pct);
  const vixConfirmed = resolveVixConfirmation(vixSelector.value, latest.vix);
  const alreadyExecuted = Number(executedInput.value) || 0;
  const minCashReserve = Number(minCashInput.value) || 0;

  const result = calculateRotationBreakdown(
    dwsInput.value,
    dncaInput.value,
    drawdown,
    vixConfirmed,
    alreadyExecuted,
    minCashReserve,
    latest.rotation_state || null
  );

  const totalAvailableDisplay = Math.max(0, ((Number(dwsInput.value) || 0) + (Number(dncaInput.value) || 0) - minCashReserve));
  setText("rotationCapitalAvailable", euro(totalAvailableDisplay));

  if (!result) {
    setText("rotationTotalAvailableAmount", "—");
    setText("rotationRotatePctText", "—");
    setText("rotationAmountToRotate", "—");
    setText("rotationFromDws", "—");
    setText("rotationFromDnca", "—");
    setText("rotationToVanguard", "—");
    setText("rotationToRobeco", "—");
    setText("rotationToJupiter", "—");
    setText("rotationToKopernik", "—");
    setText("rotationToEmerging", "—");
    setText("rotationAlreadyExecuted", "—");
    setText("rotationRemainingCapital", "—");
    setText("rotationExecutionOrder", "—");
    setText("rotationNote", "Introduzca importes válidos.");
    return;
  }

  setText("rotationTotalAvailableAmount", euro(result.usableCapital));
  setText("rotationRotatePctText", pctFromDecimal(result.rotatePct));
  setText("rotationAmountToRotate", euro(result.amountToRotate));
  setText("rotationFromDws", euro(result.fromDws));
  setText("rotationFromDnca", euro(result.fromDnca));
  setText("rotationToVanguard", euro(result.toVanguard));
  setText("rotationToRobeco", euro(result.toRobeco));
  setText("rotationToJupiter", euro(result.toJupiter));
  setText("rotationToKopernik", euro(result.toKopernik));
  setText("rotationToEmerging", euro(result.toEmerging));
  setText("rotationAlreadyExecuted", euro(result.alreadyExecuted));
  setText("rotationRemainingCapital", euro(result.remainingCapital));
  setText("rotationExecutionOrder", result.alreadyExecutedThisLevel ? `Tramo ${formatTriggerLevel(result.triggerLevel)} ya marcado como ejecutado.` : result.executionOrder);
  setText("rotationNote", result.alreadyExecutedThisLevel ? "Bloqueado para evitar duplicar la misma entrada." : result.note);
}

function setupRotationSimulator(latest) {
  const dwsInput = document.getElementById("rotationDwsInput");
  const dncaInput = document.getElementById("rotationDncaInput");
  const drawdownSelector = document.getElementById("rotationDrawdownSelector");
  const vixSelector = document.getElementById("rotationVixSelector");
  const executedInput = document.getElementById("rotationExecutedInput");
  const minCashInput = document.getElementById("rotationMinCashInput");
  const button = document.getElementById("rotationCalcButton");

  if (!dwsInput || !dncaInput || !drawdownSelector || !vixSelector || !executedInput || !minCashInput || !button) return;

  const update = () => renderRotationCalculator(latest);

  dwsInput.addEventListener("input", update);
  dncaInput.addEventListener("input", update);
  minCashInput.addEventListener("input", update);
  drawdownSelector.addEventListener("change", update);
  vixSelector.addEventListener("change", update);
  executedInput.addEventListener("input", update);
  button.addEventListener("click", update);

  renderRotationSummary(latest);
  renderRotationCalculator(latest);
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

  renderExtraSections(latest);
  setupScenarioSelector(latest);
  setupSimulator(latest);
  setupRotationSimulator(latest);

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

  console.error(err);
});
