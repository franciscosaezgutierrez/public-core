async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Error cargando ${path}`);
  return await res.json();
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals).replace('.', ',');
}

function formatPercentNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${formatNumber(value, decimals)}%`;
}

function percentText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value) * 100)}%`;
}

function formatEuro(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${formatNumber(value, 2)} €`;
}

function formatDate(value) {
  return value || "—";
}

function formatFreshness(value) {
  if (!value) return "—";
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
    pensions: 'Pensiones'
  };
  return names[code] || code;
}

function objectPercentList(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, v]) => `${mapName(k)} ${percentText(v)}`).join(' · ');
}

function objectTargetList(obj) {
  if (!obj || !Object.keys(obj).length) return '—';
  return Object.entries(obj).map(([k, v]) => `${k} ${percentText(v)}`).join(' · ');
}

function drawdownLabel(dd) {
  const n = Number(dd);
  if (Number.isNaN(n)) return '—';
  if (n > -3) return 'máximos prácticos';
  if (n > -7) return 'corrección leve';
  if (n > -10) return 'pre-trigger';
  return 'trigger';
}

function renderNewMoneySimulator(rule) {
  const amount = Number(document.getElementById('new-money-input')?.value || 0);
  const investNow = amount * Number(rule?.invest_pct || 0);
  const reserve = amount * Number(rule?.reserve_pct || 0);
  const rvTotal = amount * Number(rule?.rv_pct || 0);
  const defensiveTotal = amount * Number(rule?.defensive_pct || 0);
  const rvDist = rule?.rv_distribution || {};
  const defDist = rule?.defensive_distribution || {};

  setText('sim-new-invest-now', formatEuro(investNow));
  setText('sim-new-reserve', formatEuro(reserve));
  setText('sim-new-rv-total', formatEuro(rvTotal));
  setText('sim-new-defensive-total', formatEuro(defensiveTotal));
  setText('sim-new-core', formatEuro(rvTotal * Number(rvDist.core || 0)));
  setText('sim-new-quality', formatEuro(rvTotal * Number(rvDist.quality || 0)));
  setText('sim-new-emerging', formatEuro(rvTotal * Number(rvDist.emerging || 0)));
  setText('sim-new-kopernik', formatEuro(rvTotal * Number(rvDist.kopernik || 0)));
  setText('sim-new-dnca', formatEuro(defensiveTotal * Number(defDist.dnca || 0)));
  setText('sim-new-jupiter', formatEuro(defensiveTotal * Number(defDist.jupiter || 0)));
}

function renderRotationSimulator(rotationPlan, pauseMode) {
  const amount = Number(document.getElementById('rotation-input')?.value || 0);
  const matrix = rotationPlan?.matrix || null;
  const active = !!rotationPlan?.active;

  setText('rotation-state', active ? 'Trigger activo' : 'Sin señal');
  setText('rotation-action', active ? 'Comprar' : (pauseMode?.active ? 'No actuar' : 'Esperar'));
  setText('rotation-matrix', objectPercentList(matrix));

  const buy = active && matrix ? matrix : {};
  setText('sim-rot-core', formatEuro(amount * Number(buy.core || 0)));
  setText('sim-rot-quality', formatEuro(amount * Number(buy.quality || 0)));
  setText('sim-rot-emerging', formatEuro(amount * Number(buy.emerging || 0)));
  setText('sim-rot-kopernik', formatEuro(amount * Number(buy.kopernik || 0)));
}

function renderList(id, arr) {
  setText(id, Array.isArray(arr) && arr.length ? arr.join(' · ') : '—');
}

async function loadDashboard() {
  const data = await fetchJson('./data/latest.json');

  const valuation = data.valuation || {};
  const newMoneyRule = data.new_money_rule || data.new_money_rules || {};
  const rotationPlan = data.rotation_plan || {};
  const pauseMode = data.pause_mode || {};
  const rebalance = data.rebalance_rules || {};
  const riskReduction = data.risk_reduction_rules || {};
  const layers = data.capital_layers || {};
  const compositionTarget = data.composition_target || {};
  const operMap = data.operational_mapping || {};

  setText('signal-current', `${data.scenario || '—'} · ${data.phase || '—'} · ${data.signal || '—'}`);
  setText('signal-summary', data.macro_signal || '—');

  setText('nav-value', formatNumber(data.nav, 4));
  setText('max52-value', formatNumber(data.max52, 4));
  setText('drawdown-value', formatPercentNumber(data.drop_percent_display, 1));
  setText('drawdown-label', drawdownLabel(data.drop_percent_display));
  setText('vix-value', formatNumber(data.vix, 2));
  setText('next-trigger-value', data.next_trigger || '—');
  setText('freshness-value', formatFreshness(data.data_freshness));

  setText('scenario-value', data.scenario || '—');
  setText('scenario-code-value', data.scenario_code || '—');
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

  setText('new-money-rule', `${percentText(newMoneyRule.invest_pct)} invertir / ${percentText(newMoneyRule.reserve_pct)} reservar`);
  setText('new-money-destinations', `RV ${percentText(newMoneyRule.rv_pct)} · Defensivo ${percentText(newMoneyRule.defensive_pct)} · Liquidez ${percentText(newMoneyRule.liquidity_pct)}`);
  setText('new-money-rv-mix', objectPercentList(newMoneyRule.rv_distribution));
  setText('new-money-defensive-mix', objectPercentList(newMoneyRule.defensive_distribution));
  setText('new-money-note', newMoneyRule.note || 'Regla calculada en backend.');

  setText('rotation-active-value', rotationPlan.active ? 'Sí' : 'No');
  setText('rotation-source-value', rotationPlan.active ? 'Liquidez / DNCA / Jupiter si necesario' : 'Sin activación');
  setText('rotation-plan-value', objectPercentList(rotationPlan.matrix));
  setText('rotation-executed-value', (data.rotation_state?.executed_levels || []).length ? data.rotation_state.executed_levels.join(' · ') : 'Sin ejecuciones');

  renderList('allowed-assets', data.allowed_assets);
  renderList('blocked-assets', data.blocked_assets);
  renderList('checklist-value', data.operational_checklist);
  setText('cash-policy-value', data.cash_policy ? `${data.cash_policy.high_cape_target} / ${data.cash_policy.medium_cape_target} / ${data.cash_policy.low_cape_target}` : '—');

  setText('capital-layers-value', `Estructural: ${layers.structural || '—'} · Táctica: ${layers.tactical || '—'} · Flujos: ${layers.flows || '—'}`);
  setText('capital-do-not-mix-value', layers.do_not_mix ? 'Sí' : 'No');
  setText('operable-universe-value', operMap.operable_universe ? Object.entries(operMap.operable_universe).map(([k, v]) => `${mapName(k)} = ${v}`).join(' · ') : '—');
  renderList('non-operable-assets-value', operMap.non_operable_assets);

  setText('target-composition-value', objectTargetList(compositionTarget));
  setText('purchase-priority-value', (data.priority_of_purchase || []).join(' → ') || '—');
  setText('limits-value', data.system_limits ? `RV máx ${percentText(data.system_limits.rv_max)} · Liquidez ${percentText(data.system_limits.cash_min)}-${percentText(data.system_limits.cash_max)} · Oro máx ${percentText(data.system_limits.gold_max)} · Emergentes máx ${percentText(data.system_limits.emerging_max)}` : '—');

  setText('rebalance-summary-value', rebalance ? `±${rebalance.deviation_tolerance_pp || '—'} pp · mensual` : '—');
  setText('rebalance-tolerances-value', rebalance.tolerances ? Object.entries(rebalance.tolerances).map(([k, v]) => `${mapName(k)} ±${v} pp`).join(' · ') : '—');
  setText('rebalance-scope-value', rebalance.only_operable_assets ? 'Solo activos operativos' : 'Todos los activos');

  renderList('hard-rules-value', data.hard_rules);
  setText('risk-reduction-value', riskReduction.action || '—');
  setText('risk-reduction-active-value', riskReduction.active_now ? 'Sí' : 'No');

  renderNewMoneySimulator(newMoneyRule);
  renderRotationSimulator(rotationPlan, pauseMode);

  document.getElementById('new-money-input')?.addEventListener('input', () => renderNewMoneySimulator(newMoneyRule));
  document.getElementById('rotation-input')?.addEventListener('input', () => renderRotationSimulator(rotationPlan, pauseMode));
}

loadDashboard().catch(err => {
  console.error(err);
  setText('signal-current', 'Error cargando dashboard');
  setText('signal-summary', err.message);
});
