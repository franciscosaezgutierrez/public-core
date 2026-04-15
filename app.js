function formatDate(value) {
  return value || '—';
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(decimals).replace('.', ',');
}

function formatEuro(value) {
  return `${formatNumber(value, 2)} €`;
}

function formatFreshness(value) {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.status || '—';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (el && href) el.href = href;
}

function getScenarioForView(auto, override) {
  if (override === 'AUTO') {
    return {
      scenario: auto.scenario || '—',
      phase: auto.phase || '—',
      action: auto.signal || '—',
      pauseActive: !!auto.pause_mode?.active,
      pauseReason: auto.pause_mode?.reason || '—',
      valuationCode: auto.valuation?.composite_code || 'INDETERMINADO',
      reason: auto.scenario_reason || '—'
    };
  }

  const map = {
    SC1: {
      scenario: auto.structural_targets?.SC1?.label || '🟢 Escenario 1 · Expansión',
      phase: 'Manual',
      action: 'RIESGO ALTO',
      pauseActive: false,
      pauseReason: 'Override manual',
      valuationCode: 'BARATO',
      reason: 'Override manual'
    },
    SC2: {
      scenario: auto.structural_targets?.SC2?.label || '🟡 Escenario 2 · Desaceleración',
      phase: 'Manual',
      action: 'EQUILIBRIO',
      pauseActive: false,
      pauseReason: 'Override manual',
      valuationCode: 'NEUTRAL',
      reason: 'Override manual'
    },
    SC3: {
      scenario: auto.structural_targets?.SC3?.label || '🟠 Escenario 3 · Sobrevaloración',
      phase: 'Manual',
      action: 'NO ACTUAR',
      pauseActive: true,
      pauseReason: 'Override manual',
      valuationCode: auto.valuation?.composite_code || 'CARO_MODERADO',
      reason: 'Override manual'
    },
    SC4: {
      scenario: auto.structural_targets?.SC4?.label || '🔴 Escenario 4 · Corrección',
      phase: 'Manual',
      action: 'ACTIVAR ROTACIÓN',
      pauseActive: false,
      pauseReason: 'Override manual',
      valuationCode: auto.valuation?.composite_code || 'CARO_MODERADO',
      reason: 'Override manual'
    }
  };

  return map[override] || map.SC3;
}

function getNewMoneyRuleData(auto, valuationCode) {
  if (valuationCode === auto.valuation?.composite_code && auto.new_money_rule) {
    return auto.new_money_rule;
  }

  const rules = {
    MUY_CARO: { rule: '50% invertir / 50% reservar', invest: 0.50, reserve: 0.50, note: 'Mercado muy caro. Prudencia máxima.' },
    CARO_MODERADO: { rule: '60% invertir / 40% reservar', invest: 0.60, reserve: 0.40, note: 'Mercado caro, pero no extremo globalmente.' },
    CARO_DUDOSO: { rule: '60% invertir / 40% reservar', invest: 0.60, reserve: 0.40, note: 'CAPE alto sin confirmación fuerte del PER.' },
    NEUTRAL: { rule: '70% invertir / 30% reservar', invest: 0.70, reserve: 0.30, note: 'Valoración razonable.' },
    BARATO: { rule: '90% invertir / 10% reservar', invest: 0.90, reserve: 0.10, note: 'Valoración favorable.' },
    INDETERMINADO: { rule: '50% invertir / 50% reservar', invest: 0.50, reserve: 0.50, note: 'Datos insuficientes. Se aplica prudencia.' }
  };

  const selected = rules[valuationCode] || rules.INDETERMINADO;
  return {
    ...selected,
    destination: ['Vanguard Global Stock', 'Robeco BP Global Premium'],
    reserve_destination: 'Liquidez'
  };
}

function renderNewMoneySimulator(ruleData) {
  const amount = Number(document.getElementById('new-money-input')?.value || 0);
  const investNow = amount * Number(ruleData.invest || 0);
  const reserve = amount * Number(ruleData.reserve || 0);
  const core = investNow * 0.70;
  const quality = investNow * 0.30;

  setText('sim-new-invest-now', formatEuro(investNow));
  setText('sim-new-reserve', formatEuro(reserve));
  setText('sim-new-core', formatEuro(core));
  setText('sim-new-quality', formatEuro(quality));
}

function renderRotationSimulator(auto, override) {
  const amount = Number(document.getElementById('rotation-input')?.value || 0);
  let state = auto.rotation_state?.trigger_active ? 'Trigger activo' : auto.rotation_state?.pretrigger ? 'Pre-trigger' : 'Sin señal';
  let action = auto.rotation_state?.action || 'No actuar';

  if (override === 'SC4') {
    state = 'Trigger activo (manual)';
    action = 'Comprar';
  }

  let core = 0;
  let quality = 0;
  let emerging = 0;

  if (action.toUpperCase().includes('COMPRAR')) {
    core = amount * 0.50;
    quality = amount * 0.30;
    emerging = amount * 0.20;
  }

  setText('rotation-state', state);
  setText('rotation-action', action);
  setText('sim-rot-core', formatEuro(core));
  setText('sim-rot-quality', formatEuro(quality));
  setText('sim-rot-emerging', formatEuro(emerging));
}

async function loadDashboard() {
  const auto = await fetch('./data/latest.json', { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('Error cargando latest.json');
    return r.json();
  });

  function renderAll() {
    const override = document.getElementById('scenario-select')?.value || 'AUTO';
    const scenarioData = getScenarioForView(auto, override);
    const newMoneyRule = getNewMoneyRuleData(auto, scenarioData.valuationCode);
    const warnings = auto.decision_status?.warnings || [];
    const reasons = auto.decision_status?.reasons || [];

    setText('signal-current', `${scenarioData.scenario} · ${scenarioData.phase} · ${scenarioData.action}`);
    setText('signal-summary', auto.macro_signal || '—');

    setText('nav-value', formatNumber(auto.nav, 2));
    setText('max52-value', formatNumber(auto.max52, 2));
    setText('drawdown-value', `${formatNumber(auto.drop_percent_display, 2)}%`);
    setText('drawdown-label', auto.entry_label || '—');
    setText('vix-value', formatNumber(auto.vix, 2));
    setText('next-trigger-value', auto.next_trigger || '—');
    setText('freshness-value', formatFreshness(auto.data_freshness));

    setText('scenario-value', auto.scenario || '—');
    setText('scenario-override-status', override === 'AUTO' ? 'Desactivado' : override);
    setText('phase-value', scenarioData.phase);
    setText('action-value', scenarioData.action);
    setText('pause-value', scenarioData.pauseActive ? 'Sí' : 'No');
    setText('pause-reason-value', scenarioData.pauseReason);
    setText('blocked-value', auto.decision_status?.blocked ? 'Sí' : 'No');
    setText('warnings-value', warnings.length ? warnings.join(' · ') : reasons.length ? reasons.join(' · ') : 'Sin warnings');
    setText('updated-at-value', auto.updated_at || auto.timestamp || '—');

    setText('macro-signal-value', auto.macro_signal || '—');
    setText('cape-value', formatNumber(auto.cape, 2));
    setText('cape-date-value', formatDate(auto.cape_date));
    setText('pmi-value', formatNumber(auto.pmi, 2));
    setText('pmi-date-value', formatDate(auto.pmi_date));
    setText('lei-value', formatNumber(auto.lei?.value, 2));
    setText('lei-3m-ago-value', `3m: ${formatNumber(auto.lei?.value_3m_ago, 2)}`);
    setText('lei-trend-value', `tendencia: ${formatNumber(auto.lei?.trend_3m, 2)}`);
    setText('lei-date-value', formatDate(auto.lei?.date));

    setText('valuation-cape', `${formatNumber(auto.valuation?.cape_sp500, 2)} (${auto.valuation?.cape_state || '—'})`);
    setText('valuation-per', `${formatNumber(auto.valuation?.per_global, 2)} (${auto.valuation?.per_global_state || '—'})`);
    setText('valuation-state', auto.valuation?.composite_label || '—');
    setText('valuation-date', formatDate(auto.valuation?.per_global_date));
    setHref('per-source-link', auto.valuation?.per_global_source);

    setText('new-money-rule', newMoneyRule.rule || '—');
    setText('new-money-note', newMoneyRule.note || '—');

    renderNewMoneySimulator(newMoneyRule);
    renderRotationSimulator(auto, override);
  }

  renderAll();
  document.getElementById('new-money-input')?.addEventListener('input', renderAll);
  document.getElementById('rotation-input')?.addEventListener('input', renderAll);
  document.getElementById('scenario-select')?.addEventListener('change', renderAll);
}

loadDashboard().catch(err => {
  console.error(err);
  setText('signal-current', 'Error cargando dashboard');
  setText('signal-summary', err.message);
});
