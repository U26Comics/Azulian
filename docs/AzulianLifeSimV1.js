/* Azulian Life Simulator — LogicEngineBase.js
 * Part 1/4 — Core, State, Utilities, Mount
 * Requires: window.FLAVOR (from FlavorTextBank.js)
 * Exports: window.AzulianLifeSim
 */
(function(){

// ─────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = p => Math.random() < p;            // p in [0,1]
const pick = arr => arr[Math.floor(Math.random() * arr.length)] || "";
const pct = v => `${Math.round(v)}%`;
const nowTs = () => Date.now();

// Advantage-style death check: if advantage is true, require BOTH rolls to be lethal.
function lethalRoll(prob, advantage=false){
  if (!advantage) return chance(prob);
  const a = chance(prob);
  const b = chance(prob);
  return a && b; // survive if either roll “saves”
}

// Child yearly mortality per-class → per-year probability such that cumulative over 16y hits target.
// M in [0,1] (total mortality by 16). p = 1 - (1 - M)^(1/16)
function perYearMortality(totalMortality){
  return 1 - Math.pow(1 - totalMortality, 1/16);
}

// ─────────────────────────────────────────────────────────────
// Flavor access
// ─────────────────────────────────────────────────────────────
function flavor(key, fallback){
  if (!window.FLAVOR) {
    console.warn("[Flavor] FlavorBank not loaded.");
    return `[FlavorBank missing: ${key}]`;
  }
  const bank = window.FLAVOR[key];
  if (!bank || !Array.isArray(bank) || bank.length === 0) {
    console.warn(`[Flavor] Missing or empty flavor category: ${key}`);
    return `[Missing flavor: ${key}]`;
  }
  return pick(bank);
}


// ─────────────────────────────────────────────────────────────
// Default configs (tunable balance knobs)
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  tickMonths: 6,
  hideYears: 4,
  deployYears: 4,
  baseLifespanYears: 80,

  // Ambient mortality by path for Wait/standard 6-month tick
  ambientMortality: {
    baseline: 0.15,
    outlander: 0.10,
    deployed: 0.05
  },

  // Childhood cumulative mortality to 16yo by parent-path at birth
  childTotalMortality: {
    baseline: 0.50,
    deployed: 0.20,
    outlander: 0.20,
    ratHunter: 0.70
  },

  // Jealousy timers (fires near every N years)
  jealousyPeriodYears: 4,

  // Outlander jealousy (low vs max stress)
  outlanderJealousy: {
    killHusbandLow: 0.15,
    killHusbandHigh: 0.50,
    poisonPlayerLow: 0.10,
    poisonPlayerHigh: 0.60
  },

  // Deployed jealousy base (increases +5% per husband)
  deployedJealousyBase: 0.05,

  // Union stealth, league stealth
  unionStealthFail: 0.10,
  unionHideKillPlayer: 0.20,

  leagueStealthFail: 0.10,
  leagueHideKillPlayer: 0.20,

  // Union/League member per-tick effects
  memberRecruitProb: 0.90,
  memberKilledProb: 0.10,

  // Union build cache
  cacheMembersCapacity: 10, // survive hiding per cache

  // Cull sighting trigger chance on successful cache build
  cullSightingChance: 0.05,

  // Sabotage outcomes
  sabotageFailSendHiding: true,
  sabotageSuccessRevoltBoost: 10,  // +10%
  sabotageSuccessStressDrop: 10,   // -10%

  // Revolt base success at 1000 members, scale to max at 10k
  revoltBaseAt1k: 0.10,

  // Purge base success at 1000 members
  purgeBaseAt1k: 0.10,

  // Rat Hunter safari/bloodsports
  safariSuccess: 0.90,
  safariDeath: 0.10,
  bloodsportsInfamy: 20,
  safariInfamy: 10,
  huntSuccess: 0.80,
  hookerRecruitOnHuntSuccess: 0.10, // also bumps future hunt success to 0.90
  annihilationPerTick: 0.10, // after first bloodsports

  // Gala investigate risks (recur every tick until resolved by founding League)
  galaHusbandKill: 0.10,
  galaPlayerKill: 0.10,

  // Duel
  duelDeath: 0.50,
  duelWinInfamy: 5,

  // Husband-taking
  takeHusbandRejectDeath: 0.10
};

// Derived child per-year mortalities
const CHILD_P = {
  baseline: perYearMortality(CONFIG.childTotalMortality.baseline),
  deployed: perYearMortality(CONFIG.childTotalMortality.deployed),
  outlander: perYearMortality(CONFIG.childTotalMortality.outlander),
  ratHunter: perYearMortality(CONFIG.childTotalMortality.ratHunter)
};

// ─────────────────────────────────────────────────────────────
// Game State model
// ─────────────────────────────────────────────────────────────
function makeNewState(){
  return {
    // Meta
    lifeId: Math.random().toString(36).slice(2),
    createdAt: nowTs(),
    alive: true,

    // Time & lifespan
    ageMonths: 0,
    lifespanYearsCap: CONFIG.baseLifespanYears, // +4 per deployment
    lastJealousyCheckYear: 0,

    // Identity flags (mutually exclusive major tracks)
    outlander: false,
    deployed: false,
    leagueActive: false,
    ratHunter: false,

    // Stats
    husbands: 0,
    infamy: 0,
    moralClarity: 0,
    financialStress: 0,  // 0..100
    globallyOutlanderAdvantage: false, // set after Revolt success (persists across cycles if you wire persistence)

    // Children — cohorts
    cohorts: [], // { id, ageMonths, size, female, male, dead, pathAtBirth, lastYearRolled, notes }

    // Union
    union: {
      created: false,
      size: 0,
      caches: 0,
      revoltChanceBoost: 0, // from sabotage, protest/subterfuge
      hidingActive: false
    },

    // League
    league: {
      created: false,
      size: 0,
      hideouts: 0, // (optional future capacity mechanic)
      hidingActive: false,
      hookerRecruited: false // boosts hunt success and Purge +10%
    },

    // Rat Hunter counters
    safariCount: 0,
    bloodsportsUnlocked: false,
    annihilationActive: false,

    // Event system (compact panel)
    activeEvent: null,      // "gala" | "cull" | null
    eventStage: null,       // string stage per event
    eventData: {},          // scratchpad per event

    // Gala retaliation (recurring until League officially founded)
    galaRetaliationActive: false,

    // UI log
    log: [], // newest-first strings
    // Collapsible UI toggles
    ui: {
      showHUD: true,
      showLog: true,
      showCohorts: true,
      showControls: true
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Logger (newest-first) and safe death gate
// ─────────────────────────────────────────────────────────────
function pushLog(s, msg){
  if (!msg) return;
  s.log.unshift(msg);
  // hard-limit log growth
  if (s.log.length > 500) s.log.length = 500;
}

function killPlayer(s, flavorKey){
  if (!s.alive) return;
  s.alive = false;
  pushLog(s, flavor(flavorKey, "You died."));
}

// ─────────────────────────────────────────────────────────────
// Main class
// ─────────────────────────────────────────────────────────────
class Life {
  constructor(){
    this.state = makeNewState();
    this._deathGate = false; // one lethal outcome per action/tick
  }

  // ── Utility: single-death-per-action gate
  _maybeKill(prob, flavorKey, {advantage=false} = {}){
    if (this._deathGate || !this.state.alive) return false;
    if (lethalRoll(prob, advantage)){
      killPlayer(this.state, flavorKey);
      this._deathGate = true;
      return true;
    }
    return false;
  }

  // ── Derived helpers
  yearsLived(){ return Math.floor(this.state.ageMonths / 12); }
  inYears(months){ return months / 12; }
  _jealousyDue(){
    const y = this.yearsLived();
    return (y - this.state.lastJealousyCheckYear) >= CONFIG.jealousyPeriodYears;
  }

  // ── Core time advancement
  timeTick(months = CONFIG.tickMonths){
    if (!this.state.alive) return;
    this._deathGate = false;

    // Advance time
    this.state.ageMonths += months;

    // Periodic checks (ambient mortality, jealousy, cohorts, recurring gala retaliation etc.)
    this._ambientMortalityCheck();
    if (!this._deathGate) this._cohortYearlyProcessing();
    if (!this._deathGate) this._jealousyChecks();
    if (!this._deathGate) this._galaRetaliationTick();
    if (!this._deathGate && this.state.ratHunter) this._ratHunterBackgroundTick();
    // Union/League background growth & stealth
    if (!this._deathGate) this._unionBackgroundTick();
    if (!this._deathGate) this._leagueBackgroundTick();

    // Aging out (lifespan cap is *potential* years; deployments increase it)
    const yrs = this.yearsLived();
    if (!this._deathGate && yrs >= this.state.lifespanYearsCap){
      this._maybeKill(1, "deathAccident"); // natural end; use a generic death flavor
    }
  }

  // Special advance that skips ambient/background checks (Deployment/Hiding)
  advanceYears(years){
    if (!this.state.alive) return;
    this.state.ageMonths += years * 12;
  }

  // ── Rendering hooks (wired later in Part 4)
  render(){ /* wired in Part 4 */ }
  _pushAndRender(key, fallback){
    pushLog(this.state, flavor(key, fallback));
    this.render();
  }

  // Public entry for mount to toggle UI panels
  togglePanel(panel){
    const u = this.state.ui;
    if (panel in u){
      u[panel] = !u[panel];
      this.render();
    }
  }
}

// Expose singleton controller
window.AzulianLifeSim = {
  mount(containerId){
    const root = document.getElementById(containerId);
    if (!root){ console.error("[AzulianLifeSim] Missing container"); return; }
    const life = new Life();
    window._life = life; // for debug/buttons
    // Attach render implementation (Part 4 will fill)
    life._mountRoot = root;
    life.render = renderBound(life); // defined in Part 4
    life.render();
  }
};

// Keep the class accessible for debugging (optional)
window.__AzulianLifeSimClass = Life;

// NOTE: The rest of the implementation continues in Parts 2–4 below.
})();
/* Azulian Life Simulator — LogicEngineBase.js
 * Part 2/4 — Ticks, Mortality, Cohorts, Jealousy
 * Relies on: Life class from Part 1, CONFIG, CHILD_P, helper fns
 */
(function(){

const Life = window.__AzulianLifeSimClass;

// Ambient mortality per tick (Wait/Reproduce/etc). Uses current main path.
Life.prototype._ambientMortalityCheck = function(){
  const s = this.state;
  if (!s.alive) return;

  // Determine path
  const path = s.deployed ? "deployed" : (s.outlander ? "outlander" : "baseline");
  const baseP = CONFIG.ambientMortality[path] || CONFIG.ambientMortality.baseline;

  // Global Outlander advantage (from past Revolt success): use advantage semantics
  const advantaged = !!s.globallyOutlanderAdvantage;

  // Try a single lethal check per tick
  this._maybeKill(baseP, path === "deployed" ? "deathExplorer" :
                        path === "outlander" ? "deathOutlander" :
                        "deathAccident",
                  {advantage: advantaged});
                  // PATCH — contextual pass-time flavor
if (s.alive) {
  const k =
    path === "deployed" ? "passTimeExplorer" :
    path === "outlander" ? "passTimeOutlander" :
    "passTime";
  pushLog(s, flavor(k));
}

};

// Cohort helpers
Life.prototype._addCohort = function({size, female, male, pathAtBirth}){
  const id = this.state.cohorts.length + 1;
  this.state.cohorts.push({
    id,
    ageMonths: 0,
    size,
    female,
    male,
    dead: 0,
    pathAtBirth,
    lastYearRolled: 0
  });
};

// Once per *year* milestones for cohorts: distribute mortality, trigger deployment at 18.
Life.prototype._cohortYearlyProcessing = function(){
  const s = this.state;
  if (!s.alive) return;

  for (const c of s.cohorts){
    if (c.size <= c.dead) continue; // all dead
    const years = Math.floor(c.ageMonths / 12);
    // Age them by the tick amount
    c.ageMonths += 0; // ageMonths already advanced in timeTick()

    // Process each whole year boundary once
    while (c.lastYearRolled < years && s.alive){
      c.lastYearRolled++;

      // Apply yearly child mortality up to 16yo
      if (c.lastYearRolled <= 16){
        const cls = (c.pathAtBirth in CHILD_P) ? c.pathAtBirth : "baseline";
        const pYear = CHILD_P[cls];
        // expected deaths this year ~ Binomial(survivors, pYear)
        const survivors = c.size - c.dead;
        let deaths = 0;
        for (let i=0; i<survivors; i++){
          if (chance(pYear)) deaths++;
        }
        if (deaths > 0){
          c.dead += deaths;
          const key = (cls === "ratHunter") ? "childDeathRat"
                   : (cls === "outlander") ? "childDeathOutlander"
                   : "childDeathExplorer";
          this._pushAndRender(key);
        }
      }

      // At 16yo: daughters may deploy
      if (c.lastYearRolled === 16 && s.alive){
        let females = c.female - Math.floor(c.dead * (c.female / c.size));
        if (females < 1) continue;

        if (c.pathAtBirth === "outlander"){
          // Only 50% of female offspring deploy; 80% mortality
          const willDeploy = Math.floor(females * 0.5);
          const mortality = 0.80;
          let deaths = 0, survivors = willDeploy;
          for (let i=0; i<willDeploy; i++) if (chance(mortality)) deaths++;
          if (deaths > 0){
            this._pushAndRender("deathBattleRookie");
          } else if (willDeploy > 0){
            this._pushAndRender("firstDeploymentSuccess");
          }
          // remove those who deployed from the cohort counts accordingly
          females -= willDeploy; // deployed (dead or survived) leave cohort tracking
          c.size -= willDeploy;
          if (c.dead > c.size) c.dead = c.size;
        } else {
          // All daughters deploy; 70% mortality
          const mortality = 0.70;
          let deaths = 0;
          for (let i=0; i<females; i++) if (chance(mortality)) deaths++;
          if (deaths > 0) this._pushAndRender("deathBattleRookie");
          else this._pushAndRender("firstDeploymentSuccess");
          // remove deploying daughters from cohort (they leave childhood tracking)
          c.size -= females;
          if (c.dead > c.size) c.dead = c.size;
        }
      }
    }
  }
};

// Jealousy checks every 4 years
Life.prototype._jealousyChecks = function(){
  const s = this.state;
  if (!s.alive) return;
  if (!this._jealousyDue()) return;

  const y = this.yearsLived();
  s.lastJealousyCheckYear = y;

  if (s.outlander && s.husbands > 1){
    // scale by financial stress (0..100) low→high mapping
    const t = clamp(s.financialStress, 0, 100) / 100;
    const killHProb = CONFIG.outlanderJealousy.killHusbandLow * (1 - t)
                    + CONFIG.outlanderJealousy.killHusbandHigh * t;
    const poisonPProb = CONFIG.outlanderJealousy.poisonPlayerLow * (1 - t)
                      + CONFIG.outlanderJealousy.poisonPlayerHigh * t;

    // Husband kills husband
    if (s.husbands > 1 && chance(killHProb)){
      s.husbands -= 1;
      this._pushAndRender("husbandJealouslyKillHusbandOutlander");
      if (!s.alive) return;
    }
    // Poison player (gated lethal)
    this._maybeKill(poisonPProb, "husbandJealousyPoisonPlayerOutlander");
  }

  if (s.deployed && s.husbands > 0){
    // jealousy increases +5% per husband above base 5%
    const base = CONFIG.deployedJealousyBase + (s.husbands * 0.05);
    // Event a: husband kills husband
    if (s.husbands > 1 && chance(base)){
      s.husbands -= 1;
      this._pushAndRender("husbandJealousyKillHusband");
    }
    // Event b: poison player
    this._maybeKill(base, "husbandJealousyPoisonPlayer");
  }
};

// Rat Hunter background hazards (after Safari unlocks)
Life.prototype._ratHunterBackgroundTick = function(){
  const s = this.state;
  if (!s.alive) return;

  // Post-safari domestic events: strangled husband OR husbands stab player
  // Base combined 10% per tick, scaled up by Infamy
  // We gate to only 1 lethal event per tick; make the domestic kill non-lethal to player if husband-strangled triggers.
  const base = 0.10 + clamp(s.infamy, 0, 100) / 200; // up to +0.5
  if (s.husbands > 0 && chance(base)){
    // 50/50 which event
    if (chance(0.5)){
      // Player strangles husband
      s.husbands = Math.max(0, s.husbands - 1);
      s.infamy += 10;
      this._pushAndRender("husbandStrangled");
    } else {
      // Husbands kill player (lethal)
      this._maybeKill(1, "stabbedByHusbands");
    }
  }

  // Annihilation events unlocked by first Bloodsports
  if (s.annihilationActive){
    this._maybeKill(CONFIG.annihilationPerTick, "annihilationFlavor");
  }
};

})();
/* Azulian Life Simulator — LogicEngineBase.js
 * Part 3/4 — Actions & Events
 * Relies on: Life class from Part 1, Parts 2 helpers
 */
(function(){

const Life = window.__AzulianLifeSimClass;

// ─────────────────────────────────────────────────────────────
// Button Visibility Helpers
// ─────────────────────────────────────────────────────────────
Life.prototype._can = function(action){
  const s = this.state;
  switch(action){
    case "reproduce": return s.alive;
    case "takeHusband": return s.alive;
    case "wait": return s.alive;
    case "joinOutlanders": return s.alive && !s.outlander && !s.deployed;
    case "createUnion": return s.alive && s.outlander && !s.union.created;
    case "expandUnion": return s.alive && s.outlander && s.union.created;
    case "buildCache": return s.alive && s.outlander && s.union.created;
    case "sabotage": return s.alive && s.outlander && s.union.created;
    case "revolt": return s.alive && s.outlander && s.union.created && s.union.size >= 1000;
    case "deploy": return s.alive && !s.outlander;
    case "attendGala": return s.alive && s.deployed && s.eventStage !== "gala_done" && !s.leagueActive && !s.ratHunter;
    case "startDuel": return s.alive && s.deployed;
    case "expandLeague": return s.alive && s.league.created;
    case "huntHunter": return s.alive && s.league.created;
    case "enactPurge": return s.alive && s.league.created && s.league.size >= 1000;
    case "safari": return s.alive && s.ratHunter;
    case "bloodsports": return s.alive && s.ratHunter && s.bloodsportsUnlocked;
    default: return false;
  }
};

// ─────────────────────────────────────────────────────────────
// Core Actions
// ─────────────────────────────────────────────────────────────
Life.prototype.reproduce = function(){
  const s = this.state;
  if (!this._can("reproduce")) return;

  // Preconditions
  if (s.outlander && s.husbands < 1){
    pushLog(s, flavor("OutlanderAsexual"));
    return; // no time passes
  }
  if (s.deployed && s.husbands < 1 && !s.ratHunter){
    pushLog(s, flavor("VetAsexual"));
    return; // no time passes
  }

  // Romance flavor by state
  if (s.outlander){
    pushLog(s, flavor(s.husbands > 1 ? "OutlanderPolyandrousRomance" : "OutlanderMonogamousRomance"));
  } else if (s.deployed){
    pushLog(s, flavor(s.husbands > 1 ? "ExplorerPolyandrousRomance" : "ExplorerMonogamousRomance"));
  }

  // Litter size 1-6, 50/50 split
  const litter = randInt(1,6);
  const female = Math.floor(litter * 0.5);
  const male   = litter - female;

  // Path at birth for cohort mortality
  const pathAtBirth = s.ratHunter ? "ratHunter" : (s.deployed ? "deployed" : (s.outlander ? "outlander" : "baseline"));
  this._addCohort({size: litter, female, male, pathAtBirth});

  // Financial Stress — Outlander monogamy penalty
  if (s.outlander){
    if (s.husbands <= 1) s.financialStress = clamp(s.financialStress + 10, 0, 100);
    // Polyandry mitigation per husband (for current stress). Represent as immediate drop:
    if (s.husbands > 1) s.financialStress = clamp(s.financialStress - 10 * (s.husbands - 1), 0, 100);
  }

  // Special Rat Hunter reproduction flavor
  if (s.ratHunter) pushLog(s, flavor("reproductionRatHunter"));

  // Passing time triggers ambient mortality etc.
  this.timeTick();
};

Life.prototype.takeHusband = function(){
  const s = this.state;
  if (!this._can("takeHusband")) return;

  // Acceptance logic
  let accepted = false;
  if (!s.deployed && !s.outlander){
    // 100% rejection baseline
    pushLog(s, flavor("husbandReject"));
    if (this._maybeKill(CONFIG.takeHusbandRejectDeath, "deathRival")) return;
  } else if (s.outlander){
    accepted = !chance(0.90); // 10% accept
    if (accepted) pushLog(s, flavor("husbandAcceptOutlander"));
    else {
      pushLog(s, flavor("husbandReject"));
      if (this._maybeKill(CONFIG.takeHusbandRejectDeath, "deathRival")) return;
    }
  } else if (s.deployed){
  // PATCH — Infamy-based acceptance tiers with 5% fear rejection
  if (s.infamy >= 75) {
    if (chance(0.05)) {
      // 5% reject out of fear (non-lethal)
      pushLog(s, flavor("husbandRejectFear"));
      accepted = false;
    } else {
      accepted = true;
      pushLog(s, flavor("husbandAcceptInfamous"));
    }
  } else {
    accepted = true;
    pushLog(s, flavor("husbandAcceptDeployed"));
  }
}
  if (accepted) s.husbands++;

  this.timeTick();
};

Life.prototype.wait = function(){
  if (!this._can("wait")) return;
  // Exactly one standard tick
  this.timeTick();
};

Life.prototype.joinOutlanders = function(){
  const s = this.state;
  if (!this._can("joinOutlanders")) return;

  // If trying to Deploy while Outlander later → immediate death handled in deploy()
  s.outlander = true;
  s.deployed = false;
  s.leagueActive = false;
  s.ratHunter = false;
  s.league.created = false;

  pushLog(s, flavor("outlanderJoin"));
  this.timeTick();
};

// Create Union (once per life)
Life.prototype.createUnion = function(){
  const s = this.state;
  if (!this._can("createUnion")) return;

  s.union.created = true;
  s.union.size = 1 + 1; // you + auto recruit 1
  pushLog(s, flavor("foundUnion"));
  this.timeTick();
};

Life.prototype.expandUnion = function(){
  const s = this.state;
  if (!this._can("expandUnion")) return;

  // 10% failure → death
  if (chance(0.10)){
    pushLog(s, flavor("redScareOutlander"));
    this._maybeKill(1, "redScareOutlander"); // lethal
    return;
  }
  s.union.size = Math.min(10000, s.union.size + 1);
  pushLog(s, flavor("unionGrowthTic"));
  this.timeTick();
};

Life.prototype.buildCache = function(){
  const s = this.state;
  if (!this._can("buildCache")) return;

  // 20% failure → death
  if (chance(0.20)){
    this._maybeKill(1, "buildUnionHideoutFail");
    return;
  }

  s.union.caches += 1;
  pushLog(s, flavor("buildUnionHideoutSuccess"));
  // 5% triggers Cull Sighting event
  if (!s.activeEvent && chance(CONFIG.cullSightingChance)){
    s.activeEvent = "cull";
    s.eventStage = "seen";
    pushLog(s, flavor("cullSighting"));
  }

  this.timeTick();
};

Life.prototype.sabotage = function(){
  const s = this.state;
  if (!this._can("sabotage")) return;

  const fail = chance(0.20);
  if (fail){
    pushLog(s, flavor("sabotageOutlanderFail"));
    // Send to hiding: advance years (no background checks), then stealth failure chance 20% kill
    s.union.hidingActive = true;
    this.advanceYears(CONFIG.hideYears);
    // On exiting hiding, kill uncovered members
    this._unionPurgeToCacheCapacity();
    // Exit hiding stealth resolution
    if (chance(CONFIG.unionHideKillPlayer)){
      this._maybeKill(1, "unionHidingFail");
      return;
    } else {
      pushLog(s, flavor("unionHidingSuccess"));
      s.union.hidingActive = false;
    }
  } else {
    pushLog(s, flavor("sabotageOutlanderSuccess"));
    s.union.revoltChanceBoost += CONFIG.sabotageSuccessRevoltBoost;
    s.financialStress = clamp(s.financialStress - CONFIG.sabotageSuccessStressDrop, 0, 100);
  }

  this.timeTick();
};

Life.prototype.revolt = function(){
  const s = this.state;
  if (!this._can("revolt")) return;

  // Revolt success probability scales with size from 1000→10000
  const size = clamp(s.union.size, 0, 10000);
  const scale = clamp((size - 1000) / 9000, 0, 1);
  let p = CONFIG.revoltBaseAt1k + scale * (1 - CONFIG.revoltBaseAt1k);
  p += (s.union.revoltChanceBoost || 0) / 100; // sabotage/protest/subterfuge boosts

  if (chance(p)){
    pushLog(s, flavor("unionRevoltSuccess"));
    // Success effects
    s.globallyOutlanderAdvantage = true; // future lives could persist if you wire storage
    s.financialStress = 0;
    // Union no longer needs checks
    s.union.hidingActive = false;
    // Lock out sabotage/expand/cache after success
  } else {
    // Failed revolt → hiding
    pushLog(s, flavor("unionHiding"));
    this.advanceYears(CONFIG.hideYears);
    // Kill player chance
    if (chance(CONFIG.unionHideKillPlayer)){
      this._maybeKill(1, "unionHidingFail"); // lethal
      return;
    } else {
      pushLog(s, flavor("unionHidingSuccess"));
      // purge to cache capacity
      this._unionPurgeToCacheCapacity();
    }
  }
  this.timeTick();
};

// Deployment (Deployed track). Kills Outlanders who attempt it.
Life.prototype.deploy = function(){
  const s = this.state;
  if (!this._can("deploy")) return;

  if (s.outlander){
    // Outlanders who try to deploy die with OutlanderTerroristAffiliation
    this._maybeKill(1, "OutlanderTerroristAffiliation");
    return;
  }

  const first = !s.deployed;
  // Mortality modifiers: Proven Daughter reduces mortality by 2% each. We'll derive from cohorts tagged “proven”.
  const provenDaughters = 0; // Hook: add if you track proven daughters count
  const provenReduction = Math.min(0.02 * provenDaughters, 0.50);
  let deathP = first ? 0.80 : 0.20;
  deathP = clamp(deathP - provenReduction, 0, 1);

  if (chance(deathP)){
    this._maybeKill(1, first ? "deathBattleRookie" : "deathBattleVet");
    return;
  }

  // Survived deployment
  s.deployed = true;
  s.infamy += 5;
  s.lifespanYearsCap += CONFIG.deployYears; // “does not physically age you; adds to potential cap”
  pushLog(s, flavor(first ? "firstDeploymentSuccess" : "vetDeploymentSuccess"));

  // Unlock Gala (button becomes visible)
  // Time passes 4y without stacked background checks
  this.advanceYears(CONFIG.deployYears);
};

// Duel
Life.prototype.startDuel = function(){
  const s = this.state;
  if (!this._can("startDuel")) return;

  // Death check modified by Morality & Infamy (more of both → better odds)
  const buff = clamp((s.infamy + s.moralClarity) / 200, 0, 0.45); // up to -45% death chance
  const pDeath = clamp(CONFIG.duelDeath - buff, 0.05, 0.95);

  if (chance(pDeath)){
    this._maybeKill(1, "dualDeath");
    return;
  }
  s.infamy += CONFIG.duelWinInfamy;
  pushLog(s, flavor("dualWin"));

  this.timeTick();
};

// ─────────────────────────────────────────────────────────────
// Background Union / League ticks
// ─────────────────────────────────────────────────────────────
Life.prototype._unionBackgroundTick = function(){
  const s = this.state;
  if (!s.outlander || !s.union.created || s.union.hidingActive || !s.alive) return;

  // Stealth check
  if (chance(CONFIG.unionStealthFail)){
    pushLog(s, flavor("unionHiding"));
    s.union.hidingActive = true;
    this.advanceYears(CONFIG.hideYears);
    // Exiting hiding stealth (kill chance)
    if (chance(CONFIG.unionHideKillPlayer)){
      this._maybeKill(1, "unionHidingFail");
      return;
    } else {
      pushLog(s, flavor("unionHidingSuccess"));
      s.union.hidingActive = false;
      this._unionPurgeToCacheCapacity();
    }
  }

  // Member churn: approximate per-member binomial
  const N = Math.min(s.union.size, 2000); // soft cap loop for performance
  let recruits = 0, killed = 0;
  for (let i=0; i<N; i++){
    if (chance(CONFIG.memberRecruitProb)) recruits++;
    else if (chance(CONFIG.memberKilledProb)) killed++;
  }
  s.union.size = clamp(s.union.size + recruits - killed, 0, 10000);

  if (killed > 0) pushLog(s, flavor("membersKilledYebaUnion"));
  if (recruits > 0) pushLog(s, flavor("unionGrowthTic"));
    // PATCH — union max-capacity flavor
if (s.union.size >= 10000 && !s.union._maxCapNoted) {
  s.union._maxCapNoted = true;
  pushLog(s, flavor("unionMaxCapacity"));
}
};

Life.prototype._unionPurgeToCacheCapacity = function(){
  const s = this.state;
  const cap = s.union.caches * CONFIG.cacheMembersCapacity;
  if (s.union.size > cap){
    s.union.size = cap;
    pushLog(s, flavor("unionHiding")); // reuse or add a specific “union purged” flavor
  }
};

// League background ticks
Life.prototype._leagueBackgroundTick = function(){
  const s = this.state;
  if (!s.league.created || s.league.hidingActive || !s.alive) return;

  // Stealth
  if (chance(CONFIG.leagueStealthFail)){
    pushLog(s, flavor("leagueHiding"));
    s.league.hidingActive = true;
    this.advanceYears(CONFIG.hideYears);
    if (chance(CONFIG.leagueHideKillPlayer)){
      this._maybeKill(1, "leagueHidingDeath");
      return;
    } else {
      pushLog(s, flavor("passTime")); // or leagueHidingSuccess
      s.league.hidingActive = false;
      // Optional: purge above capacity if modeled
    }
  }

  // Member churn
  const N = Math.min(s.league.size, 2000);
  let recruits = 0, killed = 0;
  for (let i=0; i<N; i++){
    if (chance(CONFIG.memberRecruitProb)) recruits++;
    else if (chance(CONFIG.memberKilledProb)) killed++;
  }
  s.league.size = clamp(s.league.size + recruits - killed, 0, 10000);
  if (killed > 0) pushLog(s, flavor("membersKilledRatHunters"));
  if (recruits > 0) pushLog(s, flavor("leagueGrowthTic"));
  // PATCH — league max-capacity flavor
if (s.league.size >= 10000 && !s.league._maxCapNoted) {
  s.league._maxCapNoted = true;
  pushLog(s, flavor("leagueMaxCapacity"));
}

};

// ─────────────────────────────────────────────────────────────
// Gala / League / Rat Hunter (Interactive Event Panel)
// ─────────────────────────────────────────────────────────────
Life.prototype.attendGala = function(){
  const s = this.state;
  if (!this._can("attendGala")) return;
  s.activeEvent = "gala";
  s.eventStage = "intro";
  pushLog(s, flavor("suspiciousElites"));
};

// Event panel actions (Gala)
Life.prototype.galaInvestigate = function(){
  const s = this.state;
  if (s.activeEvent !== "gala" || s.eventStage !== "intro") return;

  // 50% success path
  if (chance(0.50)){
    // success → can Found ADL with 10 members, +30 Moral Clarity
    pushLog(s, flavor("kickedRatHuntersFromGala"));
    s.eventStage = "found_league_ready";
  } else {
    // failure → kicked; retaliation risk enabled until League founded
    pushLog(s, flavor("galaKicked"));
    s.galaRetaliationActive = true;
    s.eventStage = "found_league_ready"; // still may found league, but with only 1 member by default
  }
};

Life.prototype.galaIgnore = function(){
  const s = this.state;
  if (s.activeEvent !== "gala" || s.eventStage !== "intro") return;

  // Recruit Rat Hunter: player chooses Join or Decline
  pushLog(s, flavor("recruitRatHunter"));
  s.eventStage = "rat_hunter_choice";
};

Life.prototype.galaJoinRatHunters = function(){
  const s = this.state;
  if (s.activeEvent !== "gala" || s.eventStage !== "rat_hunter_choice") return;

  s.ratHunter = true;
  s.leagueActive = false;
  s.league.created = false;
  s.infamy += 30;
  pushLog(s, flavor("joinRatHunters"));
  // unlock Safari
  s.activeEvent = null;
  s.eventStage = "gala_done";
};

Life.prototype.galaDeclineRatHunters = function(){
  const s = this.state;
  if (s.activeEvent !== "gala" || s.eventStage !== "rat_hunter_choice") return;

  pushLog(s, flavor("galaBadTaste"));
  s.activeEvent = null;
  s.eventStage = "gala_done";
};

Life.prototype.foundLeague = function(){
  const s = this.state;
  if (s.activeEvent !== "gala" || s.eventStage !== "found_league_ready") return;

  s.league.created = true;
  s.leagueActive = true;
  s.ratHunter = false;

  // If success path (kickedRatHuntersFromGala flavor) → start with 10 members; else with 1
  const successPath = s.log[0] && s.log[0].includes(flavor("kickedRatHuntersFromGala")); // heuristic
  s.league.size = successPath ? 10 : 1;

  s.moralClarity += 30;
  // League founded → stop retaliation
  s.galaRetaliationActive = false;

  pushLog(s, flavor("foundLeague") || "The Anti-Degeneracy League is founded.");
  s.activeEvent = null;
  s.eventStage = "gala_done";
};

// Recurring retaliation until League founded
Life.prototype._galaRetaliationTick = function(){
  const s = this.state;
  if (!s.galaRetaliationActive || s.league.created || !s.alive) return;

  // Reduce risk with higher Infamy & MoralClarity
  const damp = clamp((s.infamy + s.moralClarity)/200, 0, 0.8); // up to -80%
  const killHusbandP = clamp(CONFIG.galaHusbandKill * (1 - damp), 0, 1);
  const killPlayerP  = clamp(CONFIG.galaPlayerKill  * (1 - damp), 0, 1);

  if (s.husbands > 0 && chance(killHusbandP)){
    s.husbands -= 1;
    pushLog(s, flavor("husbandKilledbyRatHunters"));
  }
  this._maybeKill(killPlayerP, "killedByRatHunters");
};

// League actions
Life.prototype.expandLeague = function(){
  const s = this.state;
  if (!this._can("expandLeague")) return;

  // Net gain tick is managed in background; here we do a guaranteed recruit action
  s.league.size = Math.min(10000, s.league.size + 1);
  pushLog(s, flavor("leagueGrowthTic"));
  this.timeTick();
};

Life.prototype.huntHunter = function(){
  const s = this.state;
  if (!this._can("huntHunter")) return;

  let p = CONFIG.huntSuccess;
  if (s.league.hookerRecruited) p = 0.90;

  if (chance(p)){
    pushLog(s, flavor("leagueHunt"));
    s.moralClarity += 10;
    if (chance(CONFIG.hookerRecruitOnHuntSuccess)){
      s.league.hookerRecruited = true;
      pushLog(s, flavor("hookerRecruitSuccess"));
    }
  } else {
    this._maybeKill(1, "huntFailed");
    return;
  }
  this.timeTick();
};

Life.prototype.enactPurge = function(){
  const s = this.state;
  if (!this._can("enactPurge")) return;

  const size = clamp(s.league.size, 0, 10000);
  const scale = clamp((size - 1000) / 9000, 0, 1);
  let p = CONFIG.purgeBaseAt1k + scale * (1 - CONFIG.purgeBaseAt1k);
  p += clamp(s.moralClarity / 200, 0, 0.5); // boost from morality
  if (s.league.hookerRecruited) p = clamp(p + 0.10, 0, 1);

  if (chance(p)){
    pushLog(s, flavor("leaguePurgeSuccess"));
    // After successful purge, you could unlock Space Pirate later
  } else {
    pushLog(s, flavor("leaguePurgeFail"));
    // Failure → hiding
    s.league.hidingActive = true;
    this.advanceYears(CONFIG.hideYears);
    if (chance(CONFIG.leagueHideKillPlayer)){
      this._maybeKill(1, "leagueHidingDeath");
      return;
    } else {
      pushLog(s, flavor("passTime"));
      s.league.hidingActive = false;
    }
  }
  this.timeTick();
};

// Rat Hunter
Life.prototype.safari = function(){
  const s = this.state;
  if (!this._can("safari")) return;

  if (chance(CONFIG.safariSuccess)){
    s.infamy += CONFIG.safariInfamy;
    pushLog(s, flavor("safariFlavor"));
    s.safariCount += 1;
    if (s.safariCount >= 3) s.bloodsportsUnlocked = true;
  } else {
    // 10% death by hooker or outlanders
    const key = chance(0.5) ? "killedByHooker" : "killedByOutlanders";
    this._maybeKill(1, key);
    return;
  }
  this.timeTick();
};

Life.prototype.bloodsports = function(){
  const s = this.state;
  if (!this._can("bloodsports")) return;

  s.infamy += CONFIG.bloodsportsInfamy;
  if (!s.annihilationActive){
    s.annihilationActive = true;
    pushLog(s, flavor("firstBlood"));
  }
  pushLog(s, flavor("bloodFlavor"));
  this.timeTick();
};

// ─────────────────────────────────────────────────────────────
// Cull Sighting (Outlander event panel)
// ─────────────────────────────────────────────────────────────
Life.prototype.cullInvestigate = function(){
  const s = this.state;
  if (s.activeEvent !== "cull" || s.eventStage !== "seen") return;
  pushLog(s, flavor("investigateCull"));
  s.eventStage = "discovered";
  pushLog(s, flavor("discoverCullCompound"));
};

Life.prototype.cullIgnore = function(){
  const s = this.state;
  if (s.activeEvent !== "cull" || s.eventStage !== "seen") return;
  pushLog(s, flavor("ignoreCull"));
  s.activeEvent = null;
  s.eventStage = null;
};

Life.prototype.cullProtest = function(){
  const s = this.state;
  if (s.activeEvent !== "cull" || s.eventStage !== "discovered") return;

  const size = clamp(s.union.size, 0, 10000);
  // Linear scale 10% @ <1000 → 50% @ >=1000
  const p = (size < 1000) ? 0.10 : 0.50;
  if (chance(p)){
    pushLog(s, flavor("unionCullProtestSuccess"));
    s.union.revoltChanceBoost += 10; // +10%
  } else {
    pushLog(s, flavor("unionCullProtestFail"));
  }
  // Event ends with a long shadow/time skip (as per spec): 4 years, no background checks
  this.advanceYears(CONFIG.hideYears);
  s.activeEvent = null;
  s.eventStage = null;
};

Life.prototype.cullSubterfuge = function(){
  const s = this.state;
  if (s.activeEvent !== "cull" || s.eventStage !== "discovered") return;

  if (chance(0.50)){
    pushLog(s, flavor("unionCullSubterfugeSuccess"));
    s.union.revoltChanceBoost += 5; // +5%
  } else {
    pushLog(s, flavor("unionCullSubterfugeFail"));
  }
  this.advanceYears(CONFIG.hideYears); // time skip
  s.activeEvent = null;
  s.eventStage = null;
};

})();
/* Azulian Life Simulator — LogicEngineBase.js
 * Part 4 — Themed Rendering (Red-Terminal Bio-Horror)
 */
(function(){

const Life = window.__AzulianLifeSimClass;

// ─────────────────────────────────────────────
// Style injector – rusted command aesthetic
// ─────────────────────────────────────────────
function ensureStyles(root){
  if (root.__az_styles) return;
  const css = document.createElement("style");
  css.textContent = `
  /* --- Base Layer --- */
  .life-wrap{
    font-family: ui-monospace, Menlo, Consolas, monospace;
    background:
      radial-gradient(ellipse at center, rgba(255,40,40,0.05) 0%, transparent 60%),
      repeating-linear-gradient(0deg, rgba(20,20,20,0.4) 0, rgba(20,20,20,0.4) 1px,
                                      rgba(0,0,0,0.45) 2px),
      linear-gradient(180deg,#0a0a0a 0%,#1a1a1a 100%);
    color:#eae6df;
    border:1px solid #4a2b2b;
    box-shadow:0 0 30px rgba(200,40,40,0.15) inset;
    padding:12px; border-radius:8px;
    animation: crtFlicker 4s infinite linear;
  }

  /* --- Headings --- */
  .hud h3,.controls h3,.event-panel h3,.log h3,.cohorts h3{
    margin:0 0 8px 0; font-size:14px; color:#c72e2e;
    letter-spacing:0.05em; text-transform:uppercase;
    cursor:pointer; display:flex; align-items:center; gap:8px;
  }

  /* --- Panels --- */
  .hud,.controls,.event-panel,.log,.cohorts{
    background:rgba(0,0,0,0.45);
    border:1px solid rgba(199,46,46,0.3);
    border-radius:6px; padding:10px;
    box-shadow:0 0 8px rgba(199,46,46,0.15) inset;
  }

  .event-panel.active{
    animation: hazardPulse 2s infinite;
    border-color:#d67b00;
    box-shadow:0 0 10px rgba(214,123,0,0.3);
  }

  /* --- Stats & Buttons --- */
  .statline span{margin-right:12px;}
  .btnbar{display:flex;flex-wrap:wrap;gap:8px;}
  .btn{
    background:#111; border:1px solid #a13a3a;
    color:#eae6df; padding:6px 10px; cursor:pointer;
    text-transform:uppercase; font-size:12px; letter-spacing:0.05em;
    transition:all .2s;
    box-shadow:0 0 4px rgba(199,46,46,0.25) inset;
  }
  .btn:hover{
    color:#d67b00;
    border-color:#d67b00;
    box-shadow:0 0 6px rgba(214,123,0,0.4);
  }
  .btn:disabled{
    opacity:0.3; cursor:not-allowed;
  }

  /* --- Cohort Chips --- */
  .chip{
    background:rgba(214,123,0,0.08);
    border:1px solid rgba(214,123,0,0.2);
    color:#d67b00;
    padding:2px 6px; border-radius:999px;
    margin:2px; display:inline-block;
  }

  /* --- Log --- */
  .log-body{
    max-height:220px; overflow:auto;
    font-size:13px; line-height:1.4;
    background:rgba(0,0,0,0.3);
    border-top:1px solid rgba(199,46,46,0.2);
    border-bottom:1px solid rgba(199,46,46,0.2);
    padding:6px;
  }
  .log-body div{
    white-space:pre-wrap;
    color:#eae6df;
  }
  .log-body div::before{
    content:"> ";
    color:#d67b00;
  }
  .muted{opacity:0.7;}

  /* --- Animations --- */
  @keyframes crtFlicker{
    0%,19%,21%,23%,25%,54%,56%,100%{opacity:1;}
    20%,24%,55%{opacity:0.98;}
  }
  @keyframes hazardPulse{
    0%,100%{box-shadow:0 0 8px rgba(214,123,0,0.2);}
    50%{box-shadow:0 0 14px rgba(199,46,46,0.5);}
  }

  /* --- Red flash for lethal --- */
  body.flash-death::after{
    content:""; position:fixed; inset:0;
    background:rgba(255,0,0,0.2);
    animation: deathFlash .8s ease-out;
    pointer-events:none; z-index:9999;
  }
  @keyframes deathFlash{
    0%{opacity:0.7;} 100%{opacity:0;}
  }

  /* --- Responsive central column --- */
  @media(max-width:800px){
    .life-wrap{max-width:100%;margin:0 auto;}
  }
  `;
  root.appendChild(css);
  root.__az_styles = true;
}

// Inject small red flash when killed
function flashDeath(){
  document.body.classList.add("flash-death");
  setTimeout(()=>document.body.classList.remove("flash-death"),800);
}

// Monkeypatch killPlayer to trigger flash
const origKill = window.killPlayer;
if(origKill){
  window.killPlayer = function(s,flavorKey){
    flashDeath();
    return origKill(s,flavorKey);
  };
}

// ─────────────────────────────────────────────
// Renderer binding
// ─────────────────────────────────────────────
function renderBound(self){
  return function(){
    const s=self.state, root=self._mountRoot;
    ensureStyles(root);

    const open=(k)=>s.ui[k];
    const toggle=(k)=>`onclick="_life.togglePanel('${k}')"`; // safe

    const section=(label,key,body)=>
      `<div class="${key}">
         <h3 ${toggle(key)}> ${label} ${open(key)?"▾":"▸"}</h3>
         ${open(key)?body:""}
       </div>`;

    // HUD
    const hud=section("HUD","showHUD",`
      <div class="statline">
        <span><b>Age:</b> ${(s.ageMonths/12).toFixed(1)} yrs</span>
        <span><b>Alive:</b> ${s.alive?"Yes":"No"}</span>
        <span><b>Infamy:</b> ${s.infamy}</span>
        <span><b>Moral Clarity:</b> ${s.moralClarity}</span>
        <span><b>Husbands:</b> ${s.husbands}</span>
        <span><b>Stress:</b> ${s.financialStress}/100</span>
        <span><b>Union:</b> ${s.union.created?`${s.union.size} (caches ${s.union.caches})`:"—"}</span>
        <span><b>League:</b> ${s.league.created?`${s.league.size}`:"—"}</span>
        <span><b>Rat Hunter:</b> ${s.ratHunter?"Yes":"No"}</span>
      </div>`);

    // Cohorts
    const chips=s.cohorts.map(c=>{
      const alive=Math.max(0,c.size-c.dead);
      const y=Math.floor(c.ageMonths/12);
      return `<span class="chip">#${c.id} age:${y} (${alive}/${c.size})</span>`;
    }).join(" ");
    const cohorts=section("Cohorts","showCohorts",
      `<div class="cohorts-body">${chips||"<span class='muted'>None</span>"}</div>`);


// Controls
// ——— Only show actions when unlocked, but keep base ones visible for flavor
const b=(label, func)=>{
  const alwaysVisible = ["reproduce","takeHusband","wait"]; // base actions always on screen
  const can = self._can(func);

  // Always-visible buttons stay clickable for flavor; story-gated ones hidden until unlocked
  if (can || alwaysVisible.includes(func)) {
    const lockedClass = can ? "" : "locked"; // CSS variant, still clickable if you want flavor
    return `<button class="btn ${lockedClass}" onclick="_life.${func}()">${label}</button>`;
  }
  return "";
};

const controls = section("Controls","showControls",`
  <div class="btnbar">
    ${b("Reproduce","reproduce")}
    ${b("Take Husband","takeHusband")}
    ${b("Wait","wait")}
    ${b("Join Outlanders","joinOutlanders")}
    ${b("Create Union","createUnion")}
    ${b("Expand Union","expandUnion")}
    ${b("Build Cache","buildCache")}
    ${b("Sabotage","sabotage")}
    ${b("Revolt","revolt")}
    ${b("Deploy","deploy")}
    ${b("Attend Gala","attendGala")}
    ${b("Start Duel","startDuel")}
    ${b("Expand League","expandLeague")}
    ${b("Hunt Hunter","huntHunter")}
    ${b("Enact Purge","enactPurge")}
    ${b("Safari","safari")}
    ${b("Bloodsports","bloodsports")}
  </div>`);

// Event panel
const ep = s.activeEvent ? renderEventPanel(s) : "";

    // Log
    const logs=s.log.map(l=>`<div>${l}</div>`).join("");
    const log=section("Log","showLog",
      `<div class="log-body" id="life-log">${logs}</div>`);

    root.innerHTML=`<div class="life-wrap">${hud}${cohorts}${controls}${ep}${log}</div>`;
  };
}

// Compact Event Panel (hazard pulse)
function renderEventPanel(s){
  let t="",body="";
  if(s.activeEvent==="gala"){
    t="Elite Gala — Suspicious Elites";
    if(s.eventStage==="intro")
      body=btns(["Investigate","galaInvestigate"],["Ignore","galaIgnore"]);
    else if(s.eventStage==="rat_hunter_choice")
      body=btns(["Join Rat Hunters","galaJoinRatHunters"],["Decline","galaDeclineRatHunters"]);
    else if(s.eventStage==="found_league_ready")
      body=btns(["Found Anti-Degeneracy League","foundLeague"]);
  }else if(s.activeEvent==="cull"){
    t="Cull Sighting";
    if(s.eventStage==="seen")
      body=btns(["Investigate","cullInvestigate"],["Ignore","cullIgnore"]);
    else if(s.eventStage==="discovered")
      body=btns(["Protest","cullProtest"],["Subterfuge","cullSubterfuge"]);
  }
  return `<div class="event-panel active">
            <h3>Event</h3><div><b>${t}</b></div>${body||"<div class='muted'>No actions.</div>"}
          </div>`;
}

function btns(...pairs){
  return `<div class="btnbar">`+pairs.map(p=>`<button class="btn" onclick="_life.${p[1]}()">${p[0]}</button>`).join("")+`</div>`;
}

// Bind renderer factory globally
window.renderBound=renderBound;

})();

