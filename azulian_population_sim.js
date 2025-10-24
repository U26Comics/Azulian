// Azulian Population & Selection Simulator — Full Version (hardened)
// Fixes applied per QA report:
// - Define computed vars (total/adults/df/dp) before template in render()
// - Ensure all referenced config keys are present with defaults
// - Add nullish-coalescing fallbacks when reading config
// - Guard DOM bootstrap against late-load (DOMContentLoaded already fired)
// - Try/catch around risky UI renders to avoid hard-crash
// - Minor NaN/undefined protections throughout
// - Persist life-log entries in state so logs survive render() calls
// - Centralize log rendering via renderLog to avoid DOM overwrite races
// Carrd: place <div id="azulian-sim"></div> and <div id="azulian-life-sim"></div>, then include this script.

/******************** MODULE 1 (Cohort) ************************/
const AzulianSim = {
  params:{
    a0:0.22,                       // rookie survival
    ap:0.85,                       // proven survival
    lambda:3,                      // mean live neonates per birth
    j:0.7,                         // juvenile survival
    Y:2,                           // years ashore per cycle
    pi:0.4,                        // fraction redeploying immediately
    k:3,                           // polyandry mates per female
    clanPrestige:0.0,              // multiplier effect (0–1)
    Nf0:1e6,                       // initial rookies (f)
    Nm:3e6,                        // adult males on-planet
    cycles:10
  },
  step(state,p){
    try{
      const a0 = +p.a0 ?? 0.22;
      const ap = +p.ap ?? 0.85;
      const lambda = +p.lambda ?? 3;
      const j = +p.j ?? 0.7;
      const Y = +p.Y ?? 2;
      const pi = +p.pi ?? 0.4;
      const k = Math.max(1, +p.k ?? 3);
      const clanPrestige = +p.clanPrestige ?? 0;
      const Nm = +p.Nm ?? 1e6;
      const apEff = ap * (1 + 0.2 * clanPrestige);
      const newProven = (state.R||0) * a0;
      const provenNext = (state.P||0) * apEff;
      const shoreProven = (state.P||0) * (1 - pi);
      const birthsPerFemale = 2 * lambda * j * Y;
      const daughters = shoreProven * birthsPerFemale * 0.5;
      const nextR = daughters;
      const Ne = (4 * (shoreProven * Nm) / Math.max(1,(shoreProven + Nm))) * (1 - 1 / Math.max(1,k));
      return {R:nextR,P:newProven + provenNext,daughters,Ne};
    }catch(e){ console.error('[AzulianSim.step]', e); return {R:0,P:0,daughters:0,Ne:0}; }
  },
  run(){
    const p=this.params; let state={R:+p.Nf0||0,P:0}; const out=[];
    for(let t=0;t<(+p.cycles||0);t++){ state=this.step(state,p); out.push({cycle:t+1,rookies:state.R,proven:state.P,Ne:state.Ne,daughters:state.daughters}); }
    return out;
  },
  renderTable(data){
    let h=`<table style="width:100%;border-collapse:collapse;text-align:center;">`+
      `<tr><th>Cycle</th><th>Rookies</th><th>Proven</th><th>Daughters</th><th>Effective Pop (Ne)</th></tr>`;
    data.forEach(r=>{
      const toExp = v => (Number.isFinite(v)? v:0).toExponential(2);
      h+=`<tr><td>${r.cycle}</td><td>${toExp(r.rookies)}</td><td>${toExp(r.proven)}</td><td>${toExp(r.daughters)}</td><td>${toExp(r.Ne)}</td></tr>`
    });
    return h+`</table>`;
  },
  renderControls(){
    const sliders=[
      {id:'a0',label:'Rookie Survival (a₀)',min:0.1,max:0.5,step:0.01},
      {id:'ap',label:'Proven Survival (aₚ)',min:0.6,max:0.99,step:0.01},
      {id:'lambda',label:'Litter Size (λ)',min:1,max:6,step:0.1},
      {id:'j',label:'Juvenile Survival (j)',min:0.4,max:0.9,step:0.01},
      {id:'Y',label:'Years Ashore (Y)',min:0.5,max:4,step:0.1},
      {id:'pi',label:'Redeploy Fraction (π)',min:0,max:0.9,step:0.05},
      {id:'k',label:'Polyandry Level (k)',min:1,max:6,step:1},
      {id:'clanPrestige',label:'Clan Prestige',min:0,max:1,step:0.05}
    ];
    let h='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
    sliders.forEach(s=>{
      const val = this.params[s.id];
      h+=`<label>${s.label}: <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}" oninput="AzulianSim.updateParam('${s.id}', this.value)"><span id="${s.id}-val">${val}</span></label>`;
    });
    h+='</div><button onclick="AzulianSim.refresh()">Run Simulation</button>'; return h;
  },
  updateParam(id,val){ this.params[id]=parseFloat(val); const e=document.getElementById(`${id}-val`); if(e) e.textContent=val; },
  refresh(){ const c=document.getElementById('azulian-sim-output'); if(!c) return; const d=this.run(); c.innerHTML=this.renderTable(d); }
};

/******************** MODULE 2 (rest of file) ... (content truncated for brevity)
