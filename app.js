function euro(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

function pctFromDecimal(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES');
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('es-ES');
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const cols = line.split(',');
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
    el.textContent = value;
  }
}

function signalClass(signal) {
  if (signal === 'COMPRAR FUERTE') return 'signal-comprar-fuerte';
  if (signal === 'COMPRAR') return 'signal-comprar';
  if (signal === 'VIGILAR VIX') return 'signal-vigilar';
  if (signal === 'PREPARAR LIQUIDEZ') return 'signal-preparar';
  return 'signal-esperar';
}

function buildLevelLine(length, value) {
  return Array.from({ length }, () => value);
}

async function loadDashboard() {
  const latest = await fetch('./data/latest.json').then(r => r.json());
  const historyText = await fetch('./data/nav_history.csv').then(r => r.text());
  const history = parseCsv(historyText);

  setText('navValue', euro(latest.nav));
  setText('navDate', formatDate(latest.nav_date || latest.timestamp));
  setText('maxValue', euro(latest.max52));
  setText('dropValue', pctFromDecimal(latest.drop_pct));
  setText('vixValue', latest.vix ?? '—');

  setText('scenarioValue', latest.scenario ?? '—');
  setText('phaseValue', latest.phase ?? '—');
  setText('entryValue', latest.entry_label ?? '—');
  setText('scoreValue', latest.score ?? '—');
  setText('scoreText', latest.score_text ?? '—');

  setText('scenarioText', latest.scenario ?? '—');
  setText('scenarioPill', latest.scenario ?? '—');
  setText('actionValue', latest.signal ?? '—');
  setText('nextTrigger', latest.next_trigger ?? '—');
  setText('updatedText', formatDateTime(latest.timestamp));

  setText('allocRv', latest.allocations?.rv ?? '—');
  setText('allocBonds', latest.allocations?.bonos ?? '—');
  setText('allocCash', latest.allocations?.liquidez ?? '—');
  setText('allocGold', latest.allocations?.oro ?? '—');

  const signalBadge = document.getElementById('signalBadge');
  if (signalBadge) {
    signalBadge.textContent = latest.signal ?? '—';
    signalBadge.className = signalClass(latest.signal ?? '');
  }

  const chartEl = document.getElementById('navChart');
  if (!chartEl) return;

  const labels = history.map(r => new Date(r.timestamp).toLocaleDateString('es-ES'));
  const navValues = history.map(r => Number(r.nav));
  const maxValues = history.map(r => Number(r.max52));

  const level10 = buildLevelLine(labels.length, latest.max52 * 0.90);
  const level15 = buildLevelLine(labels.length, latest.max52 * 0.85);
  const level20 = buildLevelLine(labels.length, latest.max52 * 0.80);
  const level25 = buildLevelLine(labels.length, latest.max52 * 0.75);
  const level30 = buildLevelLine(labels.length, latest.max52 * 0.70);

  new Chart(chartEl, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'NAV', data: navValues, borderWidth: 2.5, tension: 0.25 },
        { label: 'Máx. 52 semanas', data: maxValues, borderDash: [6, 6], borderWidth: 1.5, tension: 0 },
        { label: 'Nivel -10%', data: level10, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: 'Nivel -15%', data: level15, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: 'Nivel -20%', data: level20, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: 'Nivel -25%', data: level25, borderDash: [4, 4], borderWidth: 1, tension: 0 },
        { label: 'Nivel -30%', data: level30, borderDash: [4, 4], borderWidth: 1, tension: 0 }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#dce6f8' } }
      },
      scales: {
        x: {
          ticks: { color: '#8ea3c7' },
          grid: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          ticks: { color: '#8ea3c7' },
          grid: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  });
}

loadDashboard().catch(err => {
  const badge = document.getElementById('signalBadge');
  if (badge) {
    badge.textContent = 'Error';
    badge.className = 'signal-esperar';
  }

  const scenarioText = document.getElementById('scenarioText');
  if (scenarioText) {
    scenarioText.textContent = err.message;
  }
});
