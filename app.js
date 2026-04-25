const SCREEN_SCENARIO_STORAGE_KEY = 'dashboard_screen_scenario_override';

const SCENARIO_LABELS = {
  SC1_EXPANSION: '🟢 Escenario 1 · Expansión',
  SC2_DESACELERACION: '🟡 Escenario 2 · Desaceleración',
  SC3_SOBREVALORACION: '🟠 Escenario 3 · Sobrevaloración',
  SC4_CORRECCION: '🔴 Escenario 4 · Corrección'
};

const SCENARIO_PHASES = {
  SC1_EXPANSION: 'Fase 0 · Normal',
  SC2_DESACELERACION: 'Fase 0 · Normal',
  SC3_SOBREVALORACION: 'Fase 0 · Normal',
  SC4_CORRECCION: 'Fase 2 · Entradas'
};

const NEW_MONEY_MATRIX = {
  SC1_EXPANSION: {
    invest_pct: 0.85,
    reserve_pct: 0.15,
    rv_pct: 0.85,
    defensive_pct: 0,
    liquidity_pct: 0.15,
    rv_distribution: { core: 0.45, quality: 0.25, emerging: 0.15, kopernik: 0.15 },
    defensive_distribution: {},
    note: 'Expansión: sesgo a renta variable.'
  },
  SC2_DESACELERACION: {
    invest_pct: 0.70,
    reserve_pct: 0.30,
    rv_pct: 0.70,
    defensive_pct: 0,
    liquidity_pct: 0.30,
    rv_distribution: { core: 0.50, quality: 0.30, emerging: 0.10, kopernik: 0.10 },
    defensive_distribution: { dnca: 0.60, jupiter: 0.40 },
    note: 'Desaceleración: más prudencia y opcional defensivo.'
  },
  SC3_SOBREVALORACION: {
    invest_pct: 0.60,
    reserve_pct: 0.40,
    rv_pct: 0.40,
    defensive_pct: 0.20,
    liquidity_pct: 0.40,
    rv_distribution: { core: 0.55, quality: 0.35, emerging: 0.07, kopernik: 0.03 },
    defensive_distribution: { dnca: 0.60, jupiter: 0.40 },
    note: 'Sobrevaloración: parte de la inversión nueva puede ir a defensivos.'
  },
  SC4_CORRECCION: {
    invest_pct: 0.90,
    reserve_pct: 0.10,
    rv_pct: 0.90,
    defensive_pct: 0,
    liquidity_pct: 0.10,
    rv_distribution: { core: 0.40, quality: 0.25, emerging: 0.20, kopernik: 0.15 },
    defensive_distribution: {},
    note: 'Corrección: uso agresivo del dinero nuevo.'
  }
};

const ROTATION_MATRIX = {
  SC1_EXPANSION: { core: 0.60, quality: 0.30, emerging: 0.10 },
  SC2_DESACELERACION: { core: 0.55, quality: 0.30, emerging: 0.10, kopernik: 0.05 },
  SC3_SOBREVALORACION: { core: 0.50, quality: 0.30, emerging: 0.15, kopernik: 0.05 },
  SC4_CORRECCION: { core: 0.40, quality: 0.25, emerging: 0.20, kopernik: 0.15 }
};

const ROTATION_INTENSITY = {
  SC1_EXPANSION: 'baja',
  SC2_DESACELERACION: 'media',
  SC3_SOBREVALORACION: 'progresiva',
  SC4_CORRECCION: 'agresiva'
};

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Error cargando ${path}`);
  return await res.json();
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(decimals).replace('.', ',');
}

function formatPercentNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${formatNumber(value, decimals)}%`;
}

function percentText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 100)}%`;
}

function formatEuro(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${formatNumber(value, 2)} €`;
}

function formatDate(value) {
  return value || '—';
}

function formatFreshness(value) {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.status || JSON.stringify(value);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el && href) el.href = href;
}

function mapName(code) {
  const names = {
    core: 'Vanguard Global',
    quality: 'Robeco BP',
    emerging: 'Emergentes',
    kopernik: 'Kopernik',
    dnca: 'DNCA',
    jupiter: 'Jupiter',
    gold: 'Oro',
    pensions: 'Pensiones',
    dws: 'DWS',
    cash_real: 'Cash real',
    groupama: 'Groupama proxy X-Ray',
    cash_proxy_xray: 'Groupama proxy X-Ray'
  };
  return names[code] || code;
}

function objectPercentList(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, v]) => `${mapName(k)} ${percentText(v)}`).join(' · ');
}

function objectTargetList(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, v]) => `${mapName(k)} ${percentText(v)}`).join(' · ');
}

function formatWeightMap(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, v]) => `${mapName(k)} ${formatPercentNumber(Number(v) * 100, 2)}`).join(' · ');
}

function formatDeviationMap(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, v]) => `${mapName(k)} ${v === null || v === undefined ? '—' : formatPercentNumber(Number(v) * 100, 2)}`).join(' · ');
}

function formatBlockedReasons(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, reasons]) => `${mapName(k)}: ${(reasons || []).join(', ')}`).join(' · ');
}

function drawdownLabel(dd) {
  const n = Number(dd);
  if (Number.isNaN(n)) return '—';
  if (n > -3) return 'máximos prácticos';
  if (n > -7) return 'corrección leve';
  if (n > -10) return 'pre-trigger';
  return 'trigger';
}

function getStoredScenarioOverride() {
  try {
    const value = localStorage.getItem(SCREEN_SCENARIO_STORAGE_KEY);
    return value || '';
  } catch {
    return '';
  }
}

function setStoredScenarioOverride(value) {
  try {
    if (!value) {
      localStorage.removeItem(SCREEN_SCENARIO_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SCREEN_SCENARIO_STORAGE_KEY, value);
  } catch {
    // ignore localStorage errors
  }
}

function bindScenarioControls(reloadFn) {
  const select = document.getElementById('scenario-screen-select');
  const applyBtn = document.getElementById('scenario-screen-apply');
  const resetBtn = document.getElementById('scenario-screen-reset');
  if (!select || !applyBtn || !resetBtn) return;

  select.value = getStoredScenarioOverride();

  applyBtn.addEventListener('click', () => {
    setStoredScenarioOverride(select.value);
    reloadFn();
  });

  resetBtn.addEventListener('click', () => {
    select.value = '';
    setStoredScenarioOverride('');
    reloadFn();
  });
}

function applyValuationToNewMoneyRule(rule, valuationAdjustment = {}) {
  const multiplier = Number(valuationAdjustment?.multiplier ?? 1);
  const baseInvestPct = Number(rule?.invest_pct || 0);
  const adjustedInvestPct = Math.max(0, Math.min(1, baseInvestPct * multiplier));
  const investShare = baseInvestPct > 0 ? adjustedInvestPct / baseInvestPct : 0;

  return {
    ...structuredClone(rule || {}),
    base_invest_pct: baseInvestPct,
    base_reserve_pct: Number(rule?.reserve_pct || 0),
    effective_multiplier: multiplier,
    invest_pct: adjustedInvestPct,
    reserve_pct: 1 - adjustedInvestPct,
    rv_pct: Number(rule?.rv_pct || 0) * investShare,
    defensive_pct: Number(rule?.defensive_pct || 0) * investShare,
    liquidity_pct: 1 - adjustedInvestPct,
    valuation_adjustment: valuationAdjustment
  };
}

function deriveScenarioPayload(data, scenarioCode) {
  if (!scenarioCode || !SCENARIO_LABELS[scenarioCode]) return data;

  const drawdown = Number(data.drop_percent_display);
  const vix = Number(data.vix);
  const flashCrash = data.flash_crash || {};
  const manualCorrectionActive = scenarioCode === 'SC4_CORRECCION';
  const marketRotationTrigger = (drawdown <= -10) || (!Number.isNaN(vix) && vix > 30);
  const pauseActive = !manualCorrectionActive && Boolean(drawdown > -10 && !Number.isNaN(vix) && vix < 20);
  const pauseMode = {
    ...(data.pause_mode || {}),
    active: pauseActive,
    reason: pauseActive
      ? 'Drawdown insuficiente y VIX por debajo de validación'
      : manualCorrectionActive
        ? 'Pausa anulada por escenario manual de corrección'
        : 'Sin pausa',
    rule: 'No actuar si drawdown > -10% y VIX < 20, salvo Corrección manual'
  };

  const valuationAdjustment = data.valuation_adjustment || {};
  const newMoneyRule = applyValuationToNewMoneyRule(NEW_MONEY_MATRIX[scenarioCode], valuationAdjustment);

  const rotationActive = manualCorrectionActive || marketRotationTrigger;
  const blockedByFlashCrash = Boolean(flashCrash.blocking_window_active);
  const rotationPlan = {
    active: rotationActive,
    manual_correction_active: manualCorrectionActive,
    market_trigger_active: marketRotationTrigger,
    matrix: rotationActive && !blockedByFlashCrash ? structuredClone(ROTATION_MATRIX[scenarioCode]) : null,
    blocked_by_flash_crash: blockedByFlashCrash,
    intensity: {
      base: ROTATION_INTENSITY[scenarioCode],
      valuation_state: valuationAdjustment.valuation_state,
      bias: valuationAdjustment.rotation_bias,
      multiplier: valuationAdjustment.multiplier
    }
  };

  const signal = blockedByFlashCrash
    ? 'ESPERAR 48H'
    : pauseMode.active
      ? 'NO HACER NADA'
      : rotationActive
        ? 'ACTIVAR ROTACIÓN'
        : scenarioCode === 'SC3_SOBREVALORACION'
          ? 'DEFENSIVO'
          : drawdown <= -5
            ? 'PREPARAR LIQUIDEZ'
            : 'ESPERAR';

  return {
    ...data,
    scenario_code: scenarioCode,
    scenario: SCENARIO_LABELS[scenarioCode],
    scenario_source: 'screen_override',
    scenario_override_active: true,
    scenario_mode: 'screen_manual',
    phase: SCENARIO_PHASES[scenarioCode],
    signal,
    pause_mode: pauseMode,
    new_money_rule: newMoneyRule,
    rotation_plan: rotationPlan,
    rotation_intensity: rotationPlan.intensity
  };
}

const MIN_PURCHASE_EUR = 100;

function isBlockedByWeight(asset, data) {
  const currentWeights = data?.current_weights || {};
  const targetWeights = data?.target_weights || data?.operable_target_weights || {};
  const current = Number(currentWeights?.[asset]);
  const target = Number(targetWeights?.[asset]);

  if (Number.isNaN(current) || Number.isNaN(target)) return false;
  return current >= target;
}

function normalizeDistribution(distribution, data) {
  const dist = distribution || {};
  const filteredEntries = Object.entries(dist).filter(([asset, weight]) => Number(weight || 0) > 0 && !isBlockedByWeight(asset, data));
  const totalWeight = filteredEntries.reduce((sum, [, weight]) => sum + Number(weight || 0), 0);

  if (totalWeight <= 0) return {};

  return Object.fromEntries(
    filteredEntries.map(([asset, weight]) => [asset, Number(weight || 0) / totalWeight])
  );
}

function allocateWithMinimum(totalAmount, distribution, data) {
  const dist = normalizeDistribution(distribution, data);
  const entries = Object.entries(dist).map(([asset, weight]) => ({
    asset,
    weight: Number(weight || 0),
    raw_amount: totalAmount * Number(weight || 0),
  }));

  const eligible = entries.filter((item) => item.raw_amount >= MIN_PURCHASE_EUR);
  const ineligible = entries.filter((item) => item.raw_amount < MIN_PURCHASE_EUR);
  const redistributionPool = ineligible.reduce((sum, item) => sum + item.raw_amount, 0);
  const eligibleRawTotal = eligible.reduce((sum, item) => sum + item.raw_amount, 0);
  const result = {};

  entries.forEach((item) => {
    const allowed = item.raw_amount >= MIN_PURCHASE_EUR;
    const redistributed = allowed && eligibleRawTotal > 0
      ? redistributionPool * (item.raw_amount / eligibleRawTotal)
      : 0;
    const executable = allowed ? item.raw_amount + redistributed : 0;
    const blocked = allowed ? 0 : item.raw_amount;

    result[item.asset] = {
      raw_amount: item.raw_amount,
      redistributed_amount: redistributed,
      executable_amount: executable,
      blocked_amount: blocked,
      allowed,
    };
  });

  const executableTotal = Object.values(result).reduce((sum, item) => sum + Number(item.executable_amount || 0), 0);
  const blockedTotal = eligible.length > 0 ? 0 : totalAmount;

  return {
    by_asset: result,
    executable_total: executableTotal,
    blocked_total: blockedTotal,
    redistributed_total: eligible.length > 0 ? redistributionPool : 0,
    has_eligible: eligible.length > 0,
  };
}


function applyMinimumPurchaseRule(totalAmount, distribution, data) {
  return allocateWithMinimum(totalAmount, distribution, data);
}

function redistributeTopLevelBuckets(buckets) {
  const eligible = buckets.filter((item) => item.raw_amount >= MIN_PURCHASE_EUR);
  const ineligible = buckets.filter((item) => item.raw_amount < MIN_PURCHASE_EUR);
  const redistributionPool = ineligible.reduce((sum, item) => sum + item.raw_amount, 0);
  const eligibleRawTotal = eligible.reduce((sum, item) => sum + item.raw_amount, 0);

  return buckets.map((item) => {
    if (eligibleRawTotal <= 0 || item.raw_amount < MIN_PURCHASE_EUR) {
      return {
        ...item,
        effective_amount: 0,
        allowed: false,
      };
    }

    return {
      ...item,
      effective_amount: item.raw_amount + (redistributionPool * (item.raw_amount / eligibleRawTotal)),
      allowed: true,
    };
  });
}

function renderNewMoneySimulator(rule, data = null) {
  const amount = Number(document.getElementById('new-money-input')?.value || 0);
  const reserveBase = amount * Number(rule?.reserve_pct || 0);
  const rvTotalBase = amount * Number(rule?.rv_pct || 0);
  const defensiveTotalBase = amount * Number(rule?.defensive_pct || 0);
  const rvDist = rule?.rv_distribution || {};
  const defDist = rule?.defensive_distribution || {};

  const topLevel = redistributeTopLevelBuckets([
    { key: 'rv', raw_amount: rvTotalBase },
    { key: 'defensive', raw_amount: defensiveTotalBase },
  ]);

  const rvEffectiveTotal = topLevel.find((item) => item.key === 'rv')?.effective_amount || 0;
  const defensiveEffectiveTotal = topLevel.find((item) => item.key === 'defensive')?.effective_amount || 0;
  const topLevelBlocked = (rvEffectiveTotal + defensiveEffectiveTotal) > 0 ? 0 : (rvTotalBase + defensiveTotalBase);

  const rvPlan = allocateWithMinimum(rvEffectiveTotal, rvDist, data);
  const defPlan = allocateWithMinimum(defensiveEffectiveTotal, defDist, data);
  const blockedTotal = topLevelBlocked + rvPlan.blocked_total + defPlan.blocked_total;
  const executableInvestNow = rvPlan.executable_total + defPlan.executable_total;
  const reserveFinal = reserveBase + blockedTotal;

  setText('sim-new-invest-now', formatEuro(executableInvestNow));
  setText('sim-new-reserve', formatEuro(reserveFinal));
  setText('sim-new-rv-total', formatEuro(rvPlan.executable_total));
  setText('sim-new-defensive-total', formatEuro(defPlan.executable_total));
  setText('sim-new-core', formatEuro(rvPlan.by_asset.core?.executable_amount || 0));
  setText('sim-new-quality', formatEuro(rvPlan.by_asset.quality?.executable_amount || 0));
  setText('sim-new-emerging', formatEuro(rvPlan.by_asset.emerging?.executable_amount || 0));
  setText('sim-new-kopernik', formatEuro(rvPlan.by_asset.kopernik?.executable_amount || 0));
  setText('sim-new-dnca', formatEuro(defPlan.by_asset.dnca?.executable_amount || 0));
  setText('sim-new-jupiter', formatEuro(defPlan.by_asset.jupiter?.executable_amount || 0));
  setText('sim-new-blocked', formatEuro(blockedTotal));
}

function renderRotationSimulator(rotationPlan, pauseMode, data = null) {
  const amount = Number(document.getElementById('rotation-input')?.value || 0);
  const matrix = rotationPlan?.matrix || null;
  const active = !!rotationPlan?.active;
  const deploymentMultiplier = Number(rotationPlan?.deployment_multiplier || 1);
  const effectiveAmount = amount * deploymentMultiplier;

  const manualCorrectionActive = !!rotationPlan?.manual_correction_active;
  setText('rotation-state', active ? (manualCorrectionActive ? 'Corrección manual activa' : 'Trigger activo') : 'Sin señal');
  setText('rotation-action', active ? 'Comprar' : (pauseMode?.active ? 'No actuar' : 'Esperar'));
  setText('rotation-matrix', objectPercentList(matrix));

  const buy = active && matrix ? matrix : {};
  const rotationPlanMin = applyMinimumPurchaseRule(effectiveAmount, buy, data);
  setText('sim-rot-core', formatEuro(rotationPlanMin.by_asset.core?.executable_amount || 0));
  setText('sim-rot-quality', formatEuro(rotationPlanMin.by_asset.quality?.executable_amount || 0));
  setText('sim-rot-emerging', formatEuro(rotationPlanMin.by_asset.emerging?.executable_amount || 0));
  setText('sim-rot-kopernik', formatEuro(rotationPlanMin.by_asset.kopernik?.executable_amount || 0));
  setText('sim-rot-blocked', formatEuro(rotationPlanMin.blocked_total));
}

function renderList(id, arr) {
  setText(id, Array.isArray(arr) && arr.length ? arr.join(' · ') : '—');
}

const WEIGHT_DISPLAY_ORDER = [
  'core',
  'quality',
  'emerging',
  'kopernik',
  'pensions',
  'dnca',
  'jupiter',
  'dws',
  'cash_real',
  'cash_proxy_xray',
  'gold'
];

const OPERABLE_WEIGHT_ASSETS = new Set(['core', 'quality', 'emerging', 'kopernik']);

function formatWeightRatio(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${formatNumber(Number(value) * 100, 2)}%`;
}

function weightStatus(asset, current, target) {
  if (Number.isNaN(current) || Number.isNaN(target)) return 'Sin datos';
  const deltaPp = (current - target) * 100;

  if (OPERABLE_WEIGHT_ASSETS.has(asset)) {
    if (current >= target) return Math.abs(deltaPp) < 0.01 ? 'En objetivo · bloqueado' : 'Sobre objetivo · bloqueado';
    return 'Infraponderado · comprable';
  }

  if (Math.abs(deltaPp) < 0.01) return 'En objetivo';
  return deltaPp > 0 ? 'Sobre objetivo' : 'Bajo objetivo';
}

function renderWeightsComparison(data) {
  const tbody = document.getElementById('weights-table-body');
  if (!tbody) return;

  const current = data.current_weights || {};
  const target = data.target_weights || data.composition_target || {};
  const keys = Array.from(new Set([
    ...WEIGHT_DISPLAY_ORDER,
    ...Object.keys(target),
    ...Object.keys(current)
  ])).filter((key) => key in current || key in target);

  if (!keys.length) {
    tbody.innerHTML = '<tr><td colspan="5">Sin datos de pesos.</td></tr>';
    setText('weights-summary-value', 'Sin current_weights / target_weights');
    return;
  }

  let operableUnderweight = 0;
  let operableBlocked = 0;

  const rows = keys.map((asset) => {
    const c = Number(current?.[asset]);
    const t = Number(target?.[asset]);
    const hasC = !Number.isNaN(c);
    const hasT = !Number.isNaN(t);
    const delta = hasC && hasT ? (c - t) * 100 : null;
    const status = hasC && hasT ? weightStatus(asset, c, t) : 'Sin datos';

    if (OPERABLE_WEIGHT_ASSETS.has(asset) && hasC && hasT) {
      if (c >= t) operableBlocked += 1;
      else operableUnderweight += 1;
    }

    return `
      <tr>
        <td>${mapName(asset)}</td>
        <td>${hasC ? formatWeightRatio(c) : '—'}</td>
        <td>${hasT ? formatWeightRatio(t) : '—'}</td>
        <td>${delta === null ? '—' : formatNumber(delta, 2)}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
  setText('weights-summary-value', `Operativos comprables: ${operableUnderweight} · bloqueados por peso: ${operableBlocked}`);
}


function renderDashboard(data) {
  const valuation = data.valuation || {};
  const newMoneyRule = data.new_money_rule || data.new_money_rules || {};
  const rotationPlan = data.rotation_plan || {};
  const pauseMode = data.pause_mode || {};
  const rebalance = data.rebalance_rules || {};
  const riskReduction = data.risk_reduction_rules || {};
  const layers = data.capital_layers || {};
  const compositionTarget = data.composition_target || {};
  const operMap = data.operational_mapping || {};
  const rotationSources = Array.isArray(operMap.rotation_capital_sources) && operMap.rotation_capital_sources.length
    ? operMap.rotation_capital_sources.map(mapName).join(' · ')
    : '—';

  setText('signal-current', `${data.scenario || '—'} · ${data.phase || '—'} · ${data.signal || '—'}`);
  setText('signal-summary', `Actualizado ${data.updated_at || data.timestamp || '—'} · Datos ${formatFreshness(data.data_freshness)}`);

  setText('nav-value', formatNumber(data.nav, 2));
  setText('max52-value', formatNumber(data.max52, 2));
  setText('drawdown-value', formatPercentNumber(data.drop_percent_display, 1));
  setText('drawdown-label', drawdownLabel(data.drop_percent_display));
  setText('vix-value', formatNumber(data.vix, 2));
  setText('next-trigger-value', data.next_trigger || '—');
  setText('freshness-value', formatFreshness(data.data_freshness));

  const scenarioModeLabel = data.scenario_source === 'screen_override'
    ? 'Manual pantalla'
    : data.scenario_override_active ? 'Manual' : 'Automático';
  setText('scenario-value', `${data.scenario || '—'} (${scenarioModeLabel})`);
  setText('scenario-code-value', `${data.scenario_code || '—'} · ${data.scenario_source || '—'}`);
  setText('phase-value', data.phase || '—');
  setText('action-value', data.signal || '—');
  setText('pause-value', pauseMode.active ? 'Sí' : 'No');
  setText('pause-reason-value', pauseMode.reason || '—');
  setText('blocked-value', data.decision_status?.blocked ? 'Sí' : 'No');
  setText('warnings-value', (data.decision_status?.warnings || []).length ? data.decision_status.warnings.join(' · ') : 'Sin warnings');
  setText('updated-at-value', data.updated_at || data.timestamp || '—');

  setText('macro-signal-value', data.macro_signal || '—');
  setText('cape-value', formatNumber(data.cape, 2));
  setText('cape-date-value', formatDate(data.cape_date));
  setText('pmi-value', formatNumber(data.pmi, 2));
  setText('pmi-date-value', formatDate(data.pmi_date));
  setText('lei-value', formatNumber(data.lei?.value, 2));
  setText('lei-3m-ago-value', `3m: ${formatNumber(data.lei?.value_3m_ago, 2)}`);
  setText('lei-trend-value', `tendencia: ${formatNumber(data.lei?.trend_3m, 2)}`);
  setText('lei-date-value', formatDate(data.lei?.date));

  setText('valuation-cape', `${formatNumber(valuation.cape_sp500, 2)} (${valuation.cape_state || '—'})`);
  setText('valuation-per', `${formatNumber(valuation.per_global, 2)} (${valuation.per_state || '—'})`);
  setText('valuation-state', valuation.composite_state || '—');
  setText('valuation-date', formatDate(data.per_global_date));
  setHref('per-source-link', data.sources?.per_global);

  setText('new-money-rule', `${percentText(newMoneyRule.invest_pct)} invertir / ${percentText(newMoneyRule.reserve_pct)} liquidez`);
  setText('new-money-destinations', `RV ${percentText(newMoneyRule.rv_pct)} · Defensivo ${percentText(newMoneyRule.defensive_pct)} · Liquidez operativa ${percentText(newMoneyRule.liquidity_pct)}`);
  setText('new-money-rv-mix', objectPercentList(newMoneyRule.rv_distribution));
  setText('new-money-defensive-mix', objectPercentList(newMoneyRule.defensive_distribution));
  setText('new-money-note', newMoneyRule.note || 'Regla calculada en backend.');

  setText('rotation-active-value', rotationPlan.active ? 'Sí' : 'No');
  setText('rotation-source-value', rotationPlan.active ? rotationSources : 'Sin activación');
  setText('rotation-plan-value', objectPercentList(rotationPlan.matrix));
  setText('rotation-executed-value', (data.rotation_state?.executed_levels || []).length ? data.rotation_state.executed_levels.join(' · ') : 'Sin ejecuciones');

  renderList('allowed-assets', data.allowed_assets);
  renderList('blocked-assets', data.blocked_assets);
  renderList('checklist-value', data.operational_checklist);
  setText('capital-layers-value', `Estructural: ${layers.structural || '—'} · Táctica: ${layers.tactical || '—'} · Flujos: ${layers.flows || '—'}`);

  const liquidityAssets = Array.isArray(operMap.liquidity_assets) && operMap.liquidity_assets.length
    ? operMap.liquidity_assets.map(mapName).join(' + ')
    : '—';


  const cashPolicy = data.cash_policy
    ? `CAPE alto ${data.cash_policy.high_cape_target} · medio ${data.cash_policy.medium_cape_target} · bajo ${data.cash_policy.low_cape_target}`
    : '—';

  const xrayCashProxy = operMap.xray_cash_proxy || '—';

  setText('liquidity-summary-value', `Liquidez operativa: DWS 15% + cash real 2,9% · ${xrayCashProxy} solo proxy X-Ray · Política: ${cashPolicy}`);

  setText('target-composition-value', objectTargetList(compositionTarget));
  setText('purchase-priority-value', (data.priority_of_purchase || []).join(' → ') || '—');
  setText('limits-value', data.system_limits ? `RV máx ${percentText(data.system_limits.rv_max)} · Liquidez ${percentText(data.system_limits.cash_min)}-${percentText(data.system_limits.cash_max)} · Oro máx ${percentText(data.system_limits.gold_max)} · Emergentes máx ${percentText(data.system_limits.emerging_max)}` : '—');

  setText('target-summary-value', 'RV 60–62% · DNCA objetivo 12% / límite 15% · Jupiter objetivo 7% / límite 8% · Liquidez 15–18% · Oro 2,5%');
  setText('rotation-summary-value', `Trigger ${data.rotation_trigger || 'drawdown ≤ -10% / VIX > 30'} · Intensidad ${data.rotation_intensity ? data.rotation_intensity.base || '—' : '—'}`);
  setText('hard-rules-summary-value', 'No vender en caídas · No usar oro · No comprar DNCA en caídas · No mezclar capas · Groupama no es operativo');


  setText('rebalance-summary-value', rebalance ? `±${rebalance.deviation_tolerance_pp || '—'} pp · mensual` : '—');
  setText('rebalance-tolerances-value', rebalance.tolerances ? Object.entries(rebalance.tolerances).map(([k, v]) => `${mapName(k)} ±${v} pp`).join(' · ') : '—');
  setText('rebalance-scope-value', rebalance.only_operable_assets ? 'Solo activos operativos' : 'Todos los activos');

  renderList('hard-rules-value', data.hard_rules);
  setText('rotation-intensity-value', data.rotation_intensity ? `${data.rotation_intensity.base || '—'}${data.rotation_intensity.multiplier ? ` · x${data.rotation_intensity.multiplier}` : ''}` : '—');
  setText('valuation-adjustment-value', data.valuation_adjustment ? `${data.valuation_adjustment.valuation_state || '—'} · sesgo ${data.valuation_adjustment.rotation_bias || '—'}` : '—');
  setText('flash-crash-value', data.flash_crash?.active ? (data.flash_crash?.blocking_window_active ? 'Activo · bloqueo 48h' : 'Activo') : 'No');
  setText('flash-crash-wait-value', data.flash_crash?.wait_until || '—');
  setText('current-weights-value', formatWeightMap(data.current_weights));
  setText('operable-targets-value', formatWeightMap(data.operable_target_weights));
  renderWeightsComparison(data);
  setText('deviations-value', formatDeviationMap(data.deviations_pp));
  setText('blocked-reasons-value', formatBlockedReasons(data.blocked_reasons_by_asset));
  setText('risk-reduction-value', riskReduction.action || '—');
  setText('risk-reduction-active-value', riskReduction.active_now ? 'Sí' : 'No');

  const storedOverride = getStoredScenarioOverride();
  setText('scenario-screen-status', storedOverride
    ? `Modo actual: manual en pantalla · ${SCENARIO_LABELS[storedOverride] || storedOverride}`
    : 'Modo actual: automático');

  const newMoneyInput = document.getElementById('new-money-input');
  const rotationInput = document.getElementById('rotation-input');

  if (newMoneyInput) {
    newMoneyInput.oninput = () => renderNewMoneySimulator(newMoneyRule, data);
  }

  if (rotationInput) {
    rotationInput.oninput = () => renderRotationSimulator(rotationPlan, pauseMode, data);
  }

  renderNewMoneySimulator(newMoneyRule, data);
  renderRotationSimulator(rotationPlan, pauseMode, data);
}

async function loadDashboard() {
  const baseData = await fetchJson('./data/latest.json');
  const scenarioOverride = getStoredScenarioOverride();
  const effectiveData = deriveScenarioPayload(baseData, scenarioOverride);
  renderDashboard(effectiveData);
}

bindScenarioControls(() => {
  loadDashboard().catch(err => {
    console.error(err);
    setText('signal-current', 'Error cargando dashboard');
    setText('signal-summary', err.message);
  });
});

loadDashboard().catch(err => {
  console.error(err);
  setText('signal-current', 'Error cargando dashboard');
  setText('signal-summary', err.message);
});
