const BUY_TRIGGER = 50.74;
function euro(value){return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(value);}
function pct(value){return new Intl.NumberFormat('es-ES',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);}
function parseCsv(text){const lines=text.trim().split(/\r?\n/);const headers=lines[0].split(',');return lines.slice(1).map(line=>{const cols=line.split(',');const row={};headers.forEach((h,i)=>row[h]=cols[i]);return row;});}
function signalClass(signal){if(signal==='COMPRAR') return 'signal-comprar'; if(signal==='PREALERTA') return 'signal-prealerta'; if(signal.includes('CRISIS')) return 'signal-crisis'; return 'signal-esperar';}
async function loadDashboard(){
  const latest=await fetch('./data/latest.json').then(r=>r.json());
  const historyText=await fetch('./data/nav_history.csv').then(r=>r.text());
  const history=parseCsv(historyText);
  document.getElementById('navValue').textContent=euro(latest.nav);
  document.getElementById('maxValue').textContent=euro(latest.max52);
  document.getElementById('dropValue').textContent=pct(latest.drop_pct);
  document.getElementById('scenarioText').textContent=latest.scenario;
  document.getElementById('scenarioPill').textContent=latest.scenario;
  document.getElementById('actionValue').textContent=latest.signal==='ESPERAR'?'No aportar':latest.signal;
  document.getElementById('updatedText').textContent='Actualización: '+new Date(latest.timestamp).toLocaleString('es-ES');
  const signalBadge=document.getElementById('signalBadge');
  signalBadge.textContent=latest.signal;
  signalBadge.className=signalClass(latest.signal);
  const distance=latest.nav-BUY_TRIGGER;
  document.getElementById('triggerDistance').textContent=distance>0?`${euro(distance)} por encima`:`${euro(Math.abs(distance))} por debajo`;
  const labels=history.map(r=>new Date(r.timestamp).toLocaleDateString('es-ES'));
  const values=history.map(r=>Number(r.nav));
  const maxLine=history.map(r=>Number(r.max52));
  new Chart(document.getElementById('navChart'),{
    type:'line',
    data:{labels,datasets:[{label:'NAV',data:values,borderWidth:2.5,tension:0.25},{label:'Máx. 52 semanas',data:maxLine,borderDash:[6,6],borderWidth:1.5,tension:0}]},
    options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#dce6f8'}}},scales:{x:{ticks:{color:'#8ea3c7'},grid:{color:'rgba(255,255,255,0.06)'}},y:{ticks:{color:'#8ea3c7'},grid:{color:'rgba(255,255,255,0.06)'}}}}
  });
}
loadDashboard().catch(err=>{document.getElementById('signalBadge').textContent='Error';document.getElementById('scenarioText').textContent=err.message;});
