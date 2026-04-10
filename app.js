async function loadData(){
 const res = await fetch('./data/latest.json');
 return await res.json();
}

function pct(x){return (x*100).toFixed(1)+'%';}

function getLevel(drop){
 if(drop<=-0.30)return -0.30;
 if(drop<=-0.25)return -0.25;
 if(drop<=-0.20)return -0.20;
 if(drop<=-0.15)return -0.15;
 if(drop<=-0.10)return -0.10;
 return null;
}

function validate(data){
 let issues=[];
 if(data.weights.rv>0.7) issues.push("RV > 70%");
 if(data.weights.cash<0.1) issues.push("Liquidez < 10%");
 return {ok:issues.length===0,issues};
}

function explain(data){
 return `CAPE ${data.cape} | PMI ${data.pmi} | LEI ${data.lei} | VIX ${data.vix}`;
}

async function runRotation(){
 const data=await loadData();
 const dws=Number(document.getElementById('rotationDwsInput').value||0);
 const dnca=Number(document.getElementById('rotationDncaInput').value||0);
 const minCash=Number(document.getElementById('rotationMinCashInput').value||0);

 const level=getLevel(data.drop_pct);

 if(!level){
  document.getElementById('rotationOutput').innerHTML='Sin trigger';
  return;
 }

 const usable=Math.max(0,(dws+dnca)-minCash);
 const rotate=usable*0.3;

 document.getElementById('rotationOutput').innerHTML=
 `Tramo ${pct(level)}<br>Capital usable €${usable.toFixed(0)}<br>Rotar €${rotate.toFixed(0)}`;
}

loadData().then(d=>{
 document.getElementById('scenario').innerText=d.scenario;
 document.getElementById('signal').innerText=d.signal;

 const v=validate(d);
 document.getElementById('limitsStatus').innerText=v.ok?"OK":"ERROR";
 document.getElementById('limitsIssues').innerText=v.issues.join(", ")||"—";

 document.getElementById('why').innerText=explain(d);
});
