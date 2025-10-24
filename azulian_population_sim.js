// Azulian Population & Selection Simulator — Full Version (hardened)
// Fixes applied per QA report:
// - Define computed vars (total/adults/df/dp) before template in render()
// - Ensure all referenced config keys are present with defaults
// - Add nullish-coalescing fallbacks when reading config
// - Guard DOM bootstrap against late-load (DOMContentLoaded already fired)
// - Try/catch around risky UI renders to avoid hard-crash
// - Minor NaN/undefined protections throughout
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
      h+=`<label>${s.label}: <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}" oninput="AzulianSim.updateParam('${s.id}', this.value)"><span id="${s.id}-val">${val}</span></label>`
    });
    h+='</div><button onclick="AzulianSim.refresh()">Run Simulation</button>'; return h;
  },
  updateParam(id,val){ this.params[id]=parseFloat(val); const e=document.getElementById(`${id}-val`); if(e) e.textContent=val; },
  refresh(){ const c=document.getElementById('azulian-sim-output'); if(!c) return; const d=this.run(); c.innerHTML=this.renderTable(d); }
};

/******************** MODULE 2 — Single-Female Life-Cycle ******************************/
const eventIcons={
  reproduce:{icon:"🌸",color:"#8fff8f"}, wait:{icon:"🕰",color:"#ffec8f"}, deploy:{icon:"🚀",color:"#8fff8f"},
  husbandAdd:{icon:"💍",color:"#ffec8f"}, husbandDeath:{icon:"⚰️",color:"#ffec8f"}, prestige:{icon:"🧬",color:"#8fff8f"},
  jealousyKill:{icon:"🔪",color:"#ff8f8f"}, deathOld:{icon:"⏳",color:"#ff8f8f"}, deathBattle:{icon:"☠️",color:"#ff8f8f"},
  deathAccident:{icon:"⚙️",color:"#ff8f8f"}, deathStarve:{icon:"🥀",color:"#ff8f8f"}, deathPoison:{icon:"💔",color:"#ff8f8f"}, deathRival:{icon:"🩸",color:"#ff8f8f"}
};

const AzulianLifeSim={
  // Complete config with safe defaults for all referenced keys
  p:{
    baseLifeIfProven:120,
    baseLifeIfNeverProven:80,
    rookieMortality:0.8,
    provenMortality:0.2,
    deployYears:4,
    civilianAnnualMortality:0.15,
    senescentAnnual:0.05,
    gestationMonths:6,
    litterMin:1,
    litterMax:6,
    juvenileSurvival:0.7,
    provisioningBonusPerHusband:0.05,
    husbandsMax:6,
    socialConflictRiskPerYearOverCap:0.15,
    prestigeBoostBeta:0.5,
    prestigeThreshold:4
  },
  s:{},

  // Logging & animation (hardened)
  addLog(type,msg){
    try{
      const iconMap = eventIcons[type]||{icon:"",color:"#fff"};
      const logBox=document.getElementById('life-log'); if(!logBox) return;
      const entry=document.createElement('div'); entry.innerHTML=`${iconMap.icon} <span style="color:${iconMap.color}">${msg}</span>`; entry.style.opacity=0.3;
      logBox.appendChild(entry); logBox.scrollTop=logBox.scrollHeight;
      const hud=document.getElementById('life-recent'); if(hud){ hud.innerHTML=`${iconMap.icon} <span style="color:${iconMap.color}">${msg}</span>`; }
      let o=0.3; const fade=setInterval(()=>{ o+=0.05; entry.style.opacity=o; if(o>=1) clearInterval(fade); }, 30);
    }catch(e){ console.error('[addLog]', e); }
  },

  reset(){
    this.s={ age:16, senescedYears:0, alive:true, proven:false, deployments:0,
             husbands:1, husbandAges:[16], children:[], daughtersProven:0,
             daughtersTotal:0, prestige:0, highPrestige:false };
    this.render(); this.addLog('wait','Age 16: Reached maturity.');
  },

  roll(p){ return Math.random() < (Number.isFinite(p)? p:0); },
  lifeCap(){ const base = this.s.proven? this.p.baseLifeIfProven : this.p.baseLifeIfNeverProven; return base + (this.s.deployments|0) * (this.p.deployYears??4); },

  updatePrestige(){
    const d = this.s.daughtersTotal|0; const dp = this.s.daughtersProven|0; const prev = +this.s.prestige||0;
    const frac = d>0 ? (dp/d) : 0; this.s.prestige = Math.min(1, Math.max(0, frac));
    this.s.highPrestige = dp >= (this.p.prestigeThreshold??4);
    if ((prev<0.5 && this.s.prestige>=0.5) || (prev<1 && this.s.prestige===1)) this.addLog('prestige','Prestige increased!');
  },

  civilianHalfYearMortality(){
    const baseAnnual = this.p.civilianAnnualMortality ?? 0.15;
    const baseHalf = 1 - Math.pow(1 - Math.min(0.95, baseAnnual), 0.5);
    const cap = this.s.highPrestige ? Infinity : (this.p.husbandsMax ?? 6);
    const over = Math.max(0, (this.s.husbands|0) - (Number.isFinite(cap)? cap:6));
    const conflictAnnual = over * (this.p.socialConflictRiskPerYearOverCap ?? 0.15);
    const conflictHalf = 1 - Math.pow(1 - Math.min(0.95, conflictAnnual), 0.5);
    return Math.min(0.99, baseHalf + conflictHalf);
  },

  checkHusbands(){
    try{
      // Old age deaths
      const surv=[]; for(const hAge of (this.s.husbandAges||[])){
        if((this.s.age - hAge) > 104){ this.addLog('husbandDeath','Husband died of old age.'); }
        else { surv.push(hAge); }
      }
      this.s.husbandAges = surv; this.s.husbands = surv.length;
      // Husband-on-husband jealousy
      if(this.s.husbands>=2){
        const jealousP = 0.005 * (this.s.husbands - 1);
        if(Math.random() < jealousP){ this.s.husbands -= 1; this.s.husbandAges.pop(); this.addLog('jealousyKill','One husband killed another out of jealousy.'); }
      }
    }catch(e){ console.error('[checkHusbands]', e); }
  },

  reproduce(){
    if(!this.s.alive) return; try{
      const litter = rnd( (this.p.litterMin??1), (this.p.litterMax??6) );
      const jBase = this.p.juvenileSurvival ?? 0.7;
      const bonus = (this.p.provisioningBonusPerHusband ?? 0.05) * Math.max(0,(this.s.husbands|0)-1);
      const j = Math.min(0.95, Math.max(0, jBase * (1 + bonus)));
      let survive=0, daughters=0, proved=0;
      for(let i=0;i<litter;i++){
        const sex = Math.random()<0.5? 'F':'M';
        const adult = this.roll(j);
        let proven=false; if(sex==='F' && adult){ proven = this.roll(this.p.daughterProvenProb ?? 0.2); }
        this.s.children.push({sex,adult,proven}); if(adult)survive++; if(sex==='F'){ daughters++; if(proven) proved++; }
      }
      this.s.daughtersTotal += daughters; this.s.daughtersProven += proved; this.updatePrestige();
      this.s.age += 0.5; this.s.senescedYears += 0.5;
      this.addLog('reproduce',`Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
      this.applyCivilianMortality(); this.render();
    }catch(e){ console.error('[reproduce]', e); }
  },

  wait(){ if(!this.s.alive) return; try{ this.s.age += 0.5; this.s.senescedYears += 0.5; this.addLog('wait',`Waited 6 months. Age→${this.s.age.toFixed(1)}`); this.applyCivilianMortality(); this.render(); }catch(e){ console.error('[wait]', e); } },

  deploy(){
    if(!this.s.alive) return; try{
      const first = !this.s.proven; let m = first ? (this.p.rookieMortality ?? 0.8) : (this.p.provenMortality ?? 0.2);
      m = Math.max(0, m * (1 - (this.p.prestigeBoostBeta ?? 0.5) * (+this.s.prestige||0)));
      const survived = !this.roll(m); this.s.age += (this.p.deployYears ?? 4); this.s.deployments += 1;
      if(survived){ if(first) this.s.proven = true; this.addLog('deploy',`Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age}`); }
      else { this.die('deathBattle','Died in battle'); return; }
      this.render();
    }catch(e){ console.error('[deploy]', e); }
  },

  addHusband(){ if(!this.s.alive) return; try{ this.s.husbands += 1; (this.s.husbandAges||[]).push(this.s.age); this.addLog('husbandAdd',`Took another husband. Total=${this.s.husbands}.`); this.render(); }catch(e){ console.error('[addHusband]', e); } },

  applyCivilianMortality(){
    if(!this.s.alive) return; try{
      this.checkHusbands(); let p = this.civilianHalfYearMortality();
      const cap = this.lifeCap(); if(this.s.age > cap){ const yrs = this.s.age - cap; const extraAnnual = Math.min(0.95, yrs * (this.p.senescentAnnual ?? 0.05)); const extraHalf = 1 - Math.pow(1 - extraAnnual, 0.5); p = Math.min(0.99, p + extraHalf); }
      if(this.roll(p)){
        const r=Math.random(); if(r<0.30) this.die('deathOld','Died of old age');
        else if(r<0.45) this.die('deathAccident','Died in workplace accident');
        else if(r<0.60) this.die('deathStarve','Starved to death');
        else if(r<0.75) this.die('deathPoison','Poisoned by jealous husband');
        else this.die('deathRival','Killed by rival House');
      }
    }catch(e){ console.error('[applyCivilianMortality]', e); }
  },

  die(type,msg){ this.s.alive=false; this.addLog(type,`${msg}. Final age ${this.s.age.toFixed(1)}.`); this.render(); },

  computeGIS(){ let score=0,max=0; for(const ch of (this.s.children||[])){ max+=3; if(ch.adult) score += 1; if(ch.proven) score += 2; } const norm = max>0 ? Math.round(100*score/max) : 0; return {score,max,norm}; },

  render(){
    try{
      const root=document.getElementById('azulian-life-sim'); if(!root) return; const cap=this.lifeCap(); const gis=this.computeGIS();
      // ----- compute values BEFORE template to avoid ReferenceError -----
      const total = (this.s.children?.length) || 0;
      const adults = (this.s.children?.filter(c=>c.adult).length) || 0;
      const df = (this.s.children?.filter(c=>c.sex==='F').length) || 0;
      const dp = this.s.daughtersProven || 0;
      const controls = this.s.alive
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;"><button onclick="AzulianLifeSim.reproduce()">Reproduce</button><button onclick="AzulianLifeSim.wait()">Wait 6mo</button><button onclick="AzulianLifeSim.deploy()">Deploy 4y</button><button onclick="AzulianLifeSim.addHusband()">Add Husband</button><button onclick="AzulianLifeSim.reset()">Reset</button></div>`
        : `<div><button onclick="AzulianLifeSim.reset()">Reset</button></div>`;
      root.innerHTML=`
        <h3>Azulian Life-Cycle Simulator</h3>
        <div id="life-recent" style="margin:6px 0; font-weight:600;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;">
          <div>
            <p><b>Status:</b> ${this.s.alive?'Alive':'Dead'}</p>
            <p><b>Age:</b> ${Number(this.s.age).toFixed(1)} / Cap ${Number(cap).toFixed(1)}</p>
            <p><b>Deployments:</b> ${this.s.deployments|0}</p>
            <p><b>Husbands:</b> ${this.s.husbands|0}</p>
            <p><b>Prestige:</b> ${Math.round((+this.s.prestige||0)*100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal|0}</p>
            <p><b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} Proven daughters</p>
            <p><b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)</p>
            ${controls}
          </div>
          <div id="life-log" style="max-height:280px;overflow:auto;border:1px solid #444;padding:8px;border-radius:8px;"></div>
        </div>
        <p style="font-size:smaller;opacity:0.8;">Deaths: ⏳ old age, ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. Husbands senesce ~120y; prestige removes husband cap but social risk still accumulates; jealousy 🔪 can kill another husband.</p>
      `;
    }catch(e){ console.error('[render]', e); }
  }
};

/******************** BOOTSTRAP (robust against late-load) *******************/
(function bootstrap(){
  function init(){
    try{
      const sim=document.getElementById('azulian-sim');
      if(sim){ sim.innerHTML = `<h3>Azulian Population Simulator</h3>${AzulianSim.renderControls()}<div id="azulian-sim-output">${AzulianSim.renderTable(AzulianSim.run())}</div>`; }
      const life=document.getElementById('azulian-life-sim');
      if(life){ AzulianLifeSim.reset(); }
    }catch(e){ console.error('[bootstrap.init]', e); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// Utility: integer in [min,max]
function rnd(min,max){ min=Math.floor(min); max=Math.floor(max); return Math.floor(Math.random()*(max-min+1))+min; }
