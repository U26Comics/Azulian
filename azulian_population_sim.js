// Azulian Life-Cycle & Population Simulators — Outlander + Labor Union Build
// Carrd / GitHub compatible | Author: U26Comics | 2025

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

  // Utility
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

  // persistent world state
  window.AzulianWorld = window.AzulianWorld || { revoltSuccesses:0, globalAdvantage:false };

  window.AzulianLifeSim = {
    // ---------- Parameters ----------
    p:{
      baseLifeIfProven:120, baseLifeIfNeverProven:80,
      rookieMortality:0.8, provenMortality:0.2,
      deployYears:4, civilianAnnualMortality:0.15,
      senescentAnnual:0.05, gestationMonths:6,
      litterMin:1, litterMax:6, juvenileSurvival:0.7,
      provisioningBonusPerHusband:0.05, husbandsMax:6,
      socialConflictRiskPerYearOverCap:0.15,
      prestigeBoostBeta:0.5, prestigeThreshold:4,
      daughterProvenProb:0.2,

      // Outlander + Union tuning
      outlanderDeathAdvantage:true,
      sabotageBaseSuccess:0.30,
      unionStealthFail:0.10,
      unionExpandDeath:0.10,
      unionCacheDeath:0.10,
      unionSabotageDeath:0.10,
      unionAutoConvertProb:0.90,
      unionAutoExecutedProb:0.10,
      unionSurvivorsPerCache:10,
      unionHidingYears:4
    },

    s:{}, cycleCount:0, ui:{}, currentCycleBody:null,
    // ---------- Mount & UI ----------
    mount(containerId="azulian-life-sim"){
      const root=document.getElementById(containerId);
      if(!root){console.error("[AzulianLifeSim] Missing container #"+containerId);return;}
      root.innerHTML="";
      root.appendChild(el("h3",{text:"Azulian Life-Cycle Simulator"}));

      const grid=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignItems:"start"}});
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

      // controls
      const controls=el("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}},[
        el("button",{id:"btn-repro",text:"Reproduce",onclick:()=>this.reproduce()}),
        el("button",{id:"btn-wait",text:"Wait 6 mo",onclick:()=>this.wait()}),
        el("button",{id:"btn-deploy",text:"Deploy 4 y",onclick:()=>this.deploy()}),
        el("button",{id:"btn-husb",text:"Add Husband",onclick:()=>this.addHusband()}),
        el("button",{id:"btn-reset",text:"Reset (New Cycle)",onclick:()=>this.reset()}),
        el("button",{id:"btn-join-out",text:"Join Outlanders",onclick:()=>this.joinOutlanders()}),
        el("button",{id:"btn-start-un",text:"Start Labor Union",onclick:()=>this.startUnion()}),
        el("button",{id:"btn-exp-un",text:"Expand Union",onclick:()=>this.expandUnion()}),
        el("button",{id:"btn-cache",text:"Build Supply Cache",onclick:()=>this.buildCache()}),
        el("button",{id:"btn-sab",text:"Sabotage Yebra Property",onclick:()=>this.sabotageYebra()}),
        el("button",{id:"btn-revolt",text:"Start Worker’s Revolt",onclick:()=>this.startRevolt()})
      ]);
      left.appendChild(controls);

      // union HUD
      this.ui.unionHUD=el("div",{id:"union-hud",style:{
        marginTop:"8px",padding:"8px",border:"1px solid #444",
        borderRadius:"8px",background:"#0b0b0b",display:"none"
      }},[
        el("div",{id:"union-line",text:"Union: 0 members • 0 caches • idle"}),
        el("div",{style:{marginTop:"6px",height:"8px",background:"#222",borderRadius:"4px"}},[
          el("div",{id:"union-bar",style:{height:"8px",width:"0%",background:"#5bd15b",borderRadius:"4px"}})
        ])
      ]);
      left.appendChild(this.ui.unionHUD);

      const right=el("div");
      const logBox=el("div",{id:"life-log",style:{
        maxHeight:"320px",overflow:"auto",border:"1px solid #444",
        padding:"8px",borderRadius:"8px",background:"#111"}});
      right.appendChild(logBox);
      grid.append(left,right);
      root.appendChild(grid);

      this.ui.root=root;this.ui.logBox=logBox;
      this._initLife();this._renderStatus();this._newCycle();
    },

    // ---------- Logging ----------
    _addLog(type,msg){
      const icon=(eventIcons[type]||"");
      const color=type.startsWith("death")?eventColors.danger:
        (type==="prestige"?eventColors.success:
        (["wait","husbandAdd","husbandDeath","jealousyKill"].includes(type)?eventColors.info:eventColors.default));
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
    },

    _initLife(){
      this.s={
        age:16,alive:true,proven:false,deployments:0,
        husbands:0,husbandAges:[],children:[],
        daughtersProven:0,daughtersTotal:0,
        prestige:0,highPrestige:false,
        outlander:false,unionActive:false,unionMembers:0,unionCaches:0,
        unionInHiding:false,unionHidingUntilAge:null,unlockedRevolt:false,pending:[]
      };
    },

    _lifeCap(){
      const base=this.s.proven?this.p.baseLifeIfProven:this.p.baseLifeIfNeverProven;
      return base+(this.s.deployments|0)*(this.p.deployYears??4);
    },
    _tickHalfYear(){
      this._processPending();
      if(this.s.unionActive && !this.s.unionInHiding && this.s.unionMembers>0){
        if(Math.random()<(this.p.unionStealthFail??0.10)){
          const caches=this.s.unionCaches|0;
          const survPer=this.p.unionSurvivorsPerCache??10;
          const survivors=Math.min(this.s.unionMembers,caches*survPer);
          this.s.unionInHiding=true;
          this.s.unionHidingUntilAge=this.s.age+(this.p.unionHidingYears??4);
          this._addLog("deathPoison",`Union purge! Entering hiding for ${this.p.unionHidingYears} years. Survivors preserved: ${survivors}.`);
          this.s.unionMembers=survivors;
          if(Math.random()<0.20)this._forceCivilianEvent();
        }
      }
      if(this.s.unionInHiding && this.s.unionHidingUntilAge && this.s.age>=this.s.unionHidingUntilAge){
        this.s.unionInHiding=false;this.s.unionHidingUntilAge=null;
        this._addLog("info","Came out of hiding. Union may resume.");
      }
      this.s.unlockedRevolt=(this.s.unionMembers>=1000);
    },

    _processPending(){
      if(!Array.isArray(this.s.pending))this.s.pending=[];
      const now=this.s.age;const remain=[];
      for(const job of this.s.pending){
        if(job.atAge<=now && job.type==="unionAuto"){
          if(!this.s.unionActive||this.s.unionInHiding)continue;
          const current=this.s.unionMembers|0;
          if(current<=0)continue;

          // soft cap scales with caches
          const maxMembers=10000+(this.s.unionCaches*1000);
          if(current>=maxMembers){
            this._addLog("info",`Union at max sustainable size (${maxMembers}).`);
            continue;
          }

          let added=0,lost=0;
          for(let i=0;i<current;i++){
            if(Math.random()<(this.p.unionAutoConvertProb??0.9))added++;
            else lost++;
          }
          const newTotal=Math.min(maxMembers,Math.max(0,this.s.unionMembers+added-lost));
          const gain=newTotal-this.s.unionMembers;
          this.s.unionMembers=newTotal;
          if(gain>0)this._addLog("prestige",`Union grew +${gain}.`);
          if(lost>0)this._addLog("deathPoison",`${lost} members executed.`);
          if(this.s.unionActive&&!this.s.unionInHiding&&this.s.unionMembers>0&&this.s.unionMembers<maxMembers)
            this.s.pending.push({atAge:this.s.age+0.5,type:"unionAuto"});
        }else remain.push(job);
      }
      this.s.pending=remain;
    },

    _forceCivilianEvent(){
      const pool=[
        ["deathAccident","Died in workplace accident",0.15],
        ["deathStarve","Starved to death",0.15],
        ...(this.s.husbands>0?[["deathPoison","Poisoned by jealous husband",0.10)]]:[]),
        ["deathRival","Killed by rival House",0.10]
      ];
      const total=pool.reduce((a,[,,w])=>a+w,0);
      let r=Math.random()*total;
      for(const [t,m,w]of pool){r-=w;if(r<=0){this._die(t,m);return;}}
      this._die("deathAccident","Died mysteriously.");
    },
    // ---------- Outlander + Union Actions ----------
    joinOutlanders(){
      if(!this.s.alive)return;
      if(this.s.proven||this.s.deployments>0){
        this._addLog("info","Cannot join after deployment.");return;
      }
      this.s.outlander=true;
      this._addLog("prestige","Joined Outlanders: death saves advantaged, deploy locked.");
      this._renderStatus();
    },

    startUnion(){
      if(!this.s.alive||!this.s.outlander)return;
      if(this.s.unionActive)return;
      this.s.unionActive=true;this.s.unionMembers=Math.max(1,this.s.unionMembers|0);
      this._addLog("prestige","Started Labor Union. New actions unlocked.");
      this._renderStatus();
    },

    expandUnion(){
      if(!this.s.alive)return;
      if(!this.s.unionActive||this.s.unionInHiding){this._addLog("info","Union inactive.");return;}
      if(Math.random()<(this.p.unionExpandDeath??0.1)){this._die("deathPoison","Executed for terroristic activity");return;}
      this.s.unionMembers++;
      this._addLog("prestige","Expanded Union +1 member.");
      this.s.pending.push({atAge:this.s.age+0.5,type:"unionAuto"});
      this.s.age+=0.5;this._tickHalfYear();this._applyCivilianMortality();this._renderStatus();
    },

    buildCache(){
      if(!this.s.unionActive||this.s.unionInHiding)return;
      if(Math.random()<(this.p.unionCacheDeath??0.1)){this._die("deathAccident","Executed by drone for suspicious activity");return;}
      this.s.unionCaches++;this._addLog("prestige",`Built cache. Total ${this.s.unionCaches}.`);
      this.s.age+=0.5;this._tickHalfYear();this._applyCivilianMortality();this._renderStatus();
    },

    sabotageYebra(){
      if(!this.s.unionActive||this.s.unionInHiding)return;
      if(Math.random()<(this.p.unionSabotageDeath??0.1)){this._die("deathPoison","Executed for sabotage");return;}
      const base=(this.p.sabotageBaseSuccess??0.3);
      const bonus=Math.floor(this.s.unionMembers/10)*0.01;
      const success=Math.random()<Math.min(0.95,base+bonus);
      if(success)this._addLog("prestige","Sabotage successful.");
      else this._addLog("info","Sabotage failed silently.");
      this.s.age+=0.5;this._tickHalfYear();this._applyCivilianMortality();this._renderStatus();
    },

    startRevolt(){
      if(!this.s.unlockedRevolt)return;
      const prev=window.AzulianWorld.revoltSuccesses||0;
      const p=Math.min(0.95,0.10+0.10*prev);
      if(Math.random()<p){
        window.AzulianWorld.revoltSuccesses=prev+1;
        window.AzulianWorld.globalAdvantage=true;
        this._addLog("prestige",`Worker's Revolt succeeded! Global death-save advantage unlocked.`);
      }else this._addLog("info","Worker's Revolt failed.");
      this.s.age+=0.5;this._tickHalfYear();this._applyCivilianMortality();this._renderStatus();
    },

    deploy(){
      if(this.s.outlander){this._die("deathPoison","Executed by Yebra for Terroristic Affiliations");return;}
      const first=!this.s.proven;
      let m=first?(this.p.rookieMortality??0.8):(this.p.provenMortality??0.2);
      m=Math.max(0,m*(1-(this.p.prestigeBoostBeta??0.5)*(+this.s.prestige||0)));
      const survived=!this._roll(m);
      this.s.age+=(this.p.deployYears??4);this.s.deployments++;
      if(survived){if(first)this.s.proven=true;this._addLog("deploy",`Deployment ${this.s.deployments} survived.`);}
      else{if(Math.random()<0.33)this._die("deathBattle","Thrown from airlock after failed QC");else this._die("deathBattle","Died in battle");}
      this._renderStatus();
    },

    // ---------- Status & Reset ----------
    _renderStatus(){
      if(!this.ui.status)return;
      const cap=this._lifeCap();
      const total=(this.s.children?.length)||0;
      this.ui.status.status.innerHTML=`<b>Status:</b> ${this.s.alive?'Alive':'Dead'}`;
      this.ui.status.age.innerHTML=`<b>Age:</b> ${this.s.age.toFixed(1)} / Cap ${cap.toFixed(1)}`;
      this.ui.status.husbands.innerHTML=`<b>Husbands:</b> ${this.s.husbands}`;
      const show=(id,on)=>{const b=this.ui.root.querySelector('#'+id);if(b)b.style.display=on?"":"none";};
      const undeployed=!this.s.proven&&this.s.deployments===0;
      show("btn-join-out",undeployed&&!this.s.outlander);
      show("btn-start-un",this.s.outlander&&!this.s.unionActive&&!this.s.unionInHiding);
      const active=this.s.unionActive&&!this.s.unionInHiding;
      show("btn-exp-un",active);show("btn-cache",active);show("btn-sab",active);
      show("btn-revolt",active&&this.s.unionMembers>=1000);
      const hud=this.ui.unionHUD;if(hud){const visible=(this.s.unionMembers>=10)||this.s.unionActive||this.s.unionInHiding;
        hud.style.display=visible?"":"none";const line=hud.querySelector("#union-line"),bar=hud.querySelector("#union-bar");
        const mem=this.s.unionMembers|0,caches=this.s.unionCaches|0,state=this.s.unionInHiding?"in hiding":(this.s.unionActive?"active":"dormant");
        line.textContent=`Union: ${mem} members • ${caches} caches • ${state}`;bar.style.width=Math.min(100,mem/1000*100)+"%";}
    },

    reset(){this._initLife();this._renderStatus();this._newCycle();}
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>window.AzulianLifeSim.mount("azulian-life-sim"));
  else window.AzulianLifeSim.mount("azulian-life-sim");
})();
// ---------------------------------------------------------
// Azulian Population Simulator — independent module
// ---------------------------------------------------------
(function(){
  const AzulianSim = {
    // ---------------- Parameters ----------------
    params:{
      a0:0.22,         // rookie survival (rookie -> proven per cycle)
      ap:0.85,         // proven survival (stays proven next cycle)
      lambda:3,        // mean litter size (per pregnancy)
      j:0.7,           // juvenile survival to adulthood
      Y:2,             // years ashore per cycle per proven
      pi:0.4,          // redeploy fraction (proven not ashore)
      k:3,             // polyandry level (mating skew -> Ne)
      clanPrestige:0,  // 0..1 boosts ap as (1+0.2*prestige)
      Nf0:1e6,         // initial rookies (females) at cycle 0
      Nm:3e6,          // available adult males
      cycles:10        // number of cycles to simulate
    },

    // ---------------- Core simulation ----------------
    /**
     * Deterministic cycle step (stylized mean-field model).
     * state.R = rookies (unproven females entering the pipeline)
     * state.P = proven females (veterans)
     */
    step(state,p){
      const a0 = (+p.a0 ?? 0.22);
      const ap = (+p.ap ?? 0.85);
      const λ  = (+p.lambda ?? 3);
      const j  = (+p.j ?? 0.7);
      const Y  = (+p.Y ?? 2);
      const π  = (+p.pi ?? 0.4);
      const k  = Math.max(1,(+p.k ?? 3));
      const prestige = (+p.clanPrestige ?? 0);
      const Nm = (+p.Nm ?? 1e6);

      // prestige improves proven survival a bit
      const apEff = ap * (1 + 0.2 * prestige);

      // proven pipeline
      const newProven   = (state.R || 0) * a0;   // rookies that become proven
      const provenStay  = (state.P || 0) * apEff;

      // reproduction happens on-shore
      const shoreProven = (state.P || 0) * (1 - π);

      // birthsPerFemale: 2 pregnancies / year * λ pups/pregnancy * j survival * Y years
      const birthsPerFemale = 2 * λ * j * Y;

      // daughters arise from ~50:50 sex ratio
      const daughters = shoreProven * birthsPerFemale * 0.5;

      // next rookies are the daughters
      const nextR = daughters;

      // effective population size Ne (very stylized)
      // mating skew via k (polyandry reduces variance); harmonic mean approximation
      const Ne = (4 * (shoreProven * Nm) / Math.max(1,(shoreProven + Nm))) * (1 - 1/Math.max(1,k));

      return { R: nextR, P: newProven + provenStay, daughters, Ne };
    },

    run(){
      const p = this.params;
      let s = { R: +p.Nf0 || 0, P: 0 };
      const out = [];
      for (let t = 0; t < (+p.cycles || 0); t++){
        s = this.step(s, p);
        out.push({
          cycle: t+1,
          rookies: s.R,
          proven:  s.P,
          daughters: s.daughters,
          Ne: s.Ne
        });
      }
      return out;
    },

    // ---------------- Rendering ----------------
    renderTable(data){
      let h = `<table style="width:100%;border-collapse:collapse;text-align:center;">
        <tr><th>Cycle</th><th>Rookies</th><th>Proven</th><th>Daughters</th><th>Effective Pop (Ne)</th></tr>`;
      const exp = v => (Number.isFinite(v) ? v : 0).toExponential(2);
      for(const r of data){
        h += `<tr>
          <td>${r.cycle}</td>
          <td>${exp(r.rookies)}</td>
          <td>${exp(r.proven)}</td>
          <td>${exp(r.daughters)}</td>
          <td>${exp(r.Ne)}</td>
        </tr>`;
      }
      h += `</table>`;
      return h;
    },

    renderControls(){
      const sliders = [
        {id:'a0',label:'Rookie Survival (a₀)',min:0.10,max:0.60,step:0.01},
        {id:'ap',label:'Proven Survival (aₚ)',min:0.60,max:0.99,step:0.01},
        {id:'lambda',label:'Litter Size (λ)',min:1,max:6,step:0.1},
        {id:'j',label:'Juvenile Survival (j)',min:0.40,max:0.95,step:0.01},
        {id:'Y',label:'Years Ashore (Y)',min:0.5,max:4,step:0.1},
        {id:'pi',label:'Redeploy Fraction (π)',min:0,max:0.9,step:0.05},
        {id:'k',label:'Polyandry Level (k)',min:1,max:12,step:1},
        {id:'clanPrestige',label:'Clan Prestige',min:0,max:1,step:0.05},
        {id:'Nf0',label:'Initial Rookies (Nf₀)',min:1e3,max:1e9,step:1e3},
        {id:'Nm',label:'Adult Males (Nm)',min:1e3,max:1e9,step:1e3},
        {id:'cycles',label:'Cycles',min:1,max:100,step:1}
      ];
      let h = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
      for(const s of sliders){
        const val = this.params[s.id];
        h += `<label style="display:flex;gap:6px;align-items:center;">
                <span style="min-width:170px;text-align:right;">${s.label}</span>
                <input type="range" id="pop-${s.id}" min="${s.min}" max="${s.max}" step="${s.step}"
                       value="${val}" oninput="AzulianSim.update('${s.id}',this.value)" style="flex:1;">
                <span id="pop-${s.id}-val" style="width:110px;text-align:left;">${val}</span>
              </label>`;
      }
      h += `</div>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
              <button onclick="AzulianSim.refresh()">Run Simulation</button>
              <button onclick="AzulianSim.resetDefaults()">Reset Defaults</button>
            </div>`;
      return h;
    },

    update(id,val){
      const num = parseFloat(val);
      // allow very large integers for Nf0/Nm without scientific drift in label
      if (id === 'Nf0' || id === 'Nm' || id === 'cycles'){
        this.params[id] = +val;
      } else {
        this.params[id] = Number.isFinite(num) ? num : this.params[id];
      }
      const e = document.getElementById(`pop-${id}-val`);
      if(e) e.textContent = val;
    },

    resetDefaults(){
      this.params = {
        a0:0.22, ap:0.85, lambda:3, j:0.7, Y:2, pi:0.4, k:3,
        clanPrestige:0, Nf0:1e6, Nm:3e6, cycles:10
      };
      this.mount(this._lastContainerId || "azulian-sim");
    },

    refresh(){
      const c = document.getElementById("azulian-sim-output");
      if(!c) return;
      const d = this.run();
      c.innerHTML = this.renderTable(d);
    },

    // ---------------- Mount ----------------
    mount(containerId="azulian-sim"){
      this._lastContainerId = containerId;
      const root = document.getElementById(containerId);
      if(!root){ console.warn("[AzulianSim] container not found"); return; }
      root.innerHTML = `<h3>Azulian Population Simulator</h3>
        ${this.renderControls()}
        <div id="azulian-sim-output" style="margin-top:8px;">
          ${this.renderTable(this.run())}
        </div>`;
    }
  };

  // expose globally for slider callbacks
  window.AzulianSim = AzulianSim;
  // ---------------- Bootstrap ----------------
  function bootPop(){
    const id = "azulian-sim";
    if (document.getElementById(id)) window.AzulianSim.mount(id);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootPop);
  else bootPop();

})(); // end AzulianSim IIFE
