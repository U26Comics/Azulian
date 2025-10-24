// Azulian Population & Selection Simulator — Full Version with Animated Log + Jealousy Mechanics
// Carrd embed: add <div id="azulian-sim"></div> and <div id="azulian-life-sim"></div>, then include this script.

/******************** MODULE 1 (Cohort) ************************/
const AzulianSim = {
  params:{a0:0.22,ap:0.85,lambda:3,j:0.7,Y:2,pi:0.4,k:3,clanPrestige:0.0,Nf0:1e6,Nm:3e6,cycles:10},
  step(state,p){const{a0,ap,lambda,j,Y,pi,k,clanPrestige,Nm}=p;const apEff=ap*(1+0.2*clanPrestige);const newProven=state.R*a0;const provenNext=state.P*apEff;const shoreProven=state.P*(1-pi);const birthsPerFemale=2*lambda*j*Y;const daughters=shoreProven*birthsPerFemale*0.5;const nextR=daughters;const Ne=4*(shoreProven*Nm)/(shoreProven+Nm)*(1-1/k);return{R:nextR,P:newProven+provenNext,daughters,Ne};},
  run(){const p=this.params;let state={R:p.Nf0,P:0};const out=[];for(let t=0;t<p.cycles;t++){state=this.step(state,p);out.push({cycle:t+1,rookies:state.R,proven:state.P,Ne:state.Ne,daughters:state.daughters});}return out;},
  renderTable(data){let h=`<table style="width:100%;border-collapse:collapse;text-align:center;">`+`<tr><th>Cycle</th><th>Rookies</th><th>Proven</th><th>Daughters</th><th>Effective Pop (Ne)</th></tr>`;data.forEach(r=>{h+=`<tr><td>${r.cycle}</td><td>${r.rookies.toExponential(2)}</td><td>${r.proven.toExponential(2)}</td><td>${r.daughters.toExponential(2)}</td><td>${r.Ne.toExponential(2)}</td></tr>`});return h+`</table>`;},
  renderControls(){const sliders=[{id:'a0',label:'Rookie Survival (a₀)',min:0.1,max:0.5,step:0.01},{id:'ap',label:'Proven Survival (aₚ)',min:0.6,max:0.99,step:0.01},{id:'lambda',label:'Litter Size (λ)',min:1,max:6,step:0.1},{id:'j',label:'Juvenile Survival (j)',min:0.4,max:0.9,step:0.01},{id:'Y',label:'Years Ashore (Y)',min:0.5,max:4,step:0.1},{id:'pi',label:'Redeploy Fraction (π)',min:0,max:0.9,step:0.05},{id:'k',label:'Polyandry Level (k)',min:1,max:6,step:1},{id:'clanPrestige',label:'Clan Prestige',min:0,max:1,step:0.05}];let h='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';sliders.forEach(s=>{h+=`<label>${s.label}: <input type=\"range\" id=\"${s.id}\" min=\"${s.min}\" max=\"${s.max}\" step=\"${s.step}\" value=\"${this.params[s.id]}\" oninput=\"AzulianSim.updateParam('${s.id}', this.value)\"><span id=\"${s.id}-val\">${this.params[s.id]}</span></label>`});h+='</div><button onclick="AzulianSim.refresh()">Run Simulation</button>';return h;},
  updateParam(id,val){this.params[id]=parseFloat(val);const e=document.getElementById(`${id}-val`);if(e)e.textContent=val;},
  refresh(){const c=document.getElementById('azulian-sim-output');if(!c)return;const d=this.run();c.innerHTML=this.renderTable(d);}
};

/******************** MODULE 2 — Single-Female Life-Cycle ******************************/
const eventIcons={
  reproduce:{icon:"🌸",color:"#8fff8f"},
  wait:{icon:"🕰",color:"#ffec8f"},
  deploy:{icon:"🚀",color:"#8fff8f"},
  husbandAdd:{icon:"💍",color:"#ffec8f"},
  husbandDeath:{icon:"⚰️",color:"#ffec8f"},
  prestige:{icon:"🧬",color:"#8fff8f"},
  jealousyKill:{icon:"🔪",color:"#ff8f8f"},
  deathOld:{icon:"⏳",color:"#ff8f8f"},
  deathBattle:{icon:"☠️",color:"#ff8f8f"},
  deathAccident:{icon:"⚙️",color:"#ff8f8f"},
  deathStarve:{icon:"🥀",color:"#ff8f8f"},
  deathPoison:{icon:"💔",color:"#ff8f8f"},
  deathRival:{icon:"🩸",color:"#ff8f8f"}
};

const AzulianLifeSim={
  p:{baseLifeIfProven:120,baseLifeIfNeverProven:80,rookieMortality:0.8,provenMortality:0.2,deployYears:4,civilianAnnualMortality:0.15,senescentAnnual:0.05,gestationMonths:6,litterMin:1,litterMax:6,juvenileSurvival:0.7,daughterProvenProb:0.2,husbandsMax:6,provisioningBonusPerHusband:0.05,socialConflictRiskPerYearOverCap:0.15,prestigeBoostBeta:0.5,prestigeThreshold:4},
  s:{},

  // ---------- Logging & Animation ----------
  addLog(type,msg){
    const {icon,color}=eventIcons[type]||{icon:"",color:"#fff"};
    const logBox=document.getElementById('life-log');
    if(!logBox)return;
    const entry=document.createElement('div');
    entry.innerHTML=`${icon} <span style="color:${color}">${msg}</span>`;
    entry.style.opacity=0.3;
    logBox.appendChild(entry);
    logBox.scrollTop=logBox.scrollHeight;
    // Recent HUD
    const hud=document.getElementById('life-recent');
    if(hud){hud.innerHTML=`${icon} <span style="color:${color}">${msg}</span>`;}
    // JS fade-in
    let o=0.3;const fade=setInterval(()=>{o+=0.05;entry.style.opacity=o;if(o>=1)clearInterval(fade);},30);
  },

  reset(){
    this.s={age:16,senescedYears:0,alive:true,proven:false,deployments:0,husbands:1,husbandAges:[16],children:[],daughtersProven:0,daughtersTotal:0,prestige:0,highPrestige:false};
    this.render();
    this.addLog('wait','Age 16: Reached maturity.');
  },

  roll(p){return Math.random()<p;},
  lifeCap(){const base=this.s.proven?this.p.baseLifeIfProven:this.p.baseLifeIfNeverProven;return base+this.s.deployments*this.p.deployYears;},
  updatePrestige(){const d=this.s.daughtersTotal;const dp=this.s.daughtersProven;const prev=this.s.prestige;const frac=d>0?dp/d:0;this.s.prestige=Math.min(1,frac);this.s.highPrestige=this.s.daughtersProven>=this.p.prestigeThreshold; if((prev<0.5&&this.s.prestige>=0.5)||(prev<1&&this.s.prestige===1)){this.addLog('prestige','Prestige increased!');}},

  civilianHalfYearMortality(){
    const baseHalf=1-Math.pow(1-this.p.civilianAnnualMortality,0.5); // ≈ 0.08
    const cap=this.s.highPrestige?Infinity:this.p.husbandsMax; // unlimited if prestige
    const over=Math.max(0,this.s.husbands-cap);
    const conflictAnnual=over*this.p.socialConflictRiskPerYearOverCap;
    const conflictHalf=1-Math.pow(1-Math.min(0.95,conflictAnnual),0.5);
    return Math.min(0.99,baseHalf+conflictHalf);
  },

  // Husband senescence + jealousy kill
  checkHusbands(){
    // Old age: husbands die when player age - husbandAge > 104 (approx reaching ~120)
    const before=this.s.husbands;
    const survivors=[];
    for(const hAge of this.s.husbandAges){
      if(this.s.age - hAge > 104){
        this.addLog('husbandDeath','Husband died of old age.');
      } else {survivors.push(hAge);}
    }
    this.s.husbands=survivors.length;this.s.husbandAges=survivors;

    // Jealousy (husband kills husband): requires ≥2 husbands, 6-mo on-world step
    if(this.s.husbands>=2){
      const jealousP=0.005*(this.s.husbands-1);
      if(Math.random()<jealousP){
        this.s.husbands-=1; this.s.husbandAges.pop();
        this.addLog('jealousyKill','One husband killed another out of jealousy.');
      }
    }
  },

  // Reproduction event (6 months; senescence applies)
  reproduce(){if(!this.s.alive)return;const litter=this.p.litterMin+Math.floor(Math.random()*(this.p.litterMax-this.p.litterMin+1));const j=Math.min(0.95,this.p.juvenileSurvival*(1+this.p.provisioningBonusPerHusband*(this.s.husbands-1)));let survive=0,daughters=0,proved=0;for(let i=0;i<litter;i++){const sex=Math.random()<0.5?'F':'M';const adult=this.roll(j);let proven=false;if(sex==='F'&&adult){proven=this.roll(this.p.daughterProvenProb);}this.s.children.push({sex,adult,proven});if(adult)survive++;if(sex==='F'){daughters++; if(proven)proved++;}}
    this.s.daughtersTotal+=daughters; this.s.daughtersProven+=proved; this.updatePrestige();
    this.s.age+=0.5; this.s.senescedYears+=0.5;
    this.addLog('reproduce',`Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
    this.applyCivilianMortality(); this.render();
  },

  // No reproduction (6 months; senescence applies)
  wait(){if(!this.s.alive)return;this.s.age+=0.5; this.s.senescedYears+=0.5; this.addLog('wait',`Waited 6 months. Age→${this.s.age.toFixed(1)}`); this.applyCivilianMortality(); this.render();},

  // Deployment (4 years; no senescence; life extension by tours)
  deploy(){if(!this.s.alive)return;const first=!this.s.proven; let m=first?this.p.rookieMortality:this.p.provenMortality; m=Math.max(0,m*(1-this.p.prestigeBoostBeta*this.s.prestige)); const survived=!this.roll(m); this.s.age+=this.p.deployYears; this.s.deployments+=1; if(survived){ if(first) this.s.proven=true; this.addLog('deploy',`Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age}`);} else { this.die('deathBattle','Died in battle'); return; } this.render(); },

  addHusband(){if(!this.s.alive)return; this.s.husbands+=1; this.s.husbandAges.push(this.s.age); this.addLog('husbandAdd',`Took another husband. Total=${this.s.husbands}.`); this.render(); },

  applyCivilianMortality(){ if(!this.s.alive)return; this.checkHusbands(); let p=this.civilianHalfYearMortality(); const cap=this.lifeCap(); if(this.s.age>cap){ const yrs=this.s.age-cap; const extraAnnual=Math.min(0.95,yrs*this.p.senescentAnnual); const extraHalf=1-Math.pow(1-extraAnnual,0.5); p=Math.min(0.99,p+extraHalf);} if(this.roll(p)){ const r=Math.random(); if(r<0.30) this.die('deathOld','Died of old age'); else if(r<0.45) this.die('deathAccident','Died in workplace accident'); else if(r<0.60) this.die('deathStarve','Starved to death'); else if(r<0.75) this.die('deathPoison','Poisoned by jealous husband'); else this.die('deathRival','Killed by rival House'); } },

  die(type,msg){ this.s.alive=false; this.addLog(type,`${msg}. Final age ${this.s.age.toFixed(1)}.`); this.render(); },

  computeGIS(){ let score=0,max=0; this.s.children.forEach(ch=>{ max+=3; if(ch.adult)score+=1; if(ch.proven)score+=2; }); const norm=max>0?Math.round(100*score/max):0; return{score,max,norm}; },

  render(){ const root=document.getElementById('azulian-life-sim'); if(!root)return; const cap=this.lifeCap(); const gis=this.computeGIS(); const controls=this.s.alive?`<div style=\"display:flex;flex-wrap:wrap;gap:6px;\"><button onclick=\"AzulianLifeSim.reproduce()\">Reproduce</button><button onclick=\"AzulianLifeSim.wait()\">Wait 6mo</button><button onclick=\"AzulianLifeSim.deploy()\">Deploy 4y</button><button onclick=\"AzulianLifeSim.addHusband()\">Add Husband</button><button onclick=\"AzulianLifeSim.reset()\">Reset</button></div>`:`<div><button onclick=\"AzulianLifeSim.reset()\">Reset</button></div>`; const total=this.s.children.length; const adults=this.s.children.filter(c=>c.adult).length; const df=this.s.children.filter(c=>c.sex==='F').length; const dp=this.s.children.filter(c=>c.proven).length; root.innerHTML=`
      <h3>Azulian Life-Cycle Simulator</h3>
      <div id=\"life-recent\" style=\"margin:6px 0; font-weight:600;\"></div>
      <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;\">
        <div>
          <p><b>Status:</b> ${this.s.alive?'Alive':'Dead'}</p>
          <p><b>Age:</b> ${this.s.age.toFixed(1)} / Cap ${cap.toFixed(1)}</p>
          <p><b>Deployments:</b> ${this.s.deployments}</p>
          <p><b>Husbands:</b> ${this.s.husbands}</p>
          <p><b>Prestige:</b> ${(this.s.prestige*100).toFixed(0)}% · Proven daughters: ${this.s.daughtersProven}/${this.s.daughtersTotal}</p>
          <p><b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} Proven daughters</p>
          <p><b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)</p>
          ${controls}
        </div>
        <div id=\"life-log\" style=\"max-height:280px;overflow:auto;border:1px solid #444;padding:8px;border-radius:8px;\"></div>
      </div>
      <p style=\"font-size:smaller;opacity:0.8;\">Deaths: ⏳ old age, ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. Husbands senesce ~120y; prestige removes husband cap but social risk still accumulates; jealousy 🔪 can kill another husband.</p>
    `; }
};

/******************** BOOTSTRAP ******************************/
document.addEventListener('DOMContentLoaded',()=>{
  const sim=document.getElementById('azulian-sim');
  if(sim){sim.innerHTML=`<h3>Azulian Population Simulator</h3>${AzulianSim.renderControls()}<div id=\"azulian-sim-output\">${AzulianSim.renderTable(AzulianSim.run())}</div>`;}
  const life=document.getElementById('azulian-life-sim');
  if(life){AzulianLifeSim.reset();}
});
