async function loadData() {
  const res = await fetch("latest.json");
  return await res.json();
}

function pct(x) {
  return (x * 100).toFixed(1) + "%";
}

function validateLimits(data) {
  const issues = [];

  if (data.weights.rv > data.system_limits.rv_max) {
    issues.push("RV excedida");
  }

  if (data.weights.cash < data.system_limits.cash_min) {
    issues.push("Liquidez insuficiente");
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

function explain(data) {
  return `
    CAPE: ${data.cape}<br>
    PMI: ${data.pmi}<br>
    LEI: ${data.lei}<br>
    Drawdown: ${pct(data.drop_pct)}<br>
    VIX: ${data.vix}
  `;
}

function freshness(data) {
  return `
    CAPE: ${data.data_freshness.cape_days}d<br>
    PMI: ${data.data_freshness.pmi_days}d<br>
    LEI: ${data.data_freshness.lei_days}d
  `;
}

function getLevel(drop) {
  if (drop <= -0.30) return -0.30;
  if (drop <= -0.25) return -0.25;
  if (drop <= -0.20) return -0.20;
  if (drop <= -0.15) return -0.15;
  if (drop <= -0.10) return -0.10;
  return null;
}

function runRotation() {
  const dws = Number(document.getElementById("dws").value);
  const dnca = Number(document.getElementById("dnca").value);
  const minCash = Number(document.getElementById("minCash").value);

  loadData().then(data => {
    const level = getLevel(data.drop_pct);

    if (!level) {
      document.getElementById("rotationResult").innerHTML = "No hay trigger";
      return;
    }

    const usable = Math.max(0, (dws + dnca) - minCash);
    const rotate = usable * 0.3;

    document.getElementById("rotationResult").innerHTML =
      `Tramo: ${pct(level)}<br>Rotar: €${rotate.toFixed(0)}`;
  });
}

loadData().then(data => {

  document.getElementById("scenario").innerText = data.scenario;
  document.getElementById("signal").innerText = data.signal;

  const limits = validateLimits(data);

  document.getElementById("limitsStatus").innerText =
    limits.valid ? "OK" : "ERROR";

  document.getElementById("limitsIssues").innerText =
    limits.issues.join(", ") || "—";

  document.getElementById("why").innerHTML = explain(data);
  document.getElementById("freshness").innerHTML = freshness(data);

});
