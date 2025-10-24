    // ---------- Mortality & Death Handling ----------
    _applyCivilianMortality(lastAction = null){
      if(!this.s.alive) return;
      this._checkHusbands();

      // Base half-year civilian risk
      let p = (this.p.civilianAnnualMortality ?? 0.15) * 0.5;
      const cap = this._lifeCap();
      if(this.s.age > cap){
        const yrs = this.s.age - cap;
        p = Math.min(0.99, p + yrs * (this.p.senescentAnnual ?? 0.05) * 0.5);
      }

      if(!this._roll(p)) return;  // survived this period

      // --- Determine which pool of deaths to draw from ---
      const civilianCauses = [
        ["deathRival","Killed by rival wicker gang",0.15],
        ["deathRival","Killed by rat hunters",0.1],
        ["deathRival","Killed in worker uprising",0.1],
        ["deathAccident","Died of infection",0.1],
        ["deathPoison","Executed by Yebra for illegal farming",0.1],
        ["deathPoison","Executed by Yebra for sabotage",0.1],
        ["deathPoison","Executed by Yebra for terroristic activity",0.1],
        ["deathPoison","Executed by Yebra for involvement in organized crime",0.1],
      ];

      const veteranCauses = [
        ["deathRival","Killed in a duel",0.15],
        ["deathRival","Killed by outlanders while rat hunting",0.1],
        ["deathPoison","Killed by angry prostitute while slumming",0.1],
        ["deathAccident","Overdosed",0.1],
        ["deathPoison","Executed for Posadist-terror cell activities",0.1],
        ["deathPoison","Executed for space piracy",0.1],
        ["deathPoison","Executed for violating Yebra patent law",0.1],
        ["deathRival","Killed in a drunken brawl",0.1],
      ];

      const baseCauses = [
        ["deathAccident","Died in workplace accident",0.15],
        ["deathStarve","Starved to death",0.15],
        ["deathPoison","Poisoned by jealous husband",0.1],
        ["deathRival","Killed by rival House",0.1]
      ];

      let pool = baseCauses;
      if(!this.s.proven && this.s.deployments === 0) pool = pool.concat(civilianCauses);
      else if(this.s.proven || this.s.deployments > 0) pool = pool.concat(veteranCauses);

      // --- Old age check (only if 80+) ---
      if(this.s.age >= 80) pool.push(["deathOld","Died of old age",0.25]);

      // Normalize weights and choose cause
      const totalW = pool.reduce((a,[, ,w])=>a+w,0);
      let roll = Math.random()*totalW;
      for(const [type,msg,w] of pool){
        roll -= w;
        if(roll<=0){ this._die(type,msg); return; }
      }
      // fallback
      this._die("deathAccident","Died in unexplained circumstances");
    },

    // ---------- Husband Interaction Overrides ----------
    addHusband(){
      if(!this.s.alive) return;
      // 95 % rejection if not proven
      if(!this.s.proven){
        const rejected = Math.random() < 0.95;
        this.s.age += 0.5; // 6-month cooldown
        if(rejected){
          // 10 % chance violent retaliation
          if(Math.random() < 0.10){
            this._die("deathRival","Killed by prospective husband's House");
            return;
          }
          this._addLog("info","💔 Rejected by prospective husband for being poor.");
          this._applyCivilianMortality("husbandAttempt");
          this._renderStatus();
          return;
        }
      }
      this.s.husbands += 1;
      this.s.husbandAges.push(this.s.age);
      this._addLog("husbandAdd",`Took another husband. Total=${this.s.husbands}.`);
      this._renderStatus();
    },

    // ---------- Deployment Mortality ----------
    deploy(){
      if(!this.s.alive) return;
      const first = !this.s.proven;
      let m = first ? (this.p.rookieMortality ?? 0.8)
                    : (this.p.provenMortality ?? 0.2);
      m = Math.max(0, m * (1 - (this.p.prestigeBoostBeta ?? 0.5) * (+this.s.prestige || 0)));

      const survived = !this._roll(m);
      this.s.age += (this.p.deployYears ?? 4);
      this.s.deployments += 1;

      if(survived){
        if(first) this.s.proven = true;
        this._addLog("deploy",`Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age}`);
      } else {
        if(Math.random()<0.33)
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

})(); // end AzulianSim IIFE
