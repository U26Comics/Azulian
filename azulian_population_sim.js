/******************** MODULE 2 — Single-Female Life-Cycle ******************************/
const eventIcons = {
  reproduce:    { icon: "🌸", color: "#8fff8f" },
  wait:         { icon: "🕰", color: "#ffec8f" },
  deploy:       { icon: "🚀", color: "#8fff8f" },
  husbandAdd:   { icon: "💍", color: "#8fff8f" },
  husbandDeath: { icon: "⚰️", color: "#8fff8f" },
  prestige:     { icon: "🧬", color: "#8fff8f" },
  jealousyKill: { icon: "🔪", color: "#ff8f8f" },
  deathOld:     { icon: "⏳", color: "#ff8f8f" },
  deathBattle:  { icon: "☠️", color: "#ff8f8f" },
  deathAccident:{ icon: "⚙️", color: "#ff8f8f" },
  deathStarve:  { icon: "🥀", color: "#ff8f8f" },
  deathPoison:  { icon: "💔", color: "#ff8f8f" },
  deathRival:   { icon: "🩸", color: "#ff8f8f" }
};

const AzulianLifeSim = {
  // Complete config with safe defaults for all referenced keys
  p: {
    baseLifeIfProven: 120,
    baseLifeIfNeverProven: 80,
    rookieMortality: 0.8,
    provenMortality: 0.2,
    deployYears: 4,
    civilianAnnualMortality: 0.15,
    senescentAnnual: 0.05,
    gestationMonths: 6,
    litterMin: 1,
    litterMax: 6,
    juvenileSurvival: 0.7,
    provisioningBonusPerHusband: 0.05,
    husbandsMax: 6,
    socialConflictRiskPerYearOverCap: 0.15,
    prestigeBoostBeta: 0.5,
    prestigeThreshold: 4,
    daughterProvenProb: 0.2
  },
  s: {},

  // Centralized log rendering & persistence (hardened)
  addLog(type, msg) {
    try {
      const iconMap = eventIcons[type] || { icon: "", color: "#fff" };
      // Persist entry in state so renders don't lose history
      this.s.log = this.s.log || [];
      const entry = { type, msg, icon: iconMap.icon, color: iconMap.color, timestamp: Date.now() };
      this.s.log.push(entry);
      // Update HUD / log DOM in a centralized way
      this.renderLog();
      // Subtle fade-in effect for most recent item in HUD if present
      const hud = document.getElementById('life-recent');
      if (hud) {
        hud.innerHTML = `${iconMap.icon} <span style="color:${iconMap.color}">${msg}</span>`;
      }
    } catch (e) {
      console.error('[addLog]', e);
    }
  },

  renderLog() {
    try {
      const logBox = document.getElementById('life-log');
      if (!logBox) return;
      // Build HTML from persisted log entries (safe, small)
      const entries = (this.s.log || []).slice(-200); // cap to recent 200 entries
      let html = '';
      for (const en of entries) {
        const time = new Date(en.timestamp || Date.now()).toLocaleTimeString();
        html += `<div style="margin-bottom:6px;">${en.icon} <span style="color:${en.color}">${en.msg}</span> <span style="opacity:0.5;font-size:smaller">[${time}]</span></div>`;
      }
      logBox.innerHTML = html;
      logBox.scrollTop = logBox.scrollHeight;
    } catch (e) {
      console.error('[renderLog]', e);
    }
  },

  reset() {
    this.s = {
      age: 16,
      senescedYears: 0,
      alive: true,
      proven: false,
      deployments: 0,
      husbands: 1,
      husbandAges: [16],
      children: [],
      daughtersProven: 0,
      daughtersTotal: 0,
      prestige: 0,
      highPrestige: false,
      log: []
    };
    this.render();
    this.addLog('wait', 'Age 16: Reached maturity.');
  },

  roll(p) { return Math.random() < (Number.isFinite(p) ? p : 0); },

  lifeCap() {
    const base = this.s.proven ? this.p.baseLifeIfProven : this.p.baseLifeIfNeverProven;
    return base + (this.s.deployments | 0) * (this.p.deployYears ?? 4);
  },

  updatePrestige() {
    const d = this.s.daughtersTotal | 0;
    const dp = this.s.daughtersProven | 0;
    const prev = +this.s.prestige || 0;
    const frac = d > 0 ? (dp / d) : 0;
    this.s.prestige = Math.min(1, Math.max(0, frac));
    this.s.highPrestige = dp >= (this.p.prestigeThreshold ?? 4);
    if ((prev < 0.5 && this.s.prestige >= 0.5) || (prev < 1 && this.s.prestige === 1)) {
      this.addLog('prestige', 'Prestige increased!');
    }
  },

  civilianHalfYearMortality() {
    const baseAnnual = this.p.civilianAnnualMortality ?? 0.15;
    const baseHalf = 1 - Math.pow(1 - Math.min(0.95, baseAnnual), 0.5);
    const cap = this.s.highPrestige ? Infinity : (this.p.husbandsMax ?? 6);
    const over = Math.max(0, (this.s.husbands | 0) - (Number.isFinite(cap) ? cap : 6));
    const conflictAnnual = over * (this.p.socialConflictRiskPerYearOverCap ?? 0.15);
    const conflictHalf = 1 - Math.pow(1 - Math.min(0.95, conflictAnnual), 0.5);
    return Math.min(0.99, baseHalf + conflictHalf);
  },

  checkHusbands() {
    try {
      // Old age deaths for husbands
      const surv = [];
      for (const hAge of (this.s.husbandAges || [])) {
        if ((this.s.age - hAge) > 104) {
          this.addLog('husbandDeath', 'Husband died of old age.');
        } else {
          surv.push(hAge);
        }
      }
      this.s.husbandAges = surv;
      this.s.husbands = surv.length;
      // Husband-on-husband jealousy
      if (this.s.husbands >= 2) {
        const jealousP = 0.005 * (this.s.husbands - 1);
        if (Math.random() < jealousP) {
          this.s.husbands -= 1;
          this.s.husbandAges.pop();
          this.addLog('jealousyKill', 'One husband killed another out of jealousy.');
        }
      }
    } catch (e) {
      console.error('[checkHusbands]', e);
    }
  },

  reproduce() {
    if (!this.s.alive) return;
    try {
      const litter = rnd((this.p.litterMin ?? 1), (this.p.litterMax ?? 6));
      const jBase = this.p.juvenileSurvival ?? 0.7;
      const bonus = (this.p.provisioningBonusPerHusband ?? 0.05) * Math.max(0, (this.s.husbands | 0) - 1);
      const j = Math.min(0.95, Math.max(0, jBase * (1 + bonus)));
      let survive = 0, daughters = 0, proved = 0;
      for (let i = 0; i < litter; i++) {
        const sex = Math.random() < 0.5 ? 'F' : 'M';
        const adult = this.roll(j);
        let proven = false;
        if (sex === 'F' && adult) {
          proven = this.roll(this.p.daughterProvenProb ?? 0.2);
        }
        this.s.children.push({ sex, adult, proven });
        if (adult) survive++;
        if (sex === 'F') { daughters++; if (proven) proved++; }
      }
      this.s.daughtersTotal += daughters;
      this.s.daughtersProven += proved;
      this.updatePrestige();
      this.s.age += 0.5;
      this.s.senescedYears += 0.5;
      this.addLog('reproduce', `Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
      this.applyCivilianMortality();
      this.render();
    } catch (e) {
      console.error('[reproduce]', e);
    }
  },

  wait() {
    if (!this.s.alive) return;
    try {
      this.s.age += 0.5;
      this.s.senescedYears += 0.5;
      this.addLog('wait', `Waited 6 months. Age→${this.s.age.toFixed(1)}`);
      this.applyCivilianMortality();
      this.render();
    } catch (e) {
      console.error('[wait]', e);
    }
  },

  deploy() {
    if (!this.s.alive) return;
    try {
      const first = !this.s.proven;
      let m = first ? (this.p.rookieMortality ?? 0.8) : (this.p.provenMortality ?? 0.2);
      m = Math.max(0, m * (1 - (this.p.prestigeBoostBeta ?? 0.5) * (+this.s.prestige || 0)));
      const survived = !this.roll(m);
      this.s.age += (this.p.deployYears ?? 4);
      this.s.deployments += 1;
      if (survived) {
        if (first) this.s.proven = true;
        this.addLog('deploy', `Deployment ${this.s.deployments} survived. Mortality ${(m * 100).toFixed(1)}%. Age→${this.s.age}`);
      } else {
        this.die('deathBattle', 'Died in battle');
        return;
      }
      this.render();
    } catch (e) {
      console.error('[deploy]', e);
    }
  },

  addHusband() {
    if (!this.s.alive) return;
    try {
      this.s.husbands += 1;
      (this.s.husbandAges || []).push(this.s.age);
      this.addLog('husbandAdd', `Took another husband. Total=${this.s.husbands}.`);
      this.render();
    } catch (e) {
      console.error('[addHusband]', e);
    }
  },

  applyCivilianMortality() {
    if (!this.s.alive) return;
    try {
      this.checkHusbands();
      let p = this.civilianHalfYearMortality();
      const cap = this.lifeCap();
      if (this.s.age > cap) {
        const yrs = this.s.age - cap;
        const extraAnnual = Math.min(0.95, yrs * (this.p.senescentAnnual ?? 0.05));
        const extraHalf = 1 - Math.pow(1 - extraAnnual, 0.5);
        p = Math.min(0.99, p + extraHalf);
      }
      if (this.roll(p)) {
        const r = Math.random();
        if (r < 0.30) this.die('deathOld', 'Died of old age');
        else if (r < 0.45) this.die('deathAccident', 'Died in workplace accident');
        else if (r < 0.60) this.die('deathStarve', 'Starved to death');
        else if (r < 0.75) this.die('deathPoison', 'Poisoned by jealous husband');
        else this.die('deathRival', 'Killed by rival House');
      }
    } catch (e) {
      console.error('[applyCivilianMortality]', e);
    }
  },

  die(type, msg) {
    this.s.alive = false;
    this.addLog(type, `${msg}. Final age ${Number(this.s.age || 0).toFixed(1)}.`);
    this.render();
  },

  computeGIS() {
    let score = 0, max = 0;
    for (const ch of (this.s.children || [])) {
      max += 3;
      if (ch.adult) score += 1;
      if (ch.proven) score += 2;
    }
    const norm = max > 0 ? Math.round(100 * score / max) : 0;
    return { score, max, norm };
  },

  render() {
    try {
      const root = document.getElementById('azulian-life-sim');
      if (!root) return;
      const cap = this.lifeCap();
      const gis = this.computeGIS();

      // ----- compute values BEFORE template to avoid ReferenceError -----
      const total = (this.s.children?.length) || 0;
      const adults = (this.s.children?.filter(c => c.adult).length) || 0;
      const df = (this.s.children?.filter(c => c.sex === 'F').length) || 0;
      const dp = this.s.daughtersProven || 0;
      const controls = this.s.alive
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;"><button onclick="AzulianLifeSim.reproduce()">Reproduce</button><button onclick="AzulianLifeSim.wait()">Wait 6mo</button><button onclick="AzulianLifeSim.deploy()">Deploy 4y</button><button onclick="AzulianLifeSim.addHusband()">Add Husband</button><button onclick="AzulianLifeSim.reset()">Reset</button></div>`
        : `<div><button onclick="AzulianLifeSim.reset()">Reset</button></div>`;

      root.innerHTML = `
        <h3>Azulian Life-Cycle Simulator</h3>
        <div id="life-recent" style="margin:6px 0; font-weight:600;"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;">
          <div>
            <p><b>Status:</b> ${this.s.alive ? 'Alive' : 'Dead'}</p>
            <p><b>Age:</b> ${Number(this.s.age).toFixed(1)} / Cap ${Number(cap).toFixed(1)}</p>
            <p><b>Deployments:</b> ${this.s.deployments | 0}</p>
            <p><b>Husbands:</b> ${this.s.husbands | 0}</p>
            <p><b>Prestige:</b> ${Math.round((+this.s.prestige || 0) * 100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal | 0}</p>
            <p><b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} Proven daughters</p>
            <p><b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)</p>
            ${controls}
          </div>
          <div id="life-log" style="max-height:280px;overflow:auto;border:1px solid #444;padding:8px;border-radius:8px;"></div>
        </div>
        <p style="font-size:smaller;opacity:0.8;">Deaths: ⏳ old age, ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. Husbands senesce ~120y; prestige removes husband cap but social risk still accumulates; jealousy 🔪 can kill another husband.</p>
      `;

      // Render persisted log area and HUD after template injection
      this.renderLog();
    } catch (e) {
      console.error('[render]', e);
    }
  }
};

/******************** BOOTSTRAP (robust against late-load) *******************/
(function bootstrap() {
  function init() {
    try {
      const sim = document.getElementById('azulian-sim');
      if (sim) {
        sim.innerHTML = `<h3>Azulian Population Simulator</h3>${AzulianSim.renderControls()}<div id="azulian-sim-output">${AzulianSim.renderTable(AzulianSim.run())}</div>`;
      }
      const life = document.getElementById('azulian-life-sim');
      if (life) { AzulianLifeSim.reset(); }
    } catch (e) {
      console.error('[bootstrap.init]', e);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// Utility: integer in [min,max]
function rnd(min, max) { min = Math.floor(min); max = Math.floor(max); return Math.floor(Math.random() * (max - min + 1)) + min; }
