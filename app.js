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
      destination: "Core + calidad; satélites solo en tramos profundos",
      reserveDestination: "DWS Euro Ultra Short",
      note: `Trigger activo: ${entryLabel}. Prioridad: core → calidad → emergentes/small caps.`,
      investNowPct: pctTextToDecimal(investNow) ?? 0,
      reservePct: pctTextToDecimal(reserve) ?? 1,
      investVanguardPct: 0.65,
      investRobecoBpPct: 0.35,
      investJupiterPct: 0.00,
      investKopernikPct: dropPct <= -0.25 ? 0.10 : 0.00,
      investEmergingPct: dropPct <= -0.15 ? 0.10 : 0.00,
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
      destination: "Core + calidad; ampliar emergentes/small caps de forma moderada",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Mercado favorable. Mantener prioridad en core y calidad.",
      investNowPct: 0.90,
      reservePct: 0.10,
      investVanguardPct: 0.55,
      investRobecoBpPct: 0.30,
      investJupiterPct: 0.00,
      investKopernikPct: 0.075,
      investEmergingPct: 0.075,
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
      destination: "Core + calidad",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Neutral. Satélites reducidos y subordinados.",
      investNowPct: 0.70,
      reservePct: 0.30,
      investVanguardPct: 0.60,
      investRobecoBpPct: 0.30,
      investJupiterPct: 0.00,
      investKopernikPct: 0.05,
      investEmergingPct: 0.05,
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
      destination: "Core + calidad",
      reserveDestination: "DWS Euro Ultra Short",
      note: "Mercado caro. No usar dinero nuevo en Kopernik, emergentes ni oro.",
      investNowPct: 0.50,
      reservePct: 0.50,
      investVanguardPct: 0.65,
      investRobecoBpPct: 0.35,
      investJupiterPct: 0.00,
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
    reserve: "100% en liquidez",
    destination: "Sin compras salvo rebalanceo imprescindible",
    reserveDestination: "DWS Euro Ultra Short",
    note: "Conservar liquidez y no forzar entradas.",
    investNowPct: 0.00,
    reservePct: 1.00,
    investVanguardPct: 0.00,
    investRobecoBpPct: 0.00,
    investJupiterPct: 0.00,
    investKopernikPct: 0.00,
    investEmergingPct: 0.00,
    investDncaPct: 0.00,
    reserveDncaPct: 0.00,
    reserveDwsPct: 1.00
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
      vanguardPct: 0.40,
      robecoBpPct: 0.20,
      jupiterPct: 0.00,
      kopernikPct: 0.20,
      emergingPct: 0.20,
      note: "Último tramo. Mayor peso en satélites según prioridad del PDF."
    };
  }
  if (drawdown <= -0.25) {
    return {
      enabled: true,
      label: "Entrada muy fuerte",
      rotatePct: 0.25,
      vanguardPct: 0.45,
      robecoBpPct: 0.25,
      jupiterPct: 0.00,
      kopernikPct: 0.15,
      emergingPct: 0.15,
      note: "Tramo agresivo. Se abren satélites de forma clara."
    };
  }
  if (drawdown <= -0.20) {
    return {
      enabled: true,
      label: "Entrada fuerte",
      rotatePct: 0.30,
      vanguardPct: 0.55,
      robecoBpPct: 0.25,
      jupiterPct: 0.00,
      kopernikPct: 0.10,
      emergingPct: 0.10,
      note: "Tramo principal. Core y calidad siguen mandando."
    };
  }
  if (drawdown <= -0.15) {
    return {
      enabled: true,
      label: "Segunda entrada",
      rotatePct: 0.20,
      vanguardPct: 0.65,
      robecoBpPct: 0.25,
      jupiterPct: 0.00,
      kopernikPct: 0.00,
      emergingPct: 0.10,
      note: "Entrada intermedia. Aparece emergentes de forma limitada."
    };
  }
  if (drawdown <= -0.10) {
    return {
      enabled: true,
      label: "Entrada inicial",
      rotatePct: 0.10,
      vanguardPct: 0.70,
      robecoBpPct: 0.30,
      jupiterPct: 0.00,
      kopernikPct: 0.00,
      emergingPct: 0.00,
      note: "Primer tramo. Solo core y calidad."
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

function calculateRotationBreakdown(dwsAmount, dncaAmount, drawdown, vixConfirmed, alreadyExecutedAmount = 0, minCashReserve = 0) {
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

  const plan = getRotationPlanByDrawdown(drawdown, vixConfirmed);
  const amountToRotate = remainingCapital * plan.rotatePct;

  const dwsUsable = Math.max(0, dws - minCash);
  const fromDws = Math.min(dwsUsable, amountToRotate);
  const fromDnca = Math.max(0, amountToRotate - fromDws);

  const toVanguard = amountToRotate * plan.vanguardPct;
  const toRobeco = amountToRotate * plan.robecoBpPct;
  const toJupiter = amountToRotate * plan.jupiterPct;
  const toKopernik = amountToRotate * plan.kopernikPct;
  const toEmerging = amountToRotate * plan.emergingPct;

  let executionOrder = plan.note;

  if (plan.enabled && amountToRotate > 0) {
    const steps = [];
    if (fromDws > 0.009) steps.push(`1. Traspasar ${euro(fromDws)} desde DWS`);
    if (fromDnca > 0.009) steps.push(`${steps.length + 1}. Traspasar ${euro(fromDnca)} desde DNCA`);
    const buys = [
      { name: "Vanguard", amount: toVanguard },
      { name: "Robeco BP", amount: toRobeco },
      { name: "Jupiter", amount: toJupiter },
      { name: "Kopernik", amount: toKopernik },
      { name: "Emergentes", amount: toEmerging }
    ].filter(item => item.amount > 0.009);
    if (buys.length) steps.push(`${steps.length + 1}. Comprar: ${buys.map(item => `${item.name} ${euro(item.amount)}`).join(" · ")}`);
    executionOrder = steps.join(" | ");
  }

  return {
    enabled: plan.enabled,
    label: plan.label,
    rotatePct: plan.rotatePct,
    totalAvailable,
    minCash,
    usableCapital,
    alreadyExecuted,
    remainingCapital,
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

  if (!dwsInput || !dncaInput || !drawdownSelector || !vixSelector || !executedInput) return;

  const drawdown = normalizeDrawdownValue(drawdownSelector.value, latest.drop_pct);
  const vixConfirmed = resolveVixConfirmation(vixSelector.value, latest.vix);
  const alreadyExecuted = Number(executedInput.value) || 0;
  const minCashReserve = Number(minCashInput?.value) || 0;

  const result = calculateRotationBreakdown(
    dwsInput.value,
    dncaInput.value,
    drawdown,
    vixConfirmed,
    alreadyExecuted,
    minCashReserve
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

  setText("rotationTotalAvailableAmount", euro(result.totalAvailable));
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
  setText("rotationExecutionOrder", result.executionOrder);
  setText("rotationNote", result.note);
}

function setupRotationSimulator(latest) {
  const dwsInput = document.getElementById("rotationDwsInput");
  const dncaInput = document.getElementById("rotationDncaInput");
  const drawdownSelector = document.getElementById("rotationDrawdownSelector");
  const vixSelector = document.getElementById("rotationVixSelector");
  const executedInput = document.getElementById("rotationExecutedInput");
  const minCashInput = document.getElementById("rotationMinCashInput");
  const button = document.getElementById("rotationCalcButton");

  if (!dwsInput || !dncaInput || !drawdownSelector || !vixSelector || !executedInput || !button) return;

  const update = () => renderRotationCalculator(latest);

  dwsInput.addEventListener("input", update);
  dncaInput.addEventListener("input", update);
  drawdownSelector.addEventListener("change", update);
  vixSelector.addEventListener("change", update);
  executedInput.addEventListener("input", update);
  if (minCashInput) minCashInput.addEventListener("input", update);
  button.addEventListener("click", update);

  renderRotationSummary(latest);
  renderRotationCalculator(latest);
}


function parseRangeUpper(text) {
  if (!text || typeof text !== "string") return null;
  const matches = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => Number(m[0].replace(",", ".")));
  if (!matches.length) return null;
  return Math.max(...matches) / 100;
}

function parseRangeLower(text) {
  if (!text || typeof text !== "string") return null;
  const matches = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => Number(m[0].replace(",", ".")));
  if (!matches.length) return null;
  return Math.min(...matches) / 100;
}

function daysBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return Math.max(0, Math.round((da - db) / 86400000));
}

function freshnessLabel(days) {
  if (days === null || days === undefined || isNaN(Number(days))) return "—";
  if (days <= 10) return `Verde · ${days}d`;
  if (days <= 30) return `Amarillo · ${days}d`;
  return `Rojo · ${days}d`;
}

function getActiveRotationLevel(dropPct) {
  if (isNaN(Number(dropPct))) return null;
  if (Number(dropPct) <= -0.30) return "-30%";
  if (Number(dropPct) <= -0.25) return "-25%";
  if (Number(dropPct) <= -0.20) return "-20%";
  if (Number(dropPct) <= -0.15) return "-15%";
  if (Number(dropPct) <= -0.10) return "-10%";
  return "Sin trigger";
}

function validateSystem(latest) {
  const limits = latest.system_limits || { rv_max: 0.70, cash_min: 0.10, cash_max: 0.25, gold_max: 0.07, bond_max_s3: 0.15, emerging_max: 0.08, concentrated_asset_max: 0.12 };
  const issues = [];
  const rvUpper = parseRangeUpper(latest.allocations?.rv);
  const bondUpper = parseRangeUpper(latest.allocations?.bonos);
  const cashLower = parseRangeLower(latest.allocations?.liquidez);
  const cashUpper = parseRangeUpper(latest.allocations?.liquidez);
  const goldUpper = parseRangeUpper(latest.allocations?.oro);
  if (rvUpper !== null && rvUpper > limits.rv_max) issues.push(`RV objetivo supera ${pctFromDecimal(limits.rv_max)}`);
  if (bondUpper !== null && bondUpper > (limits.bond_max_s3 ?? 0.15)) issues.push(`Bonos superan ${pctFromDecimal(limits.bond_max_s3 ?? 0.15)}`);
  if (cashLower !== null && cashLower < limits.cash_min) issues.push(`Liquidez mínima inferior a ${pctFromDecimal(limits.cash_min)}`);
  if (cashUpper !== null && cashUpper > limits.cash_max) issues.push(`Liquidez táctica supera ${pctFromDecimal(limits.cash_max)}`);
  if (goldUpper !== null && goldUpper > limits.gold_max) issues.push(`Oro supera ${pctFromDecimal(limits.gold_max)}`);

  const comp = latest.composition_target || {};
  const compEntries = Object.entries(comp);
  compEntries.forEach(([key, value]) => {
    if (typeof value === "number" && value > limits.concentrated_asset_max && !key.includes("gold") && !key.includes("dws")) {
      issues.push(`${key} supera ${pctFromDecimal(limits.concentrated_asset_max)}`);
    }
  });
  if (typeof comp.robeco_qi_emerging_conservative === "number" && comp.robeco_qi_emerging_conservative > limits.emerging_max) {
    issues.push(`Emergentes supera ${pctFromDecimal(limits.emerging_max)}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    limitsText: `RV ≤ ${pctFromDecimal(limits.rv_max)} · Liquidez ${pctFromDecimal(limits.cash_min)}–${pctFromDecimal(limits.cash_max)} · Oro ≤ ${pctFromDecimal(limits.gold_max)} · Emergentes ≤ ${pctFromDecimal(limits.emerging_max)} · Concentrado ≤ ${pctFromDecimal(limits.concentrated_asset_max)}`
  };
}

function renderSystemValidation(latest) {
  const result = validateSystem(latest);
  setText("limitsStatus", result.valid ? "OK" : "Revisar");
  setText("limitsIssues", result.issues.length ? result.issues.join(" | ") : "Sin incidencias sobre la asignación objetivo");
  setText("limitsConfig", result.limitsText);
  const pill = document.getElementById("limitsPill");
  if (pill) pill.textContent = result.valid ? "Cumple" : "Ajustar";
}

function renderWhyScenario(latest) {
  const cape = Number(latest.cape);
  const pmi = Number(latest.pmi);
  const leiTrend = Number(latest.lei?.trend_3m);
  const dropPct = Number(latest.drop_pct);
  const vix = Number(latest.vix);
  setText("whyCape", `${cape > 35 ? "Sí" : "No"} · ${num(cape, 2)}`);
  setText("whyPmi", `${pmi > 52 ? "Sí" : "No"} · ${num(pmi, 2)}`);
  setText("whyLei", `${leiTrend < 0 ? "Sí" : "No"} · ${num(leiTrend, 2)}`);
  setText("whyDrop", `${dropPct <= -0.10 ? "Sí" : "No"} · ${pctFromDecimal(dropPct)}`);
  setText("whyVix", `${vix > 20 ? "Sí" : "No"} · ${num(vix, 2)}`);
}

function renderFreshness(latest) {
  const ref = latest.timestamp || latest.nav_date;
  const capeDays = latest.data_freshness?.cape_days ?? daysBetween(ref, latest.cape_date);
  const pmiDays = latest.data_freshness?.pmi_days ?? daysBetween(ref, latest.pmi_date);
  const leiDays = latest.data_freshness?.lei_days ?? daysBetween(ref, latest.lei?.date);
  const navDays = latest.data_freshness?.nav_days ?? daysBetween(ref, latest.nav_date);
  const vixDays = latest.data_freshness?.vix_days ?? 0;
  setText("freshCape", freshnessLabel(capeDays));
  setText("freshPmi", freshnessLabel(pmiDays));
  setText("freshLei", freshnessLabel(leiDays));
  setText("freshNav", freshnessLabel(navDays));
  setText("freshVix", freshnessLabel(vixDays));
  const vals = [capeDays, pmiDays, leiDays, navDays, vixDays].filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
  const maxDays = vals.length ? Math.max(...vals) : null;
  const pill = document.getElementById("freshnessPill");
  if (pill) pill.textContent = maxDays === null ? "—" : maxDays <= 10 ? "Al día" : maxDays <= 30 ? "Atención" : "Desactualizado";
}

function renderRotationState(latest) {
  const activeLevel = getActiveRotationLevel(latest.drop_pct);
  const executed = latest.rotation_state?.executed_levels;
  const lastDate = latest.rotation_state?.last_execution_date;
  const lastAmount = latest.rotation_state?.last_execution_amount;
  setText("rotationActiveLevel", activeLevel);
  setText("rotationExecutedLevels", Array.isArray(executed) && executed.length ? executed.join(", ") : "No registrados");
  setText("rotationLastExecution", lastDate ? `${formatDate(lastDate)} · ${euro(lastAmount || 0)}` : "Sin registro");
  const pill = document.getElementById("rotationStatePill");
  if (pill) pill.textContent = activeLevel;
}


function renderStructuralRules(latest) {
  const c = latest.composition_target || {};
  setText("compVanguard", pctFromDecimal(c.vanguard_global_stock));
  setText("compRobecoBp", pctFromDecimal(c.robeco_bp_global_premium));
  setText("compKopernik", pctFromDecimal(c.heptagon_kopernik));
  setText("compEmerging", pctFromDecimal(c.robeco_qi_emerging_conservative));
  setText("compPlan", pctFromDecimal(c.plan_pensiones_caixabank));
  setText("compDnca", pctFromDecimal(c.dnca_alpha_bonds));
  setText("compJupiter", pctFromDecimal(c.jupiter_global_equity_absolute_return));
  setText("compDws", pctFromDecimal(c.dws_euro_ultra_short));
  setText("compGold", pctFromDecimal(c.invesco_physical_gold));

  setText("rebalanceText", "Desviación < ±4 pp: no actuar · revisión mensual · revisión estructural trimestral");
  const flash = latest.flash_crash_rules || {};
  setText("flashText", `${flash.activation || "—"} · no comprar el día del shock · esperar ${flash.wait_hours || "—"}h`);
  const risk = latest.risk_reduction_rules || {};
  setText("riskReductionText", `CAPE > ${risk.trigger_cape_gt ?? "—"} y VIX < ${risk.trigger_vix_lt ?? "—"} · ${risk.action || "—"}`);
  setText("hardRulesText", Array.isArray(latest.hard_rules) ? latest.hard_rules.join(" · ") : "—");
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

  renderSystemValidation(latest);
  renderWhyScenario(latest);
  renderFreshness(latest);
  renderRotationState(latest);
  renderStructuralRules(latest);

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


function getDecisionStatus(latest) {
  const status = latest?.decision_status || {};
  return {
    blocked: Boolean(status.blocked),
    reasons: Array.isArray(status.reasons) ? status.reasons : [],
    warnings: Array.isArray(status.warnings) ? status.warnings : []
  };
}

function isDecisionBlocked(latest) {
  return getDecisionStatus(latest).blocked;
}

function getCapeBucket(cape) {
  const value = Number(cape);
  if (isNaN(value)) return "unknown";
  if (value > 35) return "caro";
  if (value >= 28) return "neutral";
  return "barato";
}

function getCashTargetText(capeBucket, latest) {
  const policy = latest?.cash_policy || {};
  if (capeBucket === "caro") return policy.high_cape_target || "15–20%";
  if (capeBucket === "neutral") return policy.medium_cape_target || "12–15%";
  return policy.low_cape_target || "10–12%";
}

function buildReserveDestinationText(plan) {
  const parts = [];
  if ((plan.reserveDwsPct || 0) > 0) parts.push(`DWS ${pctFromDecimal(plan.reserveDwsPct)}`);
  if ((plan.reserveDncaPct || 0) > 0) parts.push(`DNCA ${pctFromDecimal(plan.reserveDncaPct)}`);
  if ((plan.reserveJupiterPct || 0) > 0) parts.push(`Jupiter ${pctFromDecimal(plan.reserveJupiterPct)}`);
  return parts.length ? parts.join(" · ") : "Sin reserva";
}

function buildNewMoneyPlan(latest, scenarioOverride = "auto") {
  const selectedScenario = normalizeScenarioValue(scenarioOverride);
  const capeBucket = selectedScenario === "1" ? "barato" : selectedScenario === "2" ? "neutral" : "caro";
  const effectiveBucket = selectedScenario === "auto" ? getCapeBucket(latest?.cape) : capeBucket;
  const decision = getDecisionStatus(latest);
  const isBlocked = decision.blocked;
  const cashTarget = getCashTargetText(effectiveBucket, latest);
  const rules = latest?.new_money_rules || {};
  const defensive = rules.defensive_use || {};
  const currentScenario = latest?.scenario || "—";
  const realCash = Number(latest?.real_cash_pct);
  const targetCashUpper = parseRangeUpper(cashTarget);
  const defensiveUse = !isNaN(realCash) && targetCashUpper !== null && realCash > targetCashUpper && Boolean(defensive.enabled_if_cash_above_target);

  const basePlan = {
    mode: "SIN DATOS",
    scenarioAppliedText: selectedScenario === "auto" ? `${currentScenario} · CAPE n/d` : `Simulación manual · ${selectedScenario}`,
    investNow: "0% del dinero nuevo",
    reserve: "100% en liquidez",
    destination: "Sin compras hasta actualizar el CAPE",
    reserveDestination: "DWS 100%",
    note: isBlocked ? `Bloqueado: ${decision.reasons.join(" | ")}` : "Falta CAPE para asignar dinero nuevo.",
    investNowPct: 0,
    reservePct: 1,
    investVanguardPct: 0,
    investRobecoBpPct: 0,
    investJupiterPct: 0,
    investKopernikPct: 0,
    investEmergingPct: 0,
    investDncaPct: 0,
    reserveDncaPct: 0,
    reserveJupiterPct: 0,
    reserveDwsPct: 1,
    decisionStatusText: isBlocked ? "Bloqueado" : "Pendiente de CAPE"
  };

  const byBucket = {
    barato: {
      mode: selectedScenario === "auto" ? "CAPE BAJO" : "SIMULACIÓN",
      scenarioAppliedText: selectedScenario === "auto" ? `CAPE < 28 · Automático` : "CAPE < 28 · Manual",
      investNow: "90% del dinero nuevo",
      reserve: "10% en liquidez",
      destination: "Core + calidad",
      note: `Asignación basada en CAPE. Objetivo de liquidez orientativo: ${cashTarget}.`,
      investNowPct: 0.90,
      reservePct: 0.10,
      investVanguardPct: 0.65,
      investRobecoBpPct: 0.35,
      investJupiterPct: 0,
      investKopernikPct: 0,
      investEmergingPct: 0,
      investDncaPct: 0,
      reserveDncaPct: 0,
      reserveJupiterPct: 0,
      reserveDwsPct: 1
    },
    neutral: {
      mode: selectedScenario === "auto" ? "CAPE MEDIO" : "SIMULACIÓN",
      scenarioAppliedText: selectedScenario === "auto" ? `CAPE 28–35 · Automático` : "CAPE 28–35 · Manual",
      investNow: "70% del dinero nuevo",
      reserve: "30% en liquidez",
      destination: "Core + calidad",
      note: `Asignación basada en CAPE. Objetivo de liquidez orientativo: ${cashTarget}.`,
      investNowPct: 0.70,
      reservePct: 0.30,
      investVanguardPct: 0.65,
      investRobecoBpPct: 0.35,
      investJupiterPct: 0,
      investKopernikPct: 0,
      investEmergingPct: 0,
      investDncaPct: 0,
      reserveDncaPct: 0,
      reserveJupiterPct: 0,
      reserveDwsPct: 1
    },
    caro: {
      mode: selectedScenario === "auto" ? "CAPE ALTO" : "SIMULACIÓN",
      scenarioAppliedText: selectedScenario === "auto" ? `CAPE > 35 · Automático` : "CAPE > 35 · Manual",
      investNow: "50% del dinero nuevo",
      reserve: "50% en liquidez",
      destination: "Core + calidad",
      note: `Asignación basada en CAPE. Objetivo de liquidez orientativo: ${cashTarget}.`,
      investNowPct: 0.50,
      reservePct: 0.50,
      investVanguardPct: 0.65,
      investRobecoBpPct: 0.35,
      investJupiterPct: 0,
      investKopernikPct: 0,
      investEmergingPct: 0,
      investDncaPct: 0,
      reserveDncaPct: 0,
      reserveJupiterPct: 0,
      reserveDwsPct: 1
    }
  };

  const plan = byBucket[effectiveBucket] || basePlan;

  if (defensiveUse) {
    plan.mode = selectedScenario === "auto" ? "USO DEFENSIVO" : plan.mode;
    plan.reserveDestination = `DNCA ${pctFromDecimal(defensive.dnca || 0.60)} · Jupiter ${pctFromDecimal(defensive.jupiter || 0.40)}`;
    plan.reserveDncaPct = defensive.dnca || 0.60;
    plan.reserveJupiterPct = defensive.jupiter || 0.40;
    plan.reserveDwsPct = 0;
    plan.note = `${plan.note} Reserva defensiva activada por exceso de liquidez.`;
  } else {
    plan.reserveDestination = buildReserveDestinationText(plan);
  }

  if (isBlocked) {
    plan.note = `Bloqueado: ${decision.reasons.join(" | ")}`;
    plan.decisionStatusText = "Bloqueado";
  } else if (decision.warnings.length) {
    plan.note = `${plan.note} Advertencias: ${decision.warnings.join(" | ")}`;
    plan.decisionStatusText = "Operativo con advertencias";
  } else {
    plan.decisionStatusText = "Operativo";
  }

  return plan;
}

function calculateNewMoneyBreakdown(amount, plan) {
  const total = Number(amount);
  if (isNaN(total) || total < 0) return null;

  const investNowAmount = total * (plan.investNowPct || 0);
  const reserveAmount = total * (plan.reservePct || 0);
  const vanguardAmount = investNowAmount * (plan.investVanguardPct || 0);
  const robecoBpAmount = investNowAmount * (plan.investRobecoBpPct || 0);
  const jupiterAmount = (investNowAmount * (plan.investJupiterPct || 0)) + (reserveAmount * (plan.reserveJupiterPct || 0));
  const kopernikAmount = investNowAmount * (plan.investKopernikPct || 0);
  const emergingAmount = investNowAmount * (plan.investEmergingPct || 0);
  const dncaAmount = (investNowAmount * (plan.investDncaPct || 0)) + (reserveAmount * (plan.reserveDncaPct || 0));
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
    ["simInvestNowAmount","simReserveAmount","simVanguardAmount","simRobecoAmount","simJupiterAmount","simKopernikAmount","simEmergingAmount","simDncaAmount","simDwsAmount"].forEach(id => setText(id, "—"));
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
  setText("newMoneyDecisionStatus", plan.decisionStatusText || "—");
  setText("newMoneyNote", plan.note);
  renderSimulator(plan);
}

function resolveVixConfirmation(selectionValue, latestVix) {
  if (selectionValue === "yes") return true;
  if (selectionValue === "no") return false;
  const vix = Number(latestVix);
  if (isNaN(vix)) return false;
  return vix > 20;
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
  if (drawdown <= -0.30) return { enabled: true, label: "Entrada máxima", rotatePct: 0.15, vanguardPct: 0.40, robecoBpPct: 0.20, jupiterPct: 0, kopernikPct: 0.20, emergingPct: 0.20, note: "Último tramo. Mayor peso en satélites según prioridad." };
  if (drawdown <= -0.25) return { enabled: true, label: "Entrada muy fuerte", rotatePct: 0.25, vanguardPct: 0.50, robecoBpPct: 0.20, jupiterPct: 0, kopernikPct: 0.10, emergingPct: 0.20, note: "Tramo profundo. Core y calidad mantienen prioridad." };
  if (drawdown <= -0.20) return { enabled: true, label: "Entrada fuerte", rotatePct: 0.30, vanguardPct: 0.55, robecoBpPct: 0.25, jupiterPct: 0, kopernikPct: 0.10, emergingPct: 0.10, note: "Tramo principal. Core y calidad siguen mandando." };
  if (drawdown <= -0.15) return { enabled: true, label: "Segunda entrada", rotatePct: 0.20, vanguardPct: 0.65, robecoBpPct: 0.25, jupiterPct: 0, kopernikPct: 0, emergingPct: 0.10, note: "Entrada intermedia. Aparece emergentes de forma limitada." };
  if (drawdown <= -0.10) return { enabled: true, label: "Entrada inicial", rotatePct: 0.10, vanguardPct: 0.70, robecoBpPct: 0.30, jupiterPct: 0, kopernikPct: 0, emergingPct: 0, note: "Primer tramo. Solo core y calidad." };
  return { enabled: false, label: "Sin trigger", rotatePct: 0, vanguardPct: 0, robecoBpPct: 0, jupiterPct: 0, kopernikPct: 0, emergingPct: 0, note: "No hay caída suficiente para activar rotación." };
}

function calculateRotationBreakdown(dwsAmount, dncaAmount, jupiterAmount, drawdown, vixConfirmed, alreadyExecutedAmount = 0, minCashReserve = 0) {
  const dws = Number(dwsAmount);
  const dnca = Number(dncaAmount);
  const jupiter = Number(jupiterAmount);
  const alreadyExecuted = Number(alreadyExecutedAmount);
  const minCash = Number(minCashReserve);

  if ([dws, dnca, jupiter, alreadyExecuted, minCash].some(v => isNaN(v) || v < 0)) return null;

  const plan = getRotationPlanByDrawdown(drawdown, vixConfirmed);
  const totalAvailable = dws + dnca + jupiter;
  const dwsUsable = Math.max(0, dws - minCash);
  const usableCapital = dwsUsable + dnca + jupiter;
  const remainingCapital = Math.max(0, usableCapital - alreadyExecuted);
  const amountToRotate = remainingCapital * (plan.rotatePct || 0);

  const fromDws = Math.min(dwsUsable, amountToRotate);
  const remainingAfterDws = Math.max(0, amountToRotate - fromDws);
  const fromDnca = Math.min(dnca, remainingAfterDws);
  const remainingAfterDnca = Math.max(0, remainingAfterDws - fromDnca);
  const fromJupiter = Math.min(jupiter, remainingAfterDnca);

  const toVanguard = amountToRotate * (plan.vanguardPct || 0);
  const toRobeco = amountToRotate * (plan.robecoBpPct || 0);
  const toJupiter = amountToRotate * (plan.jupiterPct || 0);
  const toKopernik = amountToRotate * (plan.kopernikPct || 0);
  const toEmerging = amountToRotate * (plan.emergingPct || 0);

  let executionOrder = plan.note;
  if (plan.enabled && amountToRotate > 0) {
    const steps = [];
    if (fromDws > 0.009) steps.push(`1. Traspasar ${euro(fromDws)} desde liquidez`);
    if (fromDnca > 0.009) steps.push(`${steps.length + 1}. Traspasar ${euro(fromDnca)} desde DNCA`);
    if (fromJupiter > 0.009) steps.push(`${steps.length + 1}. Traspasar ${euro(fromJupiter)} desde Jupiter`);
    const buys = [
      { name: "Vanguard", amount: toVanguard },
      { name: "Robeco BP", amount: toRobeco },
      { name: "Jupiter", amount: toJupiter },
      { name: "Kopernik", amount: toKopernik },
      { name: "Emergentes", amount: toEmerging }
    ].filter(item => item.amount > 0.009);
    if (buys.length) steps.push(`${steps.length + 1}. Comprar: ${buys.map(item => `${item.name} ${euro(item.amount)}`).join(" · ")}`);
    executionOrder = steps.join(" | ");
  }

  return {
    enabled: plan.enabled,
    label: plan.label,
    rotatePct: plan.rotatePct,
    totalAvailable,
    minCash,
    usableCapital,
    alreadyExecuted,
    remainingCapital,
    amountToRotate,
    fromDws,
    fromDnca,
    fromJupiter,
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
  const decision = getDecisionStatus(latest);
  const hasVix = !isNaN(vix);
  const vixConfirmed = hasVix && vix > 20;
  const plan = getRotationPlanByDrawdown(dropPct, vixConfirmed);
  const traffic = getRotationTrafficLight(dropPct, vixConfirmed);

  setText("rotationCurrentDrawdown", pctFromDecimal(dropPct));
  setText("rotationTriggerText", plan.label);
  setText("rotationCurrentVix", hasVix ? num(vix, 2) : "Sin VIX");
  setText("rotationVixValidation", hasVix ? (vixConfirmed ? "Sí" : "No") : "No disponible");
  setText("rotationActionText", decision.blocked ? `Bloqueado · ${decision.reasons.join(" | ")}` : (plan.enabled ? `Activable · ${plan.label}` : plan.note));
  setText("rotationTrafficLight", decision.blocked ? "ROJO" : traffic.light);
  setText("rotationStatusText", decision.blocked ? "Decisión bloqueada" : traffic.status);
  const pillEl = document.getElementById("rotationPill");
  if (pillEl) pillEl.textContent = decision.blocked ? "Bloqueado" : (plan.enabled ? plan.label : "Sin trigger");
}

function renderRotationCalculator(latest) {
  const dwsInput = document.getElementById("rotationDwsInput");
  const dncaInput = document.getElementById("rotationDncaInput");
  const jupiterInput = document.getElementById("rotationJupiterInput");
  const drawdownSelector = document.getElementById("rotationDrawdownSelector");
  const vixSelector = document.getElementById("rotationVixSelector");
  const executedInput = document.getElementById("rotationExecutedInput");
  const minCashInput = document.getElementById("rotationMinCashInput");
  if (!dwsInput || !dncaInput || !jupiterInput || !drawdownSelector || !vixSelector || !executedInput) return;

  const decision = getDecisionStatus(latest);
  const drawdown = normalizeDrawdownValue(drawdownSelector.value, latest.drop_pct);
  const vixConfirmed = resolveVixConfirmation(vixSelector.value, latest.vix);
  const alreadyExecuted = Number(executedInput.value) || 0;
  const minCashReserve = Number(minCashInput?.value) || 0;
  const result = calculateRotationBreakdown(dwsInput.value, dncaInput.value, jupiterInput.value, drawdown, vixConfirmed, alreadyExecuted, minCashReserve);
  const totalAvailableDisplay = Math.max(0, ((Number(dwsInput.value) || 0) + (Number(dncaInput.value) || 0) + (Number(jupiterInput.value) || 0) - minCashReserve));
  setText("rotationCapitalAvailable", euro(totalAvailableDisplay));

  if (!result) {
    ["rotationTotalAvailableAmount","rotationRotatePctText","rotationAmountToRotate","rotationFromDws","rotationFromDnca","rotationFromJupiter","rotationToVanguard","rotationToRobeco","rotationToJupiter","rotationToKopernik","rotationToEmerging","rotationAlreadyExecuted","rotationRemainingCapital"].forEach(id => setText(id, "—"));
    setText("rotationExecutionOrder", "—");
    setText("rotationNote", "Introduzca importes válidos.");
    return;
  }

  setText("rotationTotalAvailableAmount", euro(result.totalAvailable));
  setText("rotationRotatePctText", pctFromDecimal(result.rotatePct));
  setText("rotationAmountToRotate", euro(result.amountToRotate));
  setText("rotationFromDws", euro(result.fromDws));
  setText("rotationFromDnca", euro(result.fromDnca));
  setText("rotationFromJupiter", euro(result.fromJupiter));
  setText("rotationToVanguard", euro(result.toVanguard));
  setText("rotationToRobeco", euro(result.toRobeco));
  setText("rotationToJupiter", euro(result.toJupiter));
  setText("rotationToKopernik", euro(result.toKopernik));
  setText("rotationToEmerging", euro(result.toEmerging));
  setText("rotationAlreadyExecuted", euro(result.alreadyExecuted));
  setText("rotationRemainingCapital", euro(result.remainingCapital));
  setText("rotationExecutionOrder", decision.blocked ? "Bloqueado por reglas de control de datos." : result.executionOrder);
  setText("rotationNote", decision.blocked ? `Bloqueado: ${decision.reasons.join(" | ")}` : result.note);
}

function setupRotationSimulator(latest) {
  const ids = ["rotationDwsInput","rotationDncaInput","rotationJupiterInput","rotationDrawdownSelector","rotationVixSelector","rotationExecutedInput","rotationMinCashInput","rotationCalcButton"];
  const nodes = ids.map(id => document.getElementById(id));
  if (nodes.some((node, index) => index < 7 && !node) || !nodes[7]) return;
  const [dwsInput, dncaInput, jupiterInput, drawdownSelector, vixSelector, executedInput, minCashInput, button] = nodes;
  const update = () => renderRotationCalculator(latest);
  [dwsInput, dncaInput, jupiterInput, executedInput, minCashInput].forEach(node => node && node.addEventListener("input", update));
  [drawdownSelector, vixSelector].forEach(node => node && node.addEventListener("change", update));
  button.addEventListener("click", update);
  renderRotationSummary(latest);
  renderRotationCalculator(latest);
}

function freshnessLabel(days, kind = "macro") {
  if (days === null || days === undefined || isNaN(Number(days))) return "—";
  const value = Number(days);
  const warn = kind === "market" ? 1 : 7;
  const block = kind === "market" ? 3 : 35;
  if (value <= warn) return `Verde · ${value}d`;
  if (value <= block) return `Amarillo · ${value}d`;
  return `Rojo · ${value}d`;
}

function renderFreshness(latest) {
  const ref = latest.timestamp || latest.nav_date;
  const capeDays = latest.data_freshness?.cape_days ?? daysBetween(ref, latest.cape_date);
  const pmiDays = latest.data_freshness?.pmi_days ?? daysBetween(ref, latest.pmi_date);
  const leiDays = latest.data_freshness?.lei_days ?? daysBetween(ref, latest.lei?.date);
  const navDays = latest.data_freshness?.nav_days ?? daysBetween(ref, latest.nav_date);
  const vixDays = latest.data_freshness?.vix_days ?? 0;
  setText("freshCape", freshnessLabel(capeDays, "macro"));
  setText("freshPmi", freshnessLabel(pmiDays, "macro"));
  setText("freshLei", freshnessLabel(leiDays, "macro"));
  setText("freshNav", freshnessLabel(navDays, "market"));
  setText("freshVix", freshnessLabel(vixDays, "market"));
  const decision = getDecisionStatus(latest);
  const pill = document.getElementById("freshnessPill");
  if (pill) pill.textContent = decision.blocked ? "Bloquea" : (decision.warnings.length ? "Avisa" : "Operativa");
}

function renderDecisionStatus(latest) {
  const decision = getDecisionStatus(latest);
  const statusText = decision.blocked ? "Bloqueado" : (decision.warnings.length ? "Operativo con advertencias" : "Operativo");
  const detailText = decision.reasons.length
    ? decision.reasons.join(" | ")
    : (decision.warnings.length ? `Advertencias: ${decision.warnings.join(" | ")}` : "Sin bloqueo");
  setText("decisionBlockedText", statusText);
  setText("decisionReasons", detailText);
  const pill = document.getElementById("decisionPill");
  if (pill) pill.textContent = decision.blocked ? "Bloqueado" : (decision.warnings.length ? "Aviso" : "OK");
}

function validateSystem(latest) {
  const base = (latest && latest.system_limits) || { rv_max: 0.70, cash_min: 0.10, cash_max: 0.25, gold_max: 0.07, bond_max_s3: 0.15, emerging_max: 0.08, concentrated_asset_max: 0.12 };
  const issues = [];
  const rvUpper = parseRangeUpper(latest.allocations?.rv);
  const bondUpper = parseRangeUpper(latest.allocations?.bonos);
  const cashLower = parseRangeLower(latest.allocations?.liquidez);
  const cashUpper = parseRangeUpper(latest.allocations?.liquidez);
  const goldUpper = parseRangeUpper(latest.allocations?.oro);
  if (rvUpper !== null && rvUpper > base.rv_max) issues.push(`RV objetivo supera ${pctFromDecimal(base.rv_max)}`);
  if (bondUpper !== null && bondUpper > (base.bond_max_s3 ?? 0.15)) issues.push(`Bonos superan ${pctFromDecimal(base.bond_max_s3 ?? 0.15)}`);
  if (cashLower !== null && cashLower < base.cash_min) issues.push(`Liquidez mínima inferior a ${pctFromDecimal(base.cash_min)}`);
  if (cashUpper !== null && cashUpper > base.cash_max) issues.push(`Liquidez táctica supera ${pctFromDecimal(base.cash_max)}`);
  if (goldUpper !== null && goldUpper > base.gold_max) issues.push(`Oro supera ${pctFromDecimal(base.gold_max)}`);
  const tolerances = latest?.rebalance_rules?.tolerances || {};
  const toleranceBits = [];
  if (tolerances.core != null) toleranceBits.push(`Core ±${tolerances.core} pp`);
  if (tolerances.quality != null) toleranceBits.push(`Calidad ±${tolerances.quality} pp`);
  if (tolerances.dnca != null) toleranceBits.push(`DNCA ±${tolerances.dnca} pp`);
  if (tolerances.jupiter != null) toleranceBits.push(`Jupiter ±${tolerances.jupiter} pp`);
  if (tolerances.gold != null) toleranceBits.push(`Oro ±${tolerances.gold} pp`);
  return {
    valid: issues.length === 0,
    issues,
    limitsText: `RV ≤ ${pctFromDecimal(base.rv_max)} · Liquidez ${pctFromDecimal(base.cash_min)}–${pctFromDecimal(base.cash_max)} · Oro ≤ ${pctFromDecimal(base.gold_max)} · Emergentes ≤ ${pctFromDecimal(base.emerging_max)}${toleranceBits.length ? " · " + toleranceBits.join(" · ") : ""}`
  };
}

function renderStructuralRules(latest) {
  const c = latest.composition_target || {};
  setText("compVanguard", pctFromDecimal(c.vanguard_global_stock));
  setText("compRobecoBp", pctFromDecimal(c.robeco_bp_global_premium));
  setText("compKopernik", pctFromDecimal(c.heptagon_kopernik));
  setText("compEmerging", pctFromDecimal(c.robeco_qi_emerging_conservative));
  setText("compPlan", pctFromDecimal(c.plan_pensiones_caixabank));
  setText("compDnca", pctFromDecimal(c.dnca_alpha_bonds));
  setText("compJupiter", pctFromDecimal(c.jupiter_global_equity_absolute_return));
  setText("compDws", pctFromDecimal(c.dws_euro_ultra_short));
  setText("compGold", pctFromDecimal(c.invesco_physical_gold));

  const tolerances = latest?.rebalance_rules?.tolerances || {};
  setText("rebalanceText", `Desviación general < ±4 pp · revisión mensual · Core ±${tolerances.core ?? "—"} · Calidad ±${tolerances.quality ?? "—"} · DNCA ±${tolerances.dnca ?? "—"} · Jupiter ±${tolerances.jupiter ?? "—"} · Oro ±${tolerances.gold ?? "—"}`);
  const flash = latest.flash_crash_rules || {};
  setText("flashText", `${flash.activation || "—"} · no comprar el día del shock · esperar ${flash.wait_hours || "—"}h`);
  const risk = latest.risk_reduction_rules || {};
  const reboundText = risk.market_rebound_from_low === null || risk.market_rebound_from_low === undefined ? "n/d" : pctFromDecimal(risk.market_rebound_from_low);
  setText("riskReductionText", `CAPE > ${risk.trigger_cape_gt ?? "—"} · VIX < ${risk.trigger_vix_lt ?? "—"} · Mercado +20% desde mínimo: ${reboundText} · ${risk.action || "—"}`);
  setText("hardRulesText", Array.isArray(latest.hard_rules) ? latest.hard_rules.join(" · ") : "—");
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
  if (leiTrend === null || leiTrend === undefined || isNaN(Number(leiTrend))) setText("leiTrendText", "Sin tendencia");
  else {
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

  renderSystemValidation(latest);
  renderWhyScenario(latest);
  renderFreshness(latest);
  renderDecisionStatus(latest);
  renderRotationState(latest);
  renderStructuralRules(latest);
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
        { label: "NAV", data: navValues, borderWidth: 2.5, tension: 0.25 },
        { label: "Máx. 52 semanas", data: maxValues, borderDash: [6, 6], borderWidth: 1.5, tension: 0 },
        { label: "Nivel -10%", data: level10, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: "Nivel -15%", data: level15, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: "Nivel -20%", data: level20, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: "Nivel -25%", data: level25, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: "Nivel -30%", data: level30, borderDash: [4, 4], borderWidth: 1, tension: 0 }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: "#dce6f8" } } },
      scales: {
        x: { ticks: { color: "#8ea3c7" }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { ticks: { color: "#8ea3c7" }, grid: { color: "rgba(255,255,255,0.06)" } }
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
