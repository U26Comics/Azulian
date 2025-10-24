// Azulian Life-Cycle & Population Simulators — Contextual Mortality Build
// Carrd / GitHub compatible | Author U26Comics | 2025

(function(){
  const eventColors = {
    default:"#eaeaea",cycle:"#7ee7ff",success:"#8fff8f",
    info:"#ffec8f",danger:"#ff8f8f"
  };
  const eventIcons = {
    reproduce:"🌸",wait:"🕰",deploy:"🚀",
    husbandAdd:"💍",husbandDeath:"⚰️",
    prestige:"🧬",jealousyKill:"🔪",
    deathOld:"⏳",deathBattle:"☠️",
    deathAccident:"⚙️",deathStarve:"🥀",
    deathPoison:"💔",deathRival:"🩸"
  };

  // Utility helpers
  function rnd(min,max){min|=0;max|=0;return Math.floor(Math.random()*(max-min+1))+min;}
  function el(tag,attrs={},children=[]){
    const n=document.createElement(tag);
    for(const[k,v]of Object.entries(attrs)){
      if(k==="style"&&typeof v==="object")Object.assign(n.style,v);
      else if(k.startsWith("on")&&typeof v==="function")n[k]=v;
      else if(k==="text")n.textContent=v;
      else n.setAttribute(k,v);
    }
    (Array.isArray(children)?children:[children]).forEach(c=>c&&n.appendChild(c));
    return n;
  }

  window.AzulianLifeSim={
    p:{
      baseLifeIfProven:120,baseLifeIfNeverProven:80,
      rookieMortality:0.8,provenMortality:0.2,
      deployYears:4,civilianAnnualMortality:0.15,
      senescentAnnual:0.05,gestationMonths:6,
      litterMin:1,litterMax:6,juvenileSurvival:0.7,
      provisioningBonusPerHusband:0.05,husbandsMax:6,
      socialConflictRiskPerYearOverCap:0.15,
      prestigeBoostBeta:0.5,prestigeThreshold:4,
      daughterProvenProb:0.2
    },

    s:{},cycleCount:0,ui:{},currentCycleBody:null,

    // ---------- Mount & UI scaffold ----------
    mount(containerId="azulian-life-sim"){
      const root=document.getElementById(containerId);
      if(!root){console.error("[AzulianLifeSim] Missing container #"+containerId);return;}
      root.innerHTML="";
      root.appendChild(el("h3",{text:"Azulian Life-Cycle Simulator"}));

      const grid=el("div",{style:{
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignItems:"start"}});
      const left=el("div");
      this.ui.status={
        status:el("p"),age:el("p"),tours:el("p"),
        husbands:el("p"),prestige:el("p"),
        children:el("p"),gis:el("p")
      };
      left.append(
        this.ui.status.status,this.ui.status.age,this.ui.status.tours,
        this.ui.status.husbands,this.ui.status.prestige,
        this.ui.status.children,this.ui.status.gis
      );

      const controls=el("div",{style:{
        display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}},[
        el("button",{text:"Reproduce",onclick:()=>this.reproduce()}),
        el("button",{text:"Wait 6 mo",onclick:()=>this.wait()}),
        el("button",{text:"Deploy 4 y",onclick:()=>this.deploy()}),
        el("button",{text:"Add Husband",onclick:()=>this.addHusband()}),
        el("button",{text:"Reset (New Cycle)",onclick:()=>this.reset()})
      ]);
      left.appendChild(controls);

      const right=el("div");
      const logBox=el("div",{id:"life-log",style:{
        maxHeight:"320px",overflow:"auto",border:"1px solid #444",
        padding:"8px",borderRadius:"8px",background:"#111"}});
      right.appendChild(logBox);
      grid.append(left,right);
      root.appendChild(grid);

      root.appendChild(el("p",{style:{fontSize:"12px",opacity:"0.8"},
        text:"Deaths: ⏳ old age, ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. Husbands senesce ≈ 120 y; prestige raises cap; jealousy 🔪 may kill one."}));

      this.ui.root=root;this.ui.logBox=logBox;
      this._initLife();this._renderStatus();this._newCycle();
    },

    // ---------- Logging ----------
    _addLog(type,msg){
      const icon=(eventIcons[type]||"");
      const color=
        type.startsWith("death")?eventColors.danger:
        (type==="prestige"?eventColors.success:
        (["wait","husbandAdd","husbandDeath","jealousyKill"].includes(type)?
         eventColors.info:eventColors.default));
      const entry=el("div");
      entry.innerHTML=`${icon} <span style="color:${color}">${msg}</span>`;
      entry.style.opacity="0.3";
      if(this.currentCycleBody){
        this.currentCycleBody.appendChild(entry);
        let o=0.3;const fade=setInterval(()=>{o+=0.05;entry.style.opacity=String(o);if(o>=1)clearInterval(fade);},30);
      }
      if(this.ui.logBox)this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
    },

    _newCycle(){
      this.cycleCount++;
      const wrap=el("details",{open:true});
      const sum=el("summary");
      sum.innerHTML=`<span style="color:${eventColors.cycle};font-weight:600;">
        🌀 Enter Cycle ${this.cycleCount} — Age 16: Reached maturity.</span>`;
      const body=el("div",{class:"cycle-body",style:{marginLeft:"1em"}});
      wrap.append(sum,body);
      this.ui.logBox.appendChild(wrap);
      this.currentCycleBody=body;
      this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
    },

    _initLife(){
      this.s={
        age:16,senescedYears:0,alive:true,proven:false,deployments:0,
        husbands:0,husbandAges:[],
        children:[],daughtersProven:0,daughtersTotal:0,
        prestige:0,highPrestige:false
      };
    },
    // ---------- Core helpers ----------
    _lifeCap(){
      const base = this.s.proven ? this.p.baseLifeIfProven : this.p.baseLifeIfNeverProven;
      return base + (this.s.deployments|0) * (this.p.deployYears ?? 4);
    },

    _updatePrestige(){
      const d  = this.s.daughtersTotal|0;
      const dp = this.s.daughtersProven|0;
      const prev = +this.s.prestige || 0;
      const frac = d > 0 ? (dp/d) : 0;
      this.s.prestige = Math.min(1, Math.max(0, frac));
      this.s.highPrestige = dp >= (this.p.prestigeThreshold ?? 4);
      if ((prev < 0.5 && this.s.prestige >= 0.5) || (prev < 1 && this.s.prestige === 1)){
        this._addLog("prestige","Prestige increased!");
      }
    },

    _roll(p){ return Math.random() < (Number.isFinite(p) ? p : 0); },

    _checkHusbands(){
      const surv=[];
      for(const hAge of (this.s.husbandAges||[])){
        // husbands senesce ~120y after taken
        if ((this.s.age - hAge) > 104){
          this._addLog("husbandDeath","Husband died of old age.");
        } else {
          surv.push(hAge);
        }
      }
      this.s.husbandAges = surv;
      this.s.husbands = surv.length;

      // jealousy between husbands
      if(this.s.husbands >= 2){
        const jealousP = 0.005 * (this.s.husbands - 1);
        if(Math.random() < jealousP){
          this.s.husbands -= 1;
          this.s.husbandAges.pop();
          this._addLog("jealousyKill","One husband killed another out of jealousy.");
        }
      }
    },

    // ---------- Mortality & Death Handling ----------
    _applyCivilianMortality(lastAction = null){
      if(!this.s.alive) return;
      this._checkHusbands();

      // base half-year risk, with senescent add-on if beyond cap
      let p = (this.p.civilianAnnualMortality ?? 0.15) * 0.5;
      const cap = this._lifeCap();
      if(this.s.age > cap){
        const yrs = this.s.age - cap;
        p = Math.min(0.99, p + yrs * (this.p.senescentAnnual ?? 0.05) * 0.5);
      }
      if(!this._roll(p)) return; // survived this period

      // Special case: attempted to take a husband while unproven
      // (violent retaliation by the prospective husband's House)
      if(lastAction === "husbandAttempt" && !this.s.proven && Math.random() < 0.10){
        this._die("deathRival","Killed by prospective husband's House");
        return;
      }

      // Pools
      const civilianCauses = [
        ["deathRival","Killed by rival wicker gang",0.12],
        ["deathRival","Killed by rat hunters",0.12],
        ["deathRival","Killed in worker uprising",0.10],
        ["deathAccident","Died of infection",0.10],
        ["deathPoison","Executed by Yebra for illegal farming",0.10],
        ["deathPoison","Executed by Yebra for sabotage",0.10],
        ["deathPoison","Executed by Yebra for terroristic activity",0.10],
        ["deathPoison","Executed by Yebra for involvement in organized crime",0.10],
      ];

      const veteranCauses = [
        ["deathRival","Killed in a duel",0.12],
        ["deathRival","Killed by outlanders while rat hunting",0.10],
        ["deathPoison","Killed by angry prostitute while slumming",0.10],
        ["deathAccident","Overdosed",0.10],
        ["deathPoison","Executed for Posadist-terror cell activities",0.10],
        ["deathPoison","Executed for space piracy",0.10],
        ["deathPoison","Executed for violating Yebra patent law",0.10],
        ["deathRival","Killed in a drunken brawl",0.10],
      ];

      // base civilian background; jealous-husband only if you actually have one
      const baseCauses = [
        ["deathAccident","Died in workplace accident",0.15],
        ["deathStarve","Starved to death",0.15],
        ...(this.s.husbands > 0 ? [["deathPoison","Poisoned by jealous husband",0.10]] : []),
        ["deathRival","Killed by rival House",0.10]
      ];

      let pool = [...baseCauses];
      if(!this.s.proven && this.s.deployments === 0){
        pool.push(...civilianCauses);
      } else if(this.s.proven || this.s.deployments > 0){
        pool.push(...veteranCauses);
      }

      // Old age can only occur at 80+
      if(this.s.age >= 80) pool.push(["deathOld","Died of old age",0.25]);

      // Weighted pick
      const totalW = pool.reduce((a,[,,w])=>a+w,0);
      let r = Math.random() * totalW;
      for(const [type,msg,w] of pool){
        r -= w;
        if(r <= 0){ this._die(type,msg); return; }
      }
      // Fallback
      this._die("deathAccident","Died in unexplained circumstances");
    },

    // ---------- Actions ----------
    addHusband(){
      if(!this.s.alive) return;

      // If not proven, 95% chance the attempt fails, with 6-month cooldown.
      if(!this.s.proven){
        const rejected = Math.random() < 0.95;
        this.s.age += 0.5; // same cooldown as reproduction
        if(rejected){
          this._addLog("info","💔 Rejected by prospective husband for being poor.");
          // allow retaliation event to occur via contextual mortality
          this._applyCivilianMortality("husbandAttempt");
          this._renderStatus();
          return;
        }
      }

      // success
      this.s.husbands += 1;
      (this.s.husbandAges||[]).push(this.s.age);
      this._addLog("husbandAdd",`Took another husband. Total=${this.s.husbands}.`);
      this._renderStatus();
    },

    reproduce(){
      if(!this.s.alive) return;
      if((this.s.husbands||0) < 1){
        this._addLog("info","You cannot reproduce without at least one husband.");
        return;
      }

      const litter = rnd((this.p.litterMin??1),(this.p.litterMax??6));
      const jBase  = this.p.juvenileSurvival ?? 0.7;
      const bonus  = (this.p.provisioningBonusPerHusband ?? 0.05) * Math.max(0,(this.s.husbands|0)-1);
      const j      = Math.min(0.95, Math.max(0, jBase * (1 + bonus)));

      let survive=0, daughters=0, proved=0;
      for(let i=0;i<litter;i++){
        const sex = Math.random()<0.5 ? "F":"M";
        const adult = this._roll(j);
        let proven=false;
        if(sex==="F" && adult) proven = this._roll(this.p.daughterProvenProb ?? 0.2);
        this.s.children.push({sex,adult,proven});
        if(adult) survive++;
        if(sex==="F"){ daughters++; if(proven) proved++; }
      }

      this.s.daughtersTotal += daughters;
      this.s.daughtersProven += proved;
      this._updatePrestige();
      this.s.age += 0.5; // 6-month cooldown

      this._addLog("reproduce",
        `Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
      this._applyCivilianMortality();
      this._renderStatus();
    },

    wait(){
      if(!this.s.alive) return;
      this.s.age += 0.5;
      this._addLog("wait",`Waited 6 months. Age→${this.s.age.toFixed(1)}`);
      this._applyCivilianMortality();
      this._renderStatus();
    },

    deploy(){
      if(!this.s.alive) return;
      const first = !this.s.proven;
      let m = first ? (this.p.rookieMortality ?? 0.8)
                    : (this.p.provenMortality ?? 0.2);
      // Prestige reduces battlefield mortality
      m = Math.max(0, m * (1 - (this.p.prestigeBoostBeta ?? 0.5) * (+this.s.prestige || 0)));

      const survived = !this._roll(m);
      this.s.age += (this.p.deployYears ?? 4);
      this.s.deployments += 1;

      if(survived){
        if(first) this.s.proven = true;
        this._addLog("deploy",
          `Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age}`);
      }else{
        // special deployed death variant
        if(Math.random() < 0.33)
          this._die("deathBattle","Thrown from airlock after failed QC");
        else
          this._die("deathBattle","Died in battle");
        return;
      }
      this._renderStatus();
    },

    // ---------- Death Finalizer ----------
    _die(type,msg){
      this.s.alive = false;
      this._addLog(type,`${msg}. Final age ${this.s.age.toFixed(1)}.`);
      this._renderStatus();
    },
    // ---------- Status rendering ----------
    _computeGIS(){
      let score = 0, max = 0;
      for (const ch of (this.s.children || [])) {
        max += 3;
        if (ch.adult)  score += 1;
        if (ch.proven) score += 2;
      }
      const norm = max > 0 ? Math.round(100 * score / max) : 0;
      return { score, max, norm };
    },

    _renderStatus(){
      if(!this.ui.status) return;
      const cap = this._lifeCap();
      const gis = this._computeGIS();
      const total  = (this.s.children?.length) || 0;
      const adults = (this.s.children?.filter(c=>c.adult).length) || 0;
      const df     = (this.s.children?.filter(c=>c.sex==='F').length) || 0;
      const dp     = this.s.daughtersProven || 0;

      this.ui.status.status.innerHTML =
        `<b>Status:</b> ${this.s.alive ? 'Alive' : 'Dead'}`;
      this.ui.status.age.innerHTML =
        `<b>Age:</b> ${Number(this.s.age).toFixed(1)} / Cap ${Number(cap).toFixed(1)}`;
      this.ui.status.tours.innerHTML =
        `<b>Deployments:</b> ${this.s.deployments|0}`;
      this.ui.status.husbands.innerHTML =
        `<b>Husbands:</b> ${this.s.husbands|0}`;
      this.ui.status.prestige.innerHTML =
        `<b>Prestige:</b> ${Math.round((+this.s.prestige||0)*100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal|0}`;
      this.ui.status.children.innerHTML =
        `<b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} proven daughters`;
      this.ui.status.gis.innerHTML =
        `<b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)`;
    },

    // ---------- Reset ----------
    reset(){
      this._initLife();
      this._renderStatus();
      this._newCycle(); // new collapsible section, preserves history
    }
  }; // end AzulianLifeSim object

  // ---------- Bootstrap ----------
  function boot(){
    const id = "azulian-life-sim";
    if(document.getElementById(id)) window.AzulianLifeSim.mount(id);
  }
  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(); // end AzulianLifeSim IIFE
// ---------------------------------------------------------
// Azulian Population Simulator — Independent module
// ---------------------------------------------------------
(function(){
  const AzulianSim = {
    params:{
      a0:0.22, ap:0.85, lambda:3, j:0.7, Y:2, pi:0.4, k:3,
      clanPrestige:0.0, Nf0:1e6, Nm:3e6, cycles:10
    },
    step(state,p){
      const a0 = +p.a0 ?? 0.22,
            ap = +p.ap ?? 0.85,
            λ  = +p.lambda ?? 3,
            j  = +p.j ?? 0.7,
            Y  = +p.Y ?? 2,
            π  = +p.pi ?? 0.4,
            k  = Math.max(1, (+p.k ?? 3)),
            prestige = +p.clanPrestige ?? 0,
            Nm = +p.Nm ?? 1e6;

      const apEff = ap * (1 + 0.2 * prestige);
      const newProven  = (state.R || 0) * a0;
      const provenNext = (state.P || 0) * apEff;
      const shoreProven = (state.P || 0) * (1 - π);
      const birthsPerFemale = 2 * λ * j * Y;
      const daughters = shoreProven * birthsPerFemale * 0.5;
      const nextR = daughters;
      const Ne = (4 * (shoreProven * Nm) / Math.max(1,(shoreProven + Nm))) *
                 (1 - 1 / Math.max(1, k));
      return { R: nextR, P: newProven + provenNext, daughters, Ne };
    },
    run(){
      const p=this.params;
      let s={R:+p.Nf0||0,P:0};
      const out=[];
      for(let t=0;t<(+p.cycles||0);t++){
        s=this.step(s,p);
        out.push({cycle:t+1,rookies:s.R,proven:s.P,daughters:s.daughters,Ne:s.Ne});
      }
      return out;
    },
    renderTable(data){
      let h=`<table style="width:100%;border-collapse:collapse;text-align:center;">
      <tr><th>Cycle</th><th>Rookies</th><th>Proven</th><th>Daughters</th><th>Effective Pop (Ne)</th></tr>`;
      const exp=v=> (Number.isFinite(v)?v:0).toExponential(2);
      for(const r of data)
        h+=`<tr><td>${r.cycle}</td><td>${exp(r.rookies)}</td><td>${exp(r.proven)}</td><td>${exp(r.daughters)}</td><td>${exp(r.Ne)}</td></tr>`;
      h+="</table>";
      return h;
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
      let h=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
      for(const s of sliders){
        const val=this.params[s.id];
        h+=`<label>${s.label}: 
              <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}"
                     value="${val}" oninput="AzulianSim.update('${s.id}',this.value)">
              <span id="${s.id}-val">${val}</span>
            </label>`;
      }
      h+=`</div><button onclick="AzulianSim.refresh()">Run Simulation</button>`;
      return h;
    },
    update(id,val){
      this.params[id]=parseFloat(val);
      const e=document.getElementById(`${id}-val`);
      if(e) e.textContent=val;
    },
    refresh(){
      const c=document.getElementById("azulian-sim-output");
      if(!c)return;
      const d=this.run();
      c.innerHTML=this.renderTable(d);
    },
    mount(containerId="azulian-sim"){
      const root=document.getElementById(containerId);
      if(!root){console.warn("[AzulianSim] container not found");return;}
      root.innerHTML=`<h3>Azulian Population Simulator</h3>
      ${this.renderControls()}
      <div id="azulian-sim-output" style="margin-top:8px;">${this.renderTable(this.run())}</div>`;
    }
  };
  window.AzulianSim=AzulianSim;
  function boot(){
    const id="azulian-sim";
    if(document.getElementById(id))AzulianSim.mount(id);
  }
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",boot);
  else boot();
})(); // end AzulianSim IIFE
