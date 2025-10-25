// ---------------------------------------------------------
// Azulian Life-Cycle Simulator (Outlander Build)
// ---------------------------------------------------------
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
    // ---------- Parameters ----------
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

    // ---------- MOUNT ----------
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

      // --- Base control buttons ---
      const controls=el("div",{style:{
        display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}},[
        el("button",{text:"Reproduce",onclick:()=>this.reproduce()}),
        el("button",{text:"Wait 6 mo",onclick:()=>this.wait()}),
        el("button",{text:"Deploy 4 y",onclick:()=>this.deploy()}),
        el("button",{text:"Add Husband",onclick:()=>this.addHusband()}),
        el("button",{text:"Reset (New Cycle)",onclick:()=>this.reset()})
      ]);
      left.appendChild(controls);
      // --- OUTLANDER CONTROLS + HUD ---
      this.s.outlander=false; this.s.unionSize=0;
      this.s.unionCaches=0; this.s.revolts=0;
      this.ui.outlanderWrap=el("div",{style:{marginTop:"8px",display:"flex",gap:"6px",flexWrap:"wrap"}});
      this.ui.unionHud=el("div",{style:{marginTop:"6px",fontSize:"12px",opacity:"0.85"}});

      const renderOutlanderControls=()=>{
        this.ui.outlanderWrap.innerHTML="";
        if(!this.s.proven&&!this.s.outlander){
          this.ui.outlanderWrap.appendChild(el("button",{text:"Join Outlanders",onclick:()=>this.joinOutlanders()}));
        }else if(this.s.outlander){
          if(this.s.unionSize<10)
            this.ui.outlanderWrap.appendChild(el("button",{text:"Start Labor Union",onclick:()=>this.startUnion()}));
          else{
            this.ui.outlanderWrap.appendChild(el("button",{text:"Expand Union",onclick:()=>this.expandUnion()}));
            this.ui.outlanderWrap.appendChild(el("button",{text:"Build Supply Cache",onclick:()=>this.buildSupplyCache()}));
            this.ui.outlanderWrap.appendChild(el("button",{text:"Sabotage Yebra Property",onclick:()=>this.sabotageYebra()}));
            if(this.s.unionSize>=1000)
              this.ui.outlanderWrap.appendChild(el("button",{text:"Start Workers’ Revolt",onclick:()=>this.startRevolt()}));
          }
        }
      };
      this.ui.renderOutlanderControls=renderOutlanderControls;
      left.appendChild(this.ui.outlanderWrap);
      left.appendChild(this.ui.unionHud);
      renderOutlanderControls();

      // --- Log window ---
      const right=el("div");
      const logBox=el("div",{id:"life-log",style:{
        maxHeight:"320px",overflow:"auto",border:"1px solid #444",
        padding:"8px",borderRadius:"8px",background:"#111"}});
      right.appendChild(logBox);
      grid.append(left,right);
      root.appendChild(grid);
      root.appendChild(el("p",{style:{fontSize:"12px",opacity:"0.8"},
        text:"Deaths: ⏳ old age, ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. Husbands senesce ≈120 y; prestige raises cap; jealousy 🔪 may kill one."}));

      this.ui.root=root;this.ui.logBox=logBox;
      this._initLife();this._renderStatus();this._newCycle();
    },

    // ---------- LOGGING ----------
    _addLog(type,msg){
      const icon=(eventIcons[type]||"");
      const color=type.startsWith("death")?eventColors.danger:
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
    // ---------- OUTLANDER METHODS ----------
    joinOutlanders(){
      if(!this.s.alive||this.s.proven||this.s.outlander)return;
      this.s.outlander=true;
      this._addLog("info","Joined the Outlanders. Deployment locked; death saves gain advantage; labor actions unlocked.");
      this.ui.renderOutlanderControls();this._renderStatus();
    },

    startUnion(){
      if(!this.s.alive||!this.s.outlander)return;
      if(this.s.unionSize>=10)return;
      this.s.unionSize=Math.max(1,this.s.unionSize||0);
      this._addLog("info","Began organizing a labor union.");
      this.ui.renderOutlanderControls();this._renderStatus();
    },

    expandUnion(){
      if(!this.s.alive||!this.s.outlander)return;
      if(Math.random()<0.10){this._die("deathPoison","Executed by Yebra for terroristic activity");return;}
      let recruited=0;
      const cascade=(n=1)=>{for(let i=0;i<n;i++){recruited++;if(Math.random()<0.10){}else if(Math.random()<0.90){cascade(1);}}};
      cascade(1);
      this.s.unionSize+=recruited;
      if(Math.random()<0.10){
        const survivors=Math.min(this.s.unionSize,(this.s.unionCaches||0)*10);
        if(survivors>0){
          this._addLog("danger",`Union purge! ${this.s.unionSize-survivors} executed; ${survivors} hid thanks to caches. 4y in hiding.`);
          this.s.unionSize=survivors;
          for(let y=0;y<8;y++){this.s.age+=0.5;if(Math.random()<0.20){this._applyCivilianMortality();if(!this.s.alive)return;}}
        }else{this._die("deathPoison","Executed by Yebra for terroristic activity");return;}
      }
      this._addLog("info",`Union expanded by ${recruited}. Members=${this.s.unionSize}.`);
      this._renderStatus();
    },

    buildSupplyCache(){
      if(!this.s.alive||!this.s.outlander)return;
      if(Math.random()<0.10){this._die("deathAccident","Executed by Yebra drone for suspicious activity");return;}
      this.s.unionCaches=(this.s.unionCaches||0)+1;
      this._addLog("info",`Built a supply cache. Total=${this.s.unionCaches}.`);
      this._renderStatus();
    },

    sabotageYebra(){
      if(!this.s.alive||!this.s.outlander)return;
      const bonus=Math.floor((this.s.unionSize||0)/10)*0.01;
      const success=Math.random()<Math.min(0.95,0.10+bonus);
      if(success)this._addLog("success","Sabotage succeeded!");
      else this._addLog("danger","Sabotage failed (no arrest).");
      this._renderStatus();
    },

    startRevolt(){
      if(!this.s.alive||!this.s.outlander||(this.s.unionSize||0)<1000)return;
      this.s.revolts=this.s.revolts||0;
      const p=Math.min(0.95,0.10+0.10*this.s.revolts);
      const ok=Math.random()<p;this.s.revolts++;
      if(ok){
        this._addLog("success","Workers’ Revolt succeeded! Advantage now global.");
        window.AzulianGlobal=window.AzulianGlobal||{};
        window.AzulianGlobal.globalOutlanderAdvantage=true;
      }else this._addLog("danger","Workers’ Revolt failed.");
      this._renderStatus();
    },
    // ---------- ADVANTAGE ON DEATH ROLLS ----------
    _rollDeath(p){
      const hasAdv=this.s.outlander||(window.AzulianGlobal&&window.AzulianGlobal.globalOutlanderAdvantage);
      const roll=()=>Math.random()<p;
      return hasAdv?(roll()&&roll()):roll(); // must fail twice if advantage
    },

    // replace _applyCivilianMortality internals:
    _applyCivilianMortality(lastAction=null){
      if(!this.s.alive)return;
      this._checkHusbands();
      let p=(this.p.civilianAnnualMortality??0.15)*0.5;
      const cap=this._lifeCap();
      if(this.s.age>cap){const yrs=this.s.age-cap;p=Math.min(0.99,p+yrs*(this.p.senescentAnnual??0.05)*0.5);}
      if(!this._rollDeath(p))return;
      if(lastAction==="husbandAttempt"&&!this.s.proven&&Math.random()<0.10){
        this._die("deathRival","Killed by prospective husband's House");return;
      }
      const baseCauses=[["deathAccident","Died in workplace accident",0.15],["deathStarve","Starved to death",0.15],...(this.s.husbands>0?[["deathPoison","Poisoned by jealous husband",0.10)]]:[]),["deathRival","Killed by rival House",0.10]];
      const pool=[...baseCauses];if(!this.s.proven&&this.s.deployments===0){pool.push(["deathRival","Killed by rival wicker gang",0.12]);pool.push(["deathRival","Killed by rat hunters",0.12]);}
      else if(this.s.proven||this.s.deployments>0){pool.push(["deathRival","Killed in a duel",0.12]);pool.push(["deathPoison","Overdosed",0.10]);}
      if(this.s.age>=80)pool.push(["deathOld","Died of old age",0.25]);
      const totalW=pool.reduce((a,[,,w])=>a+w,0);let r=Math.random()*totalW;
      for(const [t,m,w]of pool){r-=w;if(r<=0){this._die(t,m);return;}}
      this._die("deathAccident","Died in unexplained circumstances");
    },

    _renderStatus(){
      if(!this.ui.status)return;
      const cap=this._lifeCap();const gis=this._computeGIS();
      const total=this.s.children?.length||0;
      const adults=this.s.children?.filter(c=>c.adult).length||0;
      const df=this.s.children?.filter(c=>c.sex==="F").length||0;
      const dp=this.s.daughtersProven||0;
      this.ui.status.status.innerHTML=`<b>Status:</b> ${this.s.alive?'Alive':'Dead'}`;
      this.ui.status.age.innerHTML=`<b>Age:</b> ${this.s.age.toFixed(1)} / Cap ${cap.toFixed(1)}`;
      this.ui.status.tours.innerHTML=`<b>Deployments:</b> ${this.s.deployments|0}`;
      this.ui.status.husbands.innerHTML=`<b>Husbands:</b> ${this.s.husbands|0}`;
      this.ui.status.prestige.innerHTML=`<b>Prestige:</b> ${Math.round((+this.s.prestige||0)*100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal|0}`;
      this.ui.status.children.innerHTML=`<b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} proven daughters`;
      this.ui.status.gis.innerHTML=`<b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)`;

      if(this.ui.unionHud){
        const adv=(this.s.outlander||(window.AzulianGlobal&&window.AzulianGlobal.globalOutlanderAdvantage))?" (advantage)":"";
        const unionLine=(this.s.unionSize||0)>=10?` · Workers Union: ${this.s.unionSize}`:"";
        this.ui.unionHud.textContent=`Path: ${this.s.outlander?"Outlander":(this.s.proven?"Proven":"Civilian")}${adv}${unionLine}`;
      }
    }
  }; // end AzulianLifeSim

  // ---------- Bootstrap ----------
  function boot(){
    const id="azulian-life-sim";
    if(document.getElementById(id))window.AzulianLifeSim.mount(id);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
// ---------------------------------------------------------
// Azulian Population Simulator — Independent Module
// ---------------------------------------------------------
(function(){
  const AzulianSim = {
    // ---------------- Parameters ----------------
    params:{
      a0:0.22,       // rookie survival
      ap:0.85,       // proven survival
      lambda:3,      // mean litter
      j:0.7,         // juvenile survival
      Y:2,           // years ashore
      pi:0.4,        // redeploy fraction
      k:3,           // polyandry level
      clanPrestige:0.0, // clan prestige multiplier
      Nf0:1e6,       // initial rookies (females)
      Nm:3e6,        // adult males
      cycles:10
    },

    // ---------------- Core simulation ----------------
    step(state,p){
      const a0 = +p.a0 ?? 0.22,
            ap = +p.ap ?? 0.85,
            λ  = +p.lambda ?? 3,
            j  = +p.j ?? 0.7,
            Y  = +p.Y ?? 2,
            π  = +p.pi ?? 0.4,
            k  = Math.max(1, +p.k ?? 3),
            prestige = +p.clanPrestige ?? 0,
            Nm = +p.Nm ?? 1e6;

      const apEff = ap * (1 + 0.2 * prestige);
      const newProven  = (state.R || 0) * a0;
      const provenNext = (state.P || 0) * apEff;
      const shoreProven = (state.P || 0) * (1 - π);
      const birthsPerFemale = 2 * λ * j * Y;
      const daughters = shoreProven * birthsPerFemale * 0.5;
      const nextR = daughters;

      const Ne = (4 * (shoreProven * Nm) / Math.max(1,(shoreProven+Nm))) *
                 (1 - 1 / Math.max(1, k));

      return { R: nextR, P: newProven + provenNext, daughters, Ne };
    },

    run(){
      const p = this.params;
      let s = { R: +p.Nf0 || 0, P: 0 };
      const out = [];
      for(let t=0; t < (+p.cycles || 0); t++){
        s = this.step(s, p);
        out.push({
          cycle: t+1,
          rookies: s.R, proven: s.P,
          daughters: s.daughters, Ne: s.Ne
        });
      }
      return out;
    },

    // ---------------- Rendering ----------------
    renderTable(data){
      let h = `<table style="width:100%;border-collapse:collapse;text-align:center;">
      <tr><th>Cycle</th><th>Rookies</th><th>Proven</th>
      <th>Daughters</th><th>Effective Pop (Ne)</th></tr>`;
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
      h += "</table>";
      return h;
    },

    renderControls(){
      const sliders = [
        {id:'a0',label:'Rookie Survival (a₀)',min:0.1,max:0.5,step:0.01},
        {id:'ap',label:'Proven Survival (aₚ)',min:0.6,max:0.99,step:0.01},
        {id:'lambda',label:'Litter Size (λ)',min:1,max:6,step:0.1},
        {id:'j',label:'Juvenile Survival (j)',min:0.4,max:0.9,step:0.01},
        {id:'Y',label:'Years Ashore (Y)',min:0.5,max:4,step:0.1},
        {id:'pi',label:'Redeploy Fraction (π)',min:0,max:0.9,step:0.05},
        {id:'k',label:'Polyandry Level (k)',min:1,max:6,step:1},
        {id:'clanPrestige',label:'Clan Prestige',min:0,max:1,step:0.05}
      ];
      let h = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
      for(const s of sliders){
        const val = this.params[s.id];
        h += `<label>${s.label}: 
                <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}"
                       value="${val}" oninput="AzulianSim.update('${s.id}',this.value)">
                <span id="${s.id}-val">${val}</span>
              </label>`;
      }
      h += `</div><button onclick="AzulianSim.refresh()">Run Simulation</button>`;
      return h;
    },

    update(id,val){
      this.params[id] = parseFloat(val);
      const e = document.getElementById(`${id}-val`);
      if(e) e.textContent = val;
    },

    refresh(){
      const c = document.getElementById("azulian-sim-output");
      if(!c) return;
      const d = this.run();
      c.innerHTML = this.renderTable(d);
    },

    // ---------------- Mount ----------------
    mount(containerId="azulian-sim"){
      const root = document.getElementById(containerId);
      if(!root){ console.warn("[AzulianSim] container not found"); return; }
      root.innerHTML = `<h3>Azulian Population Simulator</h3>
        ${this.renderControls()}
        <div id="azulian-sim-output" style="margin-top:8px;">
          ${this.renderTable(this.run())}
        </div>`;
    }
  };

  // Expose globally
  window.AzulianSim = AzulianSim;

  // ---------------- Bootstrap ----------------
  function boot(){
    const id = "azulian-sim";
    if(document.getElementById(id)) AzulianSim.mount(id);
  }
  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
