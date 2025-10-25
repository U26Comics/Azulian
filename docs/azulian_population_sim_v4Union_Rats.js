/* Azulian Life-Cycle & Population Simulators — Bundled Build
   Outlanders + Union (civilian)  AND  Infamy + Rat Hunters + Anti-Degeneracy League (deployed)
   Carrd / GitHub Pages compatible, pure JS, UTF-8.
   Exposes: window.AzulianLifeSim, window.AzulianSim
   Version: 2025-10-24
*/
(function(){

// ============================================================================
// SHARED UTILITIES
// ============================================================================
const C = {
  colors:{
    default:"#eaeaea", cycle:"#7ee7ff", success:"#8fff8f",
    info:"#ffec8f", danger:"#ff8f8f"
  },
  icons:{
    reproduce:"🌸", wait:"🕰", deploy:"🚀",
    husbandAdd:"💍", husbandDeath:"⚰️",
    prestige:"🧬", jealousyKill:"🔪",
    deathOld:"⏳", deathBattle:"☠️",
    deathAccident:"⚙️", deathStarve:"🥀",
    deathPoison:"💔", deathRival:"🩸",
    union:"🛠️", cache:"📦", sabotage:"🧨",
    revolt:"🔥", outlander:"🏹",
    duel:"⚔️", gala:"🎭", rat:"🐀", hooker:"👠", blood:"🩸",
    league:"🛡️", purge:"🧹"
  }
};
const rnd=(a,b)=>{a|=0;b|=0;return Math.floor(Math.random()*(b-a+1))+a;};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const el=(tag,attrs={},children=[])=>{
  const n=document.createElement(tag);
  for(const[k,v] of Object.entries(attrs)){
    if(k==="style"&&v&&typeof v==="object") Object.assign(n.style,v);
    else if(k.startsWith("on")&&typeof v==="function") n[k]=v;
    else if(k==="text") n.textContent=v;
    else n.setAttribute(k,v);
  }
  (Array.isArray(children)?children:[children]).forEach(c=>c&&n.appendChild(c));
  return n;
};

// ============================================================================
// LIFE-CYCLE SIMULATOR
// ============================================================================
const Life = {

  // ---------- Parameters ----------
  p:{
    baseLifeIfProven:120, baseLifeIfNeverProven:80,
    rookieMortality:0.80, provenMortality:0.20,
    deployYears:4,
    civilianAnnualMortality:0.15,
    senescentAnnual:0.05,
    gestationMonths:6, litterMin:1, litterMax:6,
    juvenileSurvival:0.70,
    provisioningBonusPerHusband:0.05,
    husbandsMax:6, socialConflictRiskPerYearOverCap:0.15,
    prestigeBoostBeta:0.50, prestigeThreshold:4,
    daughterProvenProb:0.20,

    // Outlanders / Union
    outlanderAdvantage:0.50,
    unionConvertPass:0.90,   // per-member auto-recruit each 6mo
    unionConvertDeath:0.10,
    unionExpandDeath:0.10,   // leader risk on manual recruit
    unionCacheDeath:0.10,
    unionStealthFail:0.10,
    unionCacheSave:10,
    unionHideYears:4,

    // Revolt (permanent advantage stacks)
    revoltUnlockAt:1000,
    revoltBaseSuccess:0.10,
    revoltStackBonus:0.10,

    // Deployed Path: Infamy / Duel / Rat Hunters / League
    duelBaseWin:0.50,          // 50% base
    duelPerDeploy:0.10,        // +10% per successful deployment
    duelPerWin:0.05,           // +5% per past duel win
    infamyPerDeploy:5,         // +5 infamy per successful deployment
    infamyPerDuelWin:5,        // +5 per duel win
    infamyJoinRat:30,          // +30 when joining rat hunters
    infamySafariSuccess:5,     // +5 per successful safari
    infamyBloodSports:50,      // +50 when attending blood sports
    safariOutlanderDeath:0.10, // 10% killed by outlanders on safari
    safariHookerDeath:0.05,    // 5% eviscerated by cybernetic hooker
    bloodAnnihilateChance:0.10,// 10% per 6mo annihilation while flagged
    ratHunterAggroBonus:0.10,  // +10% weight to "killed by rat hunters" etc
    leagueConvertPass:0.90,    // same as union
    leagueConvertDeath:0.10,   // same as union
    leagueExpandDeath:0.10,    // leader risk
    leagueHideDeathRisk:0.20,  // 20% player death during hide skip
    leagueStealthFail:0.10,    // 10% fail per 6mo
    leagueCacheSave:10,        // preserved per hideout
    leagueHideYears:4,
    leaguePurgeUnlockAt:1000,
    leaguePurgeSuccess:0.50,   // 50% success
    huntHunterDeath:0.05,      // 5% killed by rat hunters
    huntHookerRecruit:0.05,    // 5% recruit cybernetic hooker (once)
    duelMaxWin:0.95            // clamp duel success
  },

  // ---------- Global & State ----------
  s:{}, cycleCount:0, ui:{}, currentCycleBody:null,
  global:{
    advantageStacks:0, // each successful Revolt or League Purge increments
  },

  // ========================================================================
  // INIT + MOUNT
  // ========================================================================
  mount(containerId="azulian-life-sim"){
    const root=document.getElementById(containerId);
    if(!root){console.error("[AzulianLifeSim] Missing container");return;}
    root.innerHTML="";
    root.appendChild(el("h3",{text:"Azulian Life-Cycle Simulator"}));

    const grid=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignItems:"start"}});
    const left=el("div");
    this.ui.status={
      status:el("p"), age:el("p"), tours:el("p"),
      husbands:el("p"), prestige:el("p"),
      children:el("p"), gis:el("p"),
      union:el("p"), infamy:el("p"), league:el("p")
    };
    left.append(
      this.ui.status.status,this.ui.status.age,this.ui.status.tours,
      this.ui.status.husbands,this.ui.status.prestige,
      this.ui.status.children,this.ui.status.gis,
      this.ui.status.infamy,this.ui.status.union,this.ui.status.league
    );

    // Controls
    const controls=el("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}});
    // core
    this.ui.btnRepro = el("button",{text:"Reproduce",onclick:()=>this.reproduce()});
    this.ui.btnWait  = el("button",{text:"Wait 6mo",onclick:()=>this.wait()});
    this.ui.btnDeploy= el("button",{text:"Deploy 4y",onclick:()=>this.deploy()});
    this.ui.btnHusb  = el("button",{text:"Add Husband",onclick:()=>this.addHusband()});
    this.ui.btnReset = el("button",{text:"Reset (New Cycle)",onclick:()=>this.reset()});
    // outlander / union
    this.ui.btnOut   = el("button",{text:"Join Outlanders",onclick:()=>this.joinOutlanders()});
    this.ui.btnUnion = el("button",{text:"Start Labor Union",onclick:()=>this.startUnion()});
    this.ui.btnExpand= el("button",{text:"Expand Union",onclick:()=>this.expandUnion()});
    this.ui.btnCache = el("button",{text:"Build Supply Cache",onclick:()=>this.buildCache()});
    this.ui.btnSabot = el("button",{text:"Sabotage Yebra Property",onclick:()=>this.sabotage()});
    this.ui.btnRevolt= el("button",{text:"Start Workers' Revolt",onclick:()=>this.revolt()});
    // deployed path — infamy / duel / gala
    this.ui.btnDuel  = el("button",{text:"Start Duel",onclick:()=>this.startDuel()});
    this.ui.btnGala  = el("button",{text:"Attend Elite Gala",onclick:()=>this.attendGala()});
    // gala branch ephemeral choices
    this.ui.btnGalaIgnore = el("button",{text:"Ignore",onclick:()=>this.galaIgnore()});
    this.ui.btnGalaInv    = el("button",{text:"Investigate",onclick:()=>this.galaInvestigate()});
    // rat hunter branch
    this.ui.btnJoinRat = el("button",{text:"Join Rat Hunters",onclick:()=>this.joinRatHunters()});
    this.ui.btnDecline = el("button",{text:"Decline",onclick:()=>this.galaDecline()});
    this.ui.btnSafari  = el("button",{text:"Attend Safari",onclick:()=>this.attendSafari()});
    this.ui.btnBlood   = el("button",{text:"Attend Blood Sports",onclick:()=>this.attendBloodSports()});
    // league branch (anti-degeneracy)
    this.ui.btnFormLeague   = el("button",{text:"Form Anti-Degeneracy League",onclick:()=>this.formLeague()});
    this.ui.btnLeagueExpand = el("button",{text:"Expand League",onclick:()=>this.expandLeague()});
    this.ui.btnLeagueCache  = el("button",{text:"Build Hideout",onclick:()=>this.buildHideout()});
    this.ui.btnHuntHunter   = el("button",{text:"Hunt the Hunter",onclick:()=>this.huntTheHunter()});
    this.ui.btnLeaguePurge  = el("button",{text:"Enact Purge",onclick:()=>this.enactPurge()});

    controls.append(
      this.ui.btnRepro,this.ui.btnWait,this.ui.btnDeploy,this.ui.btnHusb,
      this.ui.btnOut,this.ui.btnUnion,this.ui.btnExpand,this.ui.btnCache,this.ui.btnSabot,this.ui.btnRevolt,
      this.ui.btnDuel,this.ui.btnGala,this.ui.btnGalaIgnore,this.ui.btnGalaInv,this.ui.btnJoinRat,this.ui.btnDecline,
      this.ui.btnSafari,this.ui.btnBlood,
      this.ui.btnFormLeague,this.ui.btnLeagueExpand,this.ui.btnLeagueCache,this.ui.btnHuntHunter,this.ui.btnLeaguePurge,
      this.ui.btnReset
    );
    left.appendChild(controls);

    const right=el("div");
    const logBox=el("div",{id:"life-log",style:{maxHeight:"360px",overflow:"auto",border:"1px solid #444",padding:"8px",borderRadius:"8px",background:"#111"}});
    right.appendChild(logBox);
    grid.append(left,right);
    root.appendChild(grid);
    root.appendChild(el("p",{style:{fontSize:"12px",opacity:"0.8"},text:
      "Deaths: ⏳ old age (80+), ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. "+
      "Outlanders reduce civilian death risk and unlock union; deployed unlocks duels, galas, rat hunts, and the Anti-Degeneracy League."
    }));

    this.ui.root=root; this.ui.logBox=logBox;
    this._initLife(); this._renderStatus(); this._newCycle();
  },

  // ========================================================================
  // LOGGING
  // ========================================================================
  _addLog(type,msg){
    const icon=(C.icons[type]||"");
    const color=
      type.startsWith("death")?C.colors.danger:
      (["prestige","union","revolt","cache","sabotage","duel","gala","rat","blood","league","purge"].includes(type)?C.colors.success:
      (["wait","husbandAdd","husbandDeath","jealousyKill"].includes(type)?C.colors.info:C.colors.default));
    const entry=el("div");
    entry.innerHTML=`${icon} <span style="color:${color}">${msg}</span>`;
    entry.style.opacity="0.3";
    if(this.currentCycleBody){
      this.currentCycleBody.appendChild(entry);
      // JS fade-in
      let o=0.3;
      const f=setInterval(()=>{o+=0.05;entry.style.opacity=o.toFixed(2);if(o>=1)clearInterval(f);},30);
    }
    if(this.ui.logBox) this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
  },

  _newCycle(){
    this.cycleCount++;
    const wrap=el("details",{open:true});
    const sum=el("summary");
    sum.innerHTML=`<span style="color:${C.colors.cycle};font-weight:600;">🌀 Enter Cycle ${this.cycleCount} — Age 16: Reached maturity.</span>`;
    const body=el("div",{class:"cycle-body",style:{marginLeft:"1em"}});
    wrap.append(sum,body);
    this.ui.logBox.appendChild(wrap);
    this.currentCycleBody=body;
    this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
  },

  // ========================================================================
  // CORE LIFECYCLE HELPERS
  // ========================================================================
  _initLife(){
    this.s={
      age:16, alive:true, proven:false, deployments:0,
      husbands:0, husbandAges:[],
      children:[], daughtersProven:0, daughtersTotal:0,
      prestige:0, highPrestige:false,

      // Civilian path: Outlanders + Union
      outlander:false, unionMembers:0, unionCaches:0,
      unionHiddenUntil:null, lastStealthTickAge:16,

      // Deployed path: Infamy, Duel, Gala → Rat Hunters OR League
      infamy:0, duelWins:0,
      galaState:null, // null | 'intro' | 'ignore' | 'investigate'
      joinedRatHunters:false, ratSafariCount:0, bloodSports:false, annihilationActive:false,
      ratHunterAggro:false, // sets +10% weights on rat-hunter deaths
      safariUnlockedHusbandRisks:false, // unlock stabbed-by-husbands + strangled-husband
      husbandsStrangledChance:0.05, // chance per 6mo to log husband strangled (if safari>=1)

      // League (Anti-Degeneracy) — mirrors union
      leagueMembers:0, leagueCaches:0, leagueHiddenUntil:null,
      lastLeagueStealthTickAge:16, leagueActive:false, cyberHooker:false
    };
  },

  _lifeCap(){
    const base=this.s.proven?this.p.baseLifeIfProven:this.p.baseLifeIfNeverProven;
    return base+(this.s.deployments|0)*(this.p.deployYears??4);
  },

  _updatePrestige(){
    const d=this.s.daughtersTotal|0,dp=this.s.daughtersProven|0;
    const prev=+this.s.prestige||0;
    const frac=d>0?(dp/d):0;
    this.s.prestige=Math.min(1,Math.max(0,frac));
    this.s.highPrestige=dp>=(this.p.prestigeThreshold??4);
    if((prev<0.5&&this.s.prestige>=0.5)||(prev<1&&this.s.prestige===1))
      this._addLog("prestige","Prestige increased!");
  },

  _roll(p){return Math.random()<(Number.isFinite(p)?p:0);},

  // Apply global permanent advantages (from successful revolts/purges)
  _applyAdvantageStacks(p){
    const stacks=this.global.advantageStacks|0;
    if(stacks<=0) return p;
    const adv=(this.p.outlanderAdvantage||0.5);
    // multiplicative stacking: each stack multiplies by (1 - adv)
    for(let i=0;i<stacks;i++) p=p*(1-adv);
    return p;
  },

  _advantagePersonal(p){
    // personal Outlander status halves risk on top of global stacks
    if(this.s.outlander) p=p*(1-(this.p.outlanderAdvantage||0.5));
    return p;
  },

  _infamyReduce(p){
    // infamy reduces "overall death probability" by equal percentage (max 100)
    const f=clamp(this.s.infamy||0,0,100)/100;
    return p*(1-f);
  },

  _checkHusbands(){
    const alive=[];
    for(const hAge of(this.s.husbandAges||[])){
      if((this.s.age-hAge)>104) this._addLog("husbandDeath","Husband died of old age.");
      else alive.push(hAge);
    }
    this.s.husbandAges=alive;
    this.s.husbands=alive.length;

    // jealousy murder (husband vs husband)
    if(this.s.husbands>=2){
      const jealousP=0.005*(this.s.husbands-1);
      if(Math.random()<jealousP){
        this.s.husbands-=1;this.s.husbandAges.pop();
        this._addLog("jealousyKill","One husband killed another out of jealousy.");
      }
    }

    // post-safari ambient husband death (strangled by player) — only if safari≥1
    if(this.s.husbands>0 && this.s.safariUnlockedHusbandRisks){
      if(Math.random()<(this.s.husbandsStrangledChance||0.05)){
        this.s.husbands-=1;this.s.husbandAges.pop();
        this._addLog("husbandDeath","A husband was strangled to death by the player during a blackout rage.");
      }
    }
  },

  // Centralized 6-month passage hook: union/leagues/autos + blood-sports annihilation
  _advanceHalfYear(){
    this.s.age+=0.5;
    // auto recruitment/stealth (union)
    this._unionRecruitTick();
    this._unionStealthTick();
    // auto recruitment/stealth (league)
    this._leagueRecruitTick();
    this._leagueStealthTick();
    // blood-sports annihilation hazard
    this._annihilationTick();
  },
  // ========================================================================
  // MORTALITY
  // ========================================================================
  _applyCivilianMortality(lastAction=null){
    if(!this.s.alive) return;

    // husbands aging + incidental events
    this._checkHusbands();

    // base half-year mortality
    let p=(this.p.civilianAnnualMortality??0.15)*0.5;

    // senescence beyond life cap
    const cap=this._lifeCap();
    if(this.s.age>cap){
      const yrs=this.s.age-cap;
      p=Math.min(0.99,p+yrs*(this.p.senescentAnnual??0.05)*0.5);
    }

    // global stacks & personal outlander advantage
    p=this._applyAdvantageStacks(p);
    p=this._advantagePersonal(p);

    // infamy lowers overall death probability
    p=this._infamyReduce(p);

    // survive this half-year? (if yes, still do periodic ticks)
    if(!this._roll(p)){
      this._unionRecruitTick(); this._unionStealthTick();
      this._leagueRecruitTick(); this._leagueStealthTick();
      this._annihilationTick();
      return;
    }

    // retaliation if attempting husband while unproven
    if(lastAction==="husbandAttempt" && !this.s.proven && Math.random()<0.10){
      this._die("deathRival","Killed by prospective husband's House"); return;
    }

    // ----- Weighted death pools -----
    // Base causes
    const basePool = [
      ["deathAccident","Died in workplace accident",0.15],
      ["deathStarve","Starved to death",0.15],
      ["deathRival","Killed by rival House",0.10]
    ];

    // Husband-specific causes (guarded by husbands>0)
    const husbandPool = (this.s.husbands>0) ? [
      ["deathPoison","Poisoned by jealous husband",0.10],
      // new: stabbed by husbands (unlocked after safari)
      ...(this.s.safariUnlockedHusbandRisks ? [["deathRival","Stabbed to death by husbands",0.08]] : [])
    ] : [];

    // Civilian-only extra (if never deployed)
    const civilianExtra = (!this.s.proven && this.s.deployments===0) ? [
      ["deathRival","Killed by rival wicker gang",0.12],
      ["deathRival","Killed by rat hunters",0.10 + (this.s.ratHunterAggro?this.p.ratHunterAggroBonus:0)], // aggro bonus
      ["deathRival","Killed in worker uprising",0.10],
      ["deathAccident","Died of infection",0.10],
      ["deathPoison","Executed by Yebra for illegal farming",0.10],
      ["deathPoison","Executed by Yebra for sabotage",0.10],
      ["deathPoison","Executed by Yebra for terroristic activity",0.10],
      ["deathPoison","Executed by Yebra for involvement in organized crime",0.10]
    ] : [];

    // Veteran extras (after first deployment)
    const veteranExtra = (this.s.proven||this.s.deployments>0) ? [
      ["deathRival","Killed in a duel",0.12], // duel death may also occur via Start Duel action
      ["deathRival","Killed by outlanders while rat hunting",0.10],
      ["deathRival","Killed by rat hunters",0.10 + (this.s.ratHunterAggro?this.p.ratHunterAggroBonus:0)], // aggro bonus
      ["deathPoison","Killed by angry prostitute while slumming",0.10],
      ["deathAccident","Overdosed",0.10],
      ["deathPoison","Executed for space piracy",0.10],
      ["deathPoison","Executed for violating Yebra patent law",0.10],
      ["deathRival","Killed in a drunken brawl",0.10]
    ] : [];

    // old age (>=80)
    const oldAge = (this.s.age>=80) ? [["deathOld","Died of old age",0.25]] : [];

    // Infamy modifies husband-related weights upward
    const inf = clamp(this.s.infamy||0,0,100)/100;
    const pool = [...basePool, ...husbandPool.map(([t,m,w])=>[t,m,w*(1+inf)]), ...civilianExtra, ...veteranExtra, ...oldAge];

    // pick weighted cause
    const totalW=pool.reduce((a,[,,w])=>a+w,0);
    let r=Math.random()*totalW;
    for(const [type,msg,w] of pool){
      r-=w; if(r<=0){ this._die(type,msg); return; }
    }
    this._die("deathAccident","Died in unexplained circumstances");
  },

  // ========================================================================
  // UNION (Outlanders) — STEALTH + AUTO-RECRUIT + ACTIONS
  // ========================================================================
  _unionStealthTick(){
    if(!this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.age - (this.s.lastStealthTickAge||0) < 0.5) return;
    this.s.lastStealthTickAge=this.s.age;

    if(Math.random() < (this.p.unionStealthFail||0.10)){
      const caches=this.s.unionCaches|0;
      const before=this.s.unionMembers;
      const survivors=caches*(this.p.unionCacheSave||10);
      const after=Math.min(before,survivors);
      this.s.unionMembers=after;
      this._addLog("union",`Union purge by Yebra. Members ${before} → ${after}.`);
      this._addLog("union",`Union forced into hiding for ${(this.p.unionHideYears||4)} years.`);
      // instant 4-year skip + 20% death risk
      this.s.age += (this.p.unionHideYears||4);
      if(Math.random()<0.20){
        this._applyCivilianMortality();
        if(!this.s.alive) return;
      }
      this.s.unionHiddenUntil = this.s.age;
      this._addLog("union","Union resurfaced from hiding.");
    }
  },

  _unionRecruitTick(){
    if(!this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age < this.s.unionHiddenUntil) return;

    let gained = 0, deaths = 0;
    const members = this.s.unionMembers;
    for(let i=0;i<members;i++){
      const r = Math.random();
      if(r < (this.p.unionConvertDeath||0.10)) deaths++;
      else if(r < (this.p.unionConvertDeath||0.10)+(this.p.unionConvertPass||0.90)) gained++;
    }
    this.s.unionMembers = Math.max(0, this.s.unionMembers - deaths + gained);
    if(deaths>0 || gained>0){
      this._addLog("union",`Auto-recruit: ${deaths>0?deaths+' executed, ':''}+${gained} recruited. Total ${this.s.unionMembers}.`);
    }
  },

  // ========================================================================
  // LEAGUE (Anti-Degeneracy) — STEALTH + AUTO-RECRUIT + ACTIONS
  // ========================================================================
  _leagueStealthTick(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    if(this.s.age - (this.s.lastLeagueStealthTickAge||0) < 0.5) return;
    this.s.lastLeagueStealthTickAge=this.s.age;

    if(Math.random() < (this.p.leagueStealthFail||0.10)){
      const caches=this.s.leagueCaches|0;
      const before=this.s.leagueMembers;
      const survivors=caches*(this.p.leagueCacheSave||10);
      const after=Math.min(before,survivors);
      this.s.leagueMembers=after;
      this._addLog("league",`League members purged by Rat Hunters. Members ${before} → ${after}.`);
      this._addLog("league",`League forced into hiding for ${(this.p.leagueHideYears||4)} years.`);
      // instant 4-year skip + 20% death risk (league flavor)
      this.s.age += (this.p.leagueHideYears||4);
      if(Math.random()<(this.p.leagueHideDeathRisk||0.20)){
        this._die("deathRival","Torn apart during a Rat Hunter ambush while in hiding");
        return;
      }
      this.s.leagueHiddenUntil = this.s.age;
      this._addLog("league","League resurfaced from hiding.");
    }
  },

  _leagueRecruitTick(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    if(this.s.leagueHiddenUntil && this.s.age < this.s.leagueHiddenUntil) return;

    let gained = 0, deaths = 0;
    const members = this.s.leagueMembers;
    for(let i=0;i<members;i++){
      const r = Math.random();
      if(r < (this.p.leagueConvertDeath||this.p.leagueConvertDeath===0?this.p.leagueConvertDeath:0.10)) deaths++;
      else if(r < (this.p.leagueConvertDeath??0.10)+(this.p.leagueConvertPass??0.90)) gained++;
    }
    this.s.leagueMembers = Math.max(0, this.s.leagueMembers - deaths + gained);
    if(deaths>0 || gained>0){
      this._addLog("league",`Auto-recruit: ${deaths>0?deaths+' lost, ':''}+${gained} recruited. Total ${this.s.leagueMembers}.`);
    }
  },

  // ========================================================================
  // SIX-MONTH HAZARDS (Blood Sports Annihilation)
  // ========================================================================
  _annihilationTick(){
    if(!this.s.annihilationActive) return;
    if(Math.random() < (this.p.bloodAnnihilateChance||0.10)){
      const roll=Math.random();
      if(roll<1/3){
        // GIS reset to 0 -> wipe children records
        this.s.children=[]; this.s.daughtersProven=0; this.s.daughtersTotal=0;
        this._die("deathRival","Annihilated family and then self.");
      }else if(roll<2/3){
        this._die("deathAccident","Committed mass arson, killed by Yebra during a mental collapse.");
      }else{
        this._die("deathBattle","Forcibly deployed until death after serial killings destroyed Yebra IP.");
      }
    }
  },

  // ========================================================================
  // ACTIONS — Core & Civilian (Outlanders + Union)
  // ========================================================================
  addHusband(){
    if(!this.s.alive) return;

    // courting is risky if unproven
    if(!this.s.proven){
      this._advanceHalfYear();
      const rejected=Math.random()<0.95;
      if(rejected){
        this._addLog("wait","💔 Rejected by prospective husband for being poor.");
        this._applyCivilianMortality("husbandAttempt");
        this._renderStatus();
        return;
      }
    }else{
      // even if proven, take 6 months to arrange marriage
      this._advanceHalfYear();
    }

    this.s.husbands+=1;
    (this.s.husbandAges||[]).push(this.s.age);
    this._addLog("husbandAdd",`Took another husband. Total=${this.s.husbands}.`);
    this._renderStatus();
  },

  reproduce(){
    if(!this.s.alive) return;
    if((this.s.husbands||0)<1){
      this._addLog("wait","You cannot reproduce without at least one husband.");
      return;
    }
    const litter=rnd((this.p.litterMin??1),(this.p.litterMax??6));
    const jBase=this.p.juvenileSurvival??0.7;
    const bonus=(this.p.provisioningBonusPerHusband??0.05)*Math.max(0,(this.s.husbands|0)-1);
    const j=Math.min(0.95,Math.max(0,jBase*(1+bonus)));

    let survive=0, daughters=0, proved=0;
    for(let i=0;i<litter;i++){
      const sex=Math.random()<0.5?"F":"M";
      const adult=this._roll(j);
      let pv=false;
      if(sex==="F" && adult) pv=this._roll(this.p.daughterProvenProb??0.2);
      this.s.children.push({sex,adult,proven:pv});
      if(adult) survive++;
      if(sex==="F"){ daughters++; if(pv) proved++; }
    }

    this.s.daughtersTotal+=daughters;
    this.s.daughtersProven+=proved;
    this._updatePrestige();

    this._advanceHalfYear();
    this._addLog("reproduce",`Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
    this._applyCivilianMortality();
    this._renderStatus();
  },

  wait(){
    if(!this.s.alive) return;
    this._advanceHalfYear();
    if(this.s.unionHiddenUntil && this.s.age>=this.s.unionHiddenUntil){
      this.s.unionHiddenUntil=null;
      this._addLog("union","Union resurfaced from hiding.");
      if(Math.random()<0.20) this._applyCivilianMortality(); // resurfacing risk (civilian)
    }
    if(this.s.leagueHiddenUntil && this.s.age>=this.s.leagueHiddenUntil){
      this.s.leagueHiddenUntil=null;
      this._addLog("league","League resurfaced from hiding.");
      if(Math.random()<(this.p.leagueHideDeathRisk||0.20)) this._die("deathRival","Torn apart by Rat Hunters while resurfacing");
    }
    this._addLog("wait",`Waited 6 months. Age→${this.s.age.toFixed(1)}`);
    this._applyCivilianMortality();
    this._renderStatus();
  },

  deploy(){
    if(!this.s.alive) return;

    // Outlanders cannot deploy — summary execution
    if(this.s.outlander){
      this._die("deathPoison","Executed by Yebra for terroristic affiliations when attempting to deploy");
      return;
    }

    const first=!this.s.proven;
    let m=first?(this.p.rookieMortality??0.8):(this.p.provenMortality??0.2);
    m=Math.max(0, m*(1-(this.p.prestigeBoostBeta??0.5)*(+this.s.prestige||0)));

    const survived=!this._roll(m);
    this.s.age+=(this.p.deployYears??4);
    this.s.deployments+=1;

    if(survived){
      if(first) this.s.proven=true;
      // Infamy increases with successful deployments
      this.s.infamy = clamp((this.s.infamy||0)+(this.p.infamyPerDeploy||5),0,100);
      this._addLog("deploy",`Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age} · Infamy ${this.s.infamy}`);
      this._renderStatus();
    }else{
      if(Math.random()<0.33) this._die("deathBattle","Thrown from airlock after failed QC");
      else this._die("deathBattle","Died in battle");
    }
  },

  // ----- Outlander path (civilian) -----
  joinOutlanders(){
    if(!this.s.alive) return;
    if(this.s.proven){ this._addLog("outlander","Cannot join Outlanders after deploying."); return; }
    if(this.s.outlander){ this._addLog("outlander","Already aligned with Outlanders."); return; }
    this.s.outlander=true;
    this._addLog("outlander","Joined Outlanders. Civilian death risk reduced; deployment locked. Union play unlocked.");
    this._renderStatus();
  },

  startUnion(){
    if(!this.s.alive || !this.s.outlander) return;
    if(this.s.unionMembers>0){ this._addLog("union","Union already formed."); return; }
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){
      this._addLog("union","Union is in hiding; cannot operate yet."); return;
    }
    this.s.unionMembers=1;
    this._addLog("union","Started a labor union (1 member).");
    this._renderStatus();
  },

  expandUnion(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){
      this._addLog("union","Union is in hiding; cannot expand."); return;
    }
    // Outlander action = 6 months
    this._advanceHalfYear();

    if(Math.random()<(this.p.unionExpandDeath||0.10)){
      this._die("deathPoison","Executed by Yebra for terroristic activity while recruiting");
      return;
    }
    this.s.unionMembers += 1;
    this._addLog("union",`Recruited one new member. Total ${this.s.unionMembers}.`);

    if(this.s.unionMembers >= (this.p.revoltUnlockAt||1000))
      this._addLog("revolt","Workers' Revolt is now available.");

    this._renderStatus();
  },

  buildCache(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){
      this._addLog("union","Union is in hiding; cannot build caches."); return;
    }
    // Outlander action = 6 months
    this._advanceHalfYear();

    if(Math.random()<(this.p.unionCacheDeath||0.10)){
      this._die("deathAccident","Executed by Yebra drone for suspicious activity while building cache"); return;
    }
    this.s.unionCaches+=1;
    this._addLog("cache",`Built supply cache (${this.s.unionCaches} total). During purges, each cache preserves ${this.p.unionCacheSave||10} members.`);
    this._renderStatus();
  },

  sabotage(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){
      this._addLog("sabotage","Union is in hiding; cannot sabotage."); return;
    }
    // Outlander action = 6 months
    this._advanceHalfYear();

    const bonus=Math.floor((this.s.unionMembers||0)/10)*0.01;
    const successP=Math.min(0.90,0.30+bonus);
    if(Math.random()<successP){
      this._addLog("sabotage",`Sabotage successful (p=${(successP*100).toFixed(0)}%).`);
    }else{
      this._addLog("sabotage","Sabotage failed; lay low.");
    }
    this._renderStatus();
  },

  revolt(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<(this.p.revoltUnlockAt||1000)) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){
      this._addLog("revolt","Union is in hiding; cannot revolt."); return;
    }

    const p=(this.p.revoltBaseSuccess||0.10)+(this.global.advantageStacks||0)*(this.p.revoltStackBonus||0.10);
    if(Math.random()<p){
      this.global.advantageStacks=(this.global.advantageStacks||0)+1;
      this._addLog("revolt",`Workers' Revolt succeeded! Permanent death-save advantage increased (stacks: ${this.global.advantageStacks}).`);
    }else{
      this._addLog("revolt",`Workers' Revolt failed (p=${(p*100).toFixed(0)}%). Heavy reprisals follow.`);
      const caches=this.s.unionCaches|0;
      const survivors=caches*(this.p.unionCacheSave||10);
      const before=this.s.unionMembers;
      const after=Math.min(before,survivors);
      this.s.unionMembers=after;
      this._addLog("union",`Reprisals: union ${before}→${after}, went to ground for ${(this.p.unionHideYears||4)} years.`);
      this.s.age += (this.p.unionHideYears||4);
      if(Math.random()<0.20){ this._applyCivilianMortality(); if(!this.s.alive) return; }
      this.s.unionHiddenUntil = this.s.age;
      this._addLog("union","Union resurfaced from hiding.");
    }
    this._renderStatus();
  },
  // ========================================================================
  // DEPLOYED PATH — INFAMY / DUEL / GALA / RAT HUNTERS / LEAGUE
  // ========================================================================

  // HUD helper
  _duelWinChance(){
    const base=(this.p.duelBaseWin||0.50);
    const perDep=(this.p.duelPerDeploy||0.10)*(this.s.deployments||0);
    const perWin=(this.p.duelPerWin||0.05)*(this.s.duelWins||0);
    const inf = clamp(this.s.infamy||0,0,100)/100;
    return clamp(base+perDep+perWin+inf,0,this.p.duelMaxWin||0.95);
  },

  startDuel(){
    if(!this.s.alive) return;
    if(!this.s.proven && this.s.deployments===0){ this._addLog("duel","You need at least one successful deployment before starting duels."); return; }

    this._advanceHalfYear();
    const p=this._duelWinChance();
    if(Math.random()<p){
      this.s.duelWins=(this.s.duelWins||0)+1;
      this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamyPerDuelWin||5),0,100);
      this._addLog("duel",`Won the duel! (win p=${Math.round(p*100)}%). Infamy +${this.p.infamyPerDuelWin||5} → ${this.s.infamy}.`);
    }else{
      this._die("deathRival","Killed in duel.");
      return;
    }
    this._renderStatus();
  },

  attendGala(){
    if(!this.s.alive) return;
    if(!this.s.proven && this.s.deployments===0){ this._addLog("gala","You must survive one deployment before being invited to elite galas."); return; }
    this.s.galaState='intro';
    this._addLog("gala","You notice that some of the male attendees do not look happy about being here.");
    // show choice buttons
    this.ui.btnGalaIgnore.style.display="";
    this.ui.btnGalaInv.style.display="";
    this._renderStatus();
  },
  galaIgnore(){
    if(this.s.galaState!=='intro') return;
    this._advanceHalfYear();
    this._addLog("gala","A rat hunter approaches you and asks if you're interested in a safari.");
    // show Join/Decline
    this.ui.btnJoinRat.style.display="";
    this.ui.btnDecline.style.display="";
    this.ui.btnGalaIgnore.style.display="none";
    this.ui.btnGalaInv.style.display="none";
    this.s.galaState='ignore';
  },
  galaDecline(){
    if(this.s.galaState!=='ignore') return;
    this._advanceHalfYear();
    this._addLog("gala","You decline politely and leave the gala with a strange aftertaste.");
    this.ui.btnJoinRat.style.display="none";
    this.ui.btnDecline.style.display="none";
    this.s.galaState=null;
    this._renderStatus();
  },
  galaInvestigate(){
    if(this.s.galaState!=='intro') return;
    this._advanceHalfYear();
    this._addLog("gala","You discovered a trafficking ring behind the smiles.");
    // make a scene or leave
    const scene=Math.random()<0.5;
    if(scene){
      this._addLog("gala","You made a scene: majority of attendees side with you; rat hunters flee.");
      // raise aggro weights for rat hunter related deaths +10%
      this.s.ratHunterAggro=true;
      // unlock league formation
      this.ui.btnFormLeague.style.display="";
    }else{
      this._addLog("gala","You made a scene: majority of attendees side with rat hunters; you're expelled from the gala.");
      this.s.ratHunterAggro=true;
    }
    // either outcome: both “killed by rat hunters” and “husband killed by rat hunters” become more likely
    // (we model as flag ratHunterAggro which weights those deaths in pools)

    // hide gala ephemeral
    this.ui.btnGalaIgnore.style.display="none";
    this.ui.btnGalaInv.style.display="none";
    this.s.galaState=null;
    this._renderStatus();
  },

  joinRatHunters(){
    if(this.s.joinedRatHunters) return;
    this._advanceHalfYear();
    this.s.joinedRatHunters=true;
    this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamyJoinRat||30),0,100);
    this._addLog("rat",`Joined Rat Hunters. Infamy +${this.p.infamyJoinRat||30} → ${this.s.infamy}.`);
    this._addLog("rat","Their expeditions are crimes in everything but name; husbands grow cold at the stories you do not tell.");
    // new ambient button
    this.ui.btnSafari.style.display="";
    // close gala choices
    this.ui.btnJoinRat.style.display="none";
    this.ui.btnDecline.style.display="none";
    this._renderStatus();
  },

  attendSafari(){
    if(!this.s.joinedRatHunters) return;
    // 6 months pass: the safari itself
    this._advanceHalfYear();

    // rare death first: eviscerated by cybernetic hooker (5%)
    if(Math.random() < (this.p.safariHookerDeath||0.05)){
      this._die("deathRival","Eviscerated by a cybernetic hooker in a chrome-lit pit.");
      return;
    }

    // 10% killed by outlanders
    if(Math.random() < (this.p.safariOutlanderDeath||0.10)){
      this._die("deathRival","Killed by outlanders during a botched safari.");
      return;
    }

    // success: +5 infamy, unlock risks
    this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamySafariSuccess||5),0,100);
    this.s.ratSafariCount=(this.s.ratSafariCount||0)+1;
    if(this.s.ratSafariCount>=1) this.s.safariUnlockedHusbandRisks=true;
    this._addLog("rat",`Safari concluded. War crimes photographed for private albums. Infamy +${this.p.infamySafariSuccess||5} → ${this.s.infamy}.`);

    // after 3 safaris, unlock blood sports
    if(this.s.ratSafariCount>=3){
      this.ui.btnBlood.style.display="";
      this._addLog("blood","Blood Sports now available. You know too much to be clean again.");
    }
    this._renderStatus();
  },

  attendBloodSports(){
    if(!this.s.joinedRatHunters) return;
    if(this.s.ratSafariCount<3) return;
    // immediate infamy bump
    this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamyBloodSports||50),0,100);
    this.s.bloodSports=true;
    this.s.annihilationActive=true;
    this._addLog("blood",`You attended blood sports. Infamy +${this.p.infamyBloodSports||50} → ${this.s.infamy}.`);
    this._addLog("blood","Participants become mannequins with pulses. The floor keeps the stains.");
    this._renderStatus();
  },

  // ----- League (Anti-Degeneracy) from Investigate path -----
  formLeague(){
    if(this.s.leagueActive) return;
    this._advanceHalfYear();
    this.s.leagueActive=true;
    this.s.leagueMembers=1;
    this._addLog("league","Formed Anti-Degeneracy League (1 member). The corrupt elites will learn to fear the light.");
    this._renderStatus();
  },

  expandLeague(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){
      this._addLog("league","League is in hiding; cannot expand."); return;
    }
    this._advanceHalfYear();
    if(Math.random()<(this.p.leagueExpandDeath||0.10)){
      this._die("deathRival","Disemboweled by Rat Hunters while recruiting for the League");
      return;
    }
    this.s.leagueMembers+=1;
    this._addLog("league",`Recruited one member. League total ${this.s.leagueMembers}.`);
    if(this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000)){
      this._addLog("purge","Enact Purge is now available.");
    }
    this._renderStatus();
  },

  buildHideout(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){
      this._addLog("league","League is in hiding; cannot build hideouts."); return;
    }
    this._advanceHalfYear();
    if(Math.random()<(this.p.leagueExpandDeath||0.10)){
      this._die("deathRival","Skinned alive by Rat Hunters while scouting a hideout"); return;
    }
    this.s.leagueCaches+=1;
    this._addLog("league",`Built a safe house (${this.s.leagueCaches} total). During purges, each preserves ${this.p.leagueCacheSave||10} members.`);
    this._renderStatus();
  },

  huntTheHunter(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){
      this._addLog("league","League is in hiding; cannot hunt."); return;
    }
    this._advanceHalfYear();

    // death check (5%)
    if(Math.random()<(this.p.huntHunterDeath||0.05)){
      this._die("deathRival","Gutted by Rat Hunters in a smoke-choked stairwell");
      return;
    }

    // hooker recruit (5%) — only once
    if(!this.s.cyberHooker && Math.random()<(this.p.huntHookerRecruit||0.05)){
      this.s.cyberHooker=true;
      this._addLog("hooker","Recruited a cybernetic hooker. She knows where the bones are buried.");
    }

    // success: if hooker recruited → auto success flavor, else ordinary success
    if(this.s.cyberHooker){
      this._addLog("league","Hunt succeeded with surgical precision. No witnesses, only rumors.");
    }else{
      this._addLog("league","Hunt succeeded. Their fear tastes like tin.");
    }
    // reward: +5 infamy
    this.s.infamy=clamp((this.s.infamy||0)+5,0,100);
    this._renderStatus();
  },

  enactPurge(){
    if(!this.s.leagueActive || this.s.leagueMembers<(this.p.leaguePurgeUnlockAt||1000)) return;
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){
      this._addLog("purge","League is in hiding; cannot enact purge."); return;
    }
    this._advanceHalfYear();
    if(Math.random()<(this.p.leaguePurgeSuccess||0.50)){
      this.global.advantageStacks=(this.global.advantageStacks||0)+1;
      this._addLog("purge",`Purge succeeded. Rat Hunter dens are cinders. Permanent death-save advantage increased (stacks: ${this.global.advantageStacks}).`);
    }else{
      this._die("deathRival","Riddled with flechettes by Rat Hunters while attempting the purge");
      return;
    }
    this._renderStatus();
  },
  // ========================================================================
  // DEATH + HUD + RESET
  // ========================================================================
  _die(type,msg){
    this.s.alive=false;
    this._addLog(type,`${msg}. Final age ${this.s.age.toFixed(1)}.`);
    this._renderStatus();
  },

  _computeGIS(){
    let score=0,max=0;
    for(const ch of (this.s.children||[])){
      max+=3;
      if(ch.adult) score+=1;
      if(ch.proven) score+=2;
    }
    const norm=max>0?Math.round(100*score/max):0;
    return {score,max,norm};
  },

  _renderStatus(){
    if(!this.ui.status) return;
    const cap=this._lifeCap();
    const gis=this._computeGIS();

    const total=(this.s.children && this.s.children.length) || 0;
    const adults=(this.s.children && this.s.children.filter(c=>c.adult).length) || 0;
    const df=(this.s.children && this.s.children.filter(c=>c.sex==='F').length) || 0;
    const dp=this.s.daughtersProven||0;

    this.ui.status.status.innerHTML   = `<b>Status:</b> ${this.s.alive?'Alive':'Dead'} ${this.s.outlander?'· Outlander':''} ${this.s.proven||this.s.deployments>0?'· Deployed':''}`;
    this.ui.status.age.innerHTML      = `<b>Age:</b> ${this.s.age.toFixed(1)} / Cap ${cap.toFixed(1)}`;
    this.ui.status.tours.innerHTML    = `<b>Deployments:</b> ${this.s.deployments|0}`;
    this.ui.status.husbands.innerHTML = `<b>Husbands:</b> ${this.s.husbands|0}`;
    this.ui.status.prestige.innerHTML = `<b>Prestige:</b> ${Math.round((+this.s.prestige||0)*100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal|0}`;
    this.ui.status.children.innerHTML = `<b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} proven daughters`;
    this.ui.status.gis.innerHTML      = `<b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)`;
    this.ui.status.infamy.innerHTML   = `<b>Infamy:</b> ${clamp(this.s.infamy||0,0,100)}`;

    const revoltAvail = (this.s.outlander && this.s.unionMembers >= (this.p.revoltUnlockAt||1000));
    const hideTxtU = (this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil)
      ? ` · In hiding until age ${this.s.unionHiddenUntil.toFixed(1)}`
      : "";
    const unionVisible = this.s.outlander && this.s.unionMembers>=10;
    this.ui.status.union.innerHTML =
      (unionVisible
        ? `<b>Union:</b> ${this.s.unionMembers} members · Caches:${this.s.unionCaches}${hideTxtU} ${revoltAvail?'· Revolt READY':''}`
        : `<b>Union:</b> (join Outlanders to unlock)`);

    const purgeAvail = (this.s.leagueActive && this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000));
    const hideTxtL = (this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil)
      ? ` · In hiding until age ${this.s.leagueHiddenUntil.toFixed(1)}`
      : "";
    const leagueVisible = this.s.leagueActive && this.s.leagueMembers>=10;
    this.ui.status.league.innerHTML =
      (leagueVisible
        ? `<b>League:</b> ${this.s.leagueMembers} members · Hideouts:${this.s.leagueCaches}${hideTxtL} ${purgeAvail?'· Purge READY':''}`
        : `<b>League:</b> (investigate at gala to unlock)`);

    // button visibility
    // core
    this.ui.btnDeploy.disabled = !!this.s.outlander || !this.s.alive;
    this.ui.btnRepro.disabled = !this.s.alive;
    this.ui.btnWait .disabled = !this.s.alive;
    this.ui.btnHusb .disabled = !this.s.alive;
    this.ui.btnReset.disabled = false;

    // outlander join shows only when unproven + alive
    this.ui.btnOut.style.display    = (!this.s.proven && !this.s.outlander && this.s.alive) ? "" : "none";
    this.ui.btnUnion.style.display  = (this.s.outlander && this.s.alive && this.s.unionMembers===0) ? "" : "none";

    const unionOpsVisible = (this.s.outlander && this.s.alive && this.s.unionMembers>0);
    this.ui.btnExpand.style.display = unionOpsVisible ? "" : "none";
    this.ui.btnCache .style.display = unionOpsVisible ? "" : "none";
    this.ui.btnSabot .style.display = unionOpsVisible ? "" : "none";
    this.ui.btnRevolt.style.display = (unionOpsVisible && revoltAvail) ? "" : "none";

    // deployed path buttons
    const deployed = (this.s.proven || this.s.deployments>0) && this.s.alive && !this.s.outlander;
    this.ui.btnDuel.style.display   = deployed ? "" : "none";
    this.ui.btnGala.style.display   = deployed ? "" : "none";
    this.ui.btnGalaIgnore.style.display="none";
    this.ui.btnGalaInv.style.display="none";
    this.ui.btnJoinRat.style.display="none";
    this.ui.btnDecline.style.display="none";

    // rat hunter buttons
    const ratVisible = deployed && this.s.joinedRatHunters;
    this.ui.btnSafari.style.display = ratVisible ? "" : "none";
    this.ui.btnBlood.style.display  = (ratVisible && this.s.ratSafariCount>=3) ? "" : "none";

    // league buttons
    const leagueOps = deployed && this.s.leagueActive;
    this.ui.btnFormLeague.style.display = (deployed && !this.s.leagueActive) ? "" : "none";
    this.ui.btnLeagueExpand.style.display = leagueOps ? "" : "none";
    this.ui.btnLeagueCache .style.display = leagueOps ? "" : "none";
    this.ui.btnHuntHunter  .style.display = leagueOps ? "" : "none";
    this.ui.btnLeaguePurge .style.display = (leagueOps && this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000)) ? "" : "none";
  },

  // RESET
  reset(){
    this._initLife();
    this._renderStatus();
    this._newCycle();
  }
}; // end Life

// expose & boot Life
window.AzulianLifeSim = Life;
function bootLife(){
  if(document.getElementById("azulian-life-sim")) Life.mount("azulian-life-sim");
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bootLife);
else bootLife();

// ============================================================================
// POPULATION SIMULATOR (unchanged core math, tidy UI)
// ============================================================================
const Pop = {
  params:{
    a0:0.22, ap:0.85, lambda:3, j:0.7, Y:2, pi:0.4, k:3,
    clanPrestige:0.0, Nf0:1e6, Nm:3e6, cycles:10
  },

  step(state,p){
    const a0=+p.a0??0.22, ap=+p.ap??0.85, λ=+p.lambda??3, j=+p.j??0.7,
          Y=+p.Y??2, π=+p.pi??0.4, k=Math.max(1,+p.k??3),
          prestige=+p.clanPrestige??0, Nm=+p.Nm??3e6;

    const apEff = ap*(1+0.2*prestige);
    const newProven   = (state.R||0)*a0;
    const provenNext  = (state.P||0)*apEff;
    const shoreProven = (state.P||0)*(1-π);

    const birthsPerFemale = 2*λ*j*Y;
    const daughters = shoreProven*birthsPerFemale*0.5;
    const nextR = daughters;

    const Ne = shoreProven>0
      ? (4*(shoreProven*Nm)/(shoreProven+Nm))*(1-1/Math.max(1,k))
      : 0;

    return { R:nextR, P:newProven+provenNext, daughters, Ne };
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
    const ex=v=>(Number.isFinite(v)?v:0).toExponential(2);
    for(const r of data){
      h+=`<tr>
        <td>${r.cycle}</td>
        <td>${ex(r.rookies)}</td>
        <td>${ex(r.proven)}</td>
        <td>${ex(r.daughters)}</td>
        <td>${ex(r.Ne)}</td>
      </tr>`;
    }
    return h+"</table>";
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
      const v=this.params[s.id];
      h+=`<label>${s.label}: <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}"
            oninput="AzulianSim.update('${s.id}',this.value)">
            <span id="${s.id}-val">${v}</span></label>`;
    }
    return h+`</div><button onclick="AzulianSim.refresh()">Run Simulation</button>`;
  },

  update(id,val){
    this.params[id]=parseFloat(val);
    const e=document.getElementById(`${id}-val`);
    if(e) e.textContent=val;
  },

  refresh(){
    const c=document.getElementById("azulian-sim-output");
    if(!c) return;
    c.innerHTML=this.renderTable(this.run());
  },

  mount(containerId="azulian-sim"){
    const root=document.getElementById(containerId);
    if(!root) return;
    root.innerHTML=
      `<h3>Azulian Population Simulator</h3>`+
      this.renderControls()+
      `<div id="azulian-sim-output" style="margin-top:8px;">${this.renderTable(this.run())}</div>`;
  }
};

// expose & boot Pop
window.AzulianSim = Pop;
function bootPop(){
  if(document.getElementById("azulian-sim")) Pop.mount("azulian-sim");
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bootPop);
else bootPop();

})(); // end IIFE
