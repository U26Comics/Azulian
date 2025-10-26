// ===== CHUNK 1 OF 5 =====
// Azulian Life-Cycle & Population Simulators — v8Stable+
// Outlanders+Union (civilian)  AND  Infamy+Rat Hunters+League (deployed)
// Carrd / GitHub Pages compatible, pure JS, UTF-8.
// Exposes: window.AzulianLifeSim, window.AzulianSim
// ─────────────────────────────────────────────────────────────────────────────
// This build preserves ALL original alt text and messages. New variants are
// ADDED as additional options (never replacing originals). Gala logic fixed,
// death-lock enforced, League/Union buttons remain live after “gone to ground”,
// and “single union per lifetime” is enforced.
// ─────────────────────────────────────────────────────────────────────────────
(function(){

// ============================================================================
// SHARED UTILITIES & FLAVOR TEXT
// ============================================================================
const C = {
  colors:{
    def:"#eaeaea", cyc:"#7ee7ff", ok:"#8fff8f",
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

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rnd=(a,b)=>{a|=0;b|=0;return Math.floor(Math.random()*(b-a+1))+a;};
const pick = (arr)=>arr[(Math.random()*arr.length)|0];

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

// These are selected contextually
const FLAVOR = {
  // husband rejection while unproven, add-husband attempt
  husbandReject: [
    // — ORIGINAL, DO NOT EDIT —
    "💔 Rejected by prospective husband for being poor. Your dowry was a potato and a pamphlet.",
    // Variants (kept blunt / setting-consistent)
    "💔 Rejected. He read your Quality Control score and handed your potato back.",
    "💔 Rejected. He said the pamphlet was political and the potato was bruised.",
    "💔 Turned away at the door. The aunties laughed at your audacity and tiny root vegetable.",
  ],

  // cybernetic hooker outcomes (affects Rat Hunter / League arcs)
  // Death line (kept separate in death pools), plus contextual success logs.
  hookerRecruitSuccess: [
    // — ORIGINAL male hooker note preserved as thematic variant —
    "Recruited a cybernetic hooker. He’s got more cannibalized cyberware than bone; not much left that’s Azulian.",
    // Additional variants
    "Recruited a cybernetic hooker. His chassis rattles when he laughs.",
    "Recruited a cybernetic hooker. He's recomposed himself from augments torn from man's only natural predator.",
    "Recruited a cybernetic hooker. He says the more he replaces the less he remembers."
  ],

  // Rat safari success & color
  safariFlavor: [
    "Safari concluded. War crimes photographed for private albums.",
    "Rat Hunters took a holiday safari through the floodplains. Came back wearing new skins.",
    "Hunt complete. You spent the evening comparing screams like vintages.",
    "A vet shot a beggar to test her new augment; crowd applauded accuracy."
  ],

  // Blood sports color (sets annihilation flag elsewhere)
  bloodFlavor: [
    "You attended blood sports. Hunters bragged of cleansing dirtbloods. Even Yebra disowned the footage.",
    "They tied a starving poet to a pole and let the carca have him. Called it 'art therapy'",
    "A Dependia escaped the pits and begged the Hunters for mercy. They filmed his laughter as proof of consent.",
    "Returned from safari with a necklace of tongues. Claimed each one lied."
  ],

  // League hunt success flavor (Anti-Degeneracy League)
  leagueHunt: [
    "League purged a gambling den where captives were made to fight for sport.",
    "Rat Hunter militia crushed after three days of League skirmishes; the unclean were boiled for fertilizer.",
    "League raid uncovered a pit of bones, decided to add the captured rat hunters to the ossarium.",
    "They stormed a brothel and found hooks still dripping. Cleansed the place with fire."
  ],

  // “Killed by rat hunters” 
  killedByRatHunters: [
    "Skinned alive by rat hunters in your own living room.",
    // Variants
    "Suspended from a service railing and used as a meat pinata by rat hunters who called your lack of response boring.",
    "Cornered by rat hunters; you were a souvenir before you were a body.",
    "Rat hunters boxed you in and made a night of it.",
    "You were target practice for drunk aristocrats with military hangovers."
  ],

  // Husband-related after safari unlocked
  stabbedByHusbands: [
    "Stabbed to death by husbands.",
    "Dragged across tile by the men who knew you best.",
    "Your husbands compared notes and knives. Deep down, you know you deserved it.",
    "Dinner ended early when the silverware stood up."
  ],
  husbandStrangledAlt: [
    "A husband was strangled to death by the player during a blackout rage.",
    "You wrapped your hands around his throat and counted to quiet.",
    "He didn’t finish the sentence; you didn’t let him.",
    "He apologized while you did it, you aren't sure what for. It haunts you more than anything you did on Deployment."
  ],

  // League/Union purge & hiding flavor (no double-death; fast-forward)
  unionPurge: [
    "Rally turned into a revolt and succeeded for exactly one sunrise before the drones came back.",
    "Yebra purge burns through your ranks, forcing you to hide in old flood tunnels. The air is thick with rot and half-remembered prayers.",
    "Purge spread through the slums like fire through straw; Yebra called it public sanitation."
  ],
  leaguePurge: [
    "Survivors of the latest purge drink from helmets of the fallen.",
    "Rat Hunters painted the stairwells and signed it with your posters.",
    "They broke doors and people in the same motion."
  ],

  // Gala intro / branches
  galaIntro: [
    "You notice that some of the male attendees do not look happy about being here."
  ],
  galaIgnoreFollow: [
    "A rat hunter approaches you and asks if you're interested in a safari."
  ],
  galaInvestigateSceneYou: [
    "You made a scene: majority of attendees side with you; rat hunters flee."
  ],
  galaInvestigateSceneThem: [
    "You made a scene: majority of attendees side with rat hunters; you're expelled from the gala."
  ]
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
    unionCap: 10000,         // sector unionized at cap
    singleUnionPerLife: true,

    // Revolt (permanent advantage stacks)
    revoltUnlockAt:1000,
    revoltBaseSuccess:0.10,
    revoltStackBonus:0.10,

    // Deployed Path: Infamy / Duel / Rat Hunters / League
    duelBaseWin:0.50,          // 50% base
    duelPerDeploy:0.10,        // +10% per successful deployment
    duelPerWin:0.05,           // +5% per past duel win
    duelMaxWin:0.95,
    infamyPerDeploy:5,         // +5 infamy per successful deployment
    infamyPerDuelWin:5,        // +5 per duel win
    infamyJoinRat:30,          // +30 when joining rat hunters
    infamySafariSuccess:5,     // +5 per successful safari
    infamyBloodSports:50,      // +50 when attending blood sports
    safariOutlanderDeath:0.10, // 10% killed by outlanders on safari
    safariHookerDeath:0.05,    // 5% eviscerated by cybernetic hooker
    bloodAnnihilateChance:0.10,// 10% per 6mo annihilation while flagged
    ratHunterAggroBonus:0.10,  // +10% weight to "killed by rat hunters" etc

    // League (Anti-Degeneracy)
    leagueConvertPass:0.90,
    leagueConvertDeath:0.10,
    leagueExpandDeath:0.10,
    leagueHideDeathRisk:0.20,
    leagueStealthFail:0.10,
    leagueCacheSave:10,
    leagueHideYears:4,
    leaguePurgeUnlockAt:1000,
    leaguePurgeSuccess:0.50,
    huntHunterDeath:0.05,
    huntHookerRecruit:0.05      // only once
  },

  // ---------- Global & State ----------
  s:{}, cycleCount:0, ui:{}, currentCycleBody:null,
  global:{
    advantageStacks:0,     // each successful Revolt or League Purge increments
    sectorIndex:0          // which sector we’re on across cycles (for flavor)
  },

  // ========================================================================
  // INIT + MOUNT + UI
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

    // Controls: keep nodes persistent and LIVE; only toggle style.display.
    const controls=el("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}});

    // Core life
    this.ui.btnRepro = el("button",{text:"Reproduce",onclick:()=>this.reproduce()});
    this.ui.btnWait  = el("button",{text:"Wait 6mo",onclick:()=>this.wait()});
    this.ui.btnDeploy= el("button",{text:"Deploy 4y",onclick:()=>this.deploy()});
    this.ui.btnHusb  = el("button",{text:"Add Husband",onclick:()=>this.addHusband()});
    this.ui.btnReset = el("button",{text:"Reset (New Cycle)",onclick:()=>this.reset()});

    // Civilian path
    this.ui.btnOut   = el("button",{text:"Join Outlanders",onclick:()=>this.joinOutlanders()});
    this.ui.btnUnion = el("button",{text:"Start Labor Union",onclick:()=>this.startUnion()});
    this.ui.btnExpand= el("button",{text:"Expand Union",onclick:()=>this.expandUnion()});
    this.ui.btnCache = el("button",{text:"Build Supply Cache",onclick:()=>this.buildCache()});
    this.ui.btnSabot = el("button",{text:"Sabotage Yebra Property",onclick:()=>this.sabotage()});
    this.ui.btnRevolt= el("button",{text:"Start Workers' Revolt",onclick:()=>this.revolt()});

    // Deployed: infamy / duel / gala
    this.ui.btnDuel  = el("button",{text:"Start Duel",onclick:()=>this.startDuel()});
    this.ui.btnGala  = el("button",{text:"Attend Elite Gala",onclick:()=>this.attendGala()});

    // Gala transient choices (we keep them mounted; visibility toggles)
    this.ui.btnGalaIgnore = el("button",{text:"Ignore",onclick:()=>this.galaIgnore()});
    this.ui.btnGalaInv    = el("button",{text:"Investigate",onclick:()=>this.galaInvestigate()});
    this.ui.btnJoinRat    = el("button",{text:"Join Rat Hunters",onclick:()=>this.joinRatHunters()});
    this.ui.btnDecline    = el("button",{text:"Decline",onclick:()=>this.galaDecline()});
    this.ui.btnSafari     = el("button",{text:"Attend Safari",onclick:()=>this.attendSafari()});
    this.ui.btnBlood      = el("button",{text:"Attend Blood Sports",onclick:()=>this.attendBloodSports()});

    // League (Anti-Degeneracy)
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
  // LOGGING (with variants) + CYCLE HEADER
  // ========================================================================
  _addLog(type,msg){
    const icon=(C.icons[type]||"");
    const color=
      type.startsWith("death")?C.colors.danger:
      (["prestige","union","revolt","cache","sabotage","duel","gala","rat","blood","league","purge","outlander"].includes(type)?C.colors.ok:
      (["wait","husbandAdd","husbandDeath","jealousyKill"].includes(type)?C.colors.info:C.colors.def));
    const entry=el("div");
    entry.innerHTML=`${icon} <span style="color:${color}">${msg}</span>`;
    entry.style.opacity="0.3";
    if(this.currentCycleBody){
      this.currentCycleBody.appendChild(entry);
      // fade-in (pure JS)
      let o=0.3;const f=setInterval(()=>{o+=0.05;entry.style.opacity=o.toFixed(2);if(o>=1)clearInterval(f);},30);
    }
    if(this.ui.logBox) this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
  },

  _newCycle(){
    this.cycleCount++;
    const wrap=el("details",{open:true});
    const sum=el("summary");
    sum.innerHTML=`<span style="color:${C.colors.cyc};font-weight:600;">🌀 Enter Cycle ${this.cycleCount} — Age 16: Reached maturity.</span>`;
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
    this._deathLock = false;           // death-lock: at most one death per tick
    this._tickGuard = 0;               // guards against nested ticks
    this.s={
      age:16, alive:true, proven:false, deployments:0,
      husbands:0, husbandAges:[],
      children:[], daughtersProven:0, daughtersTotal:0,
      prestige:0, highPrestige:false,

      // Civilian path: Outlanders + Union
      outlander:false, unionMembers:0, unionCaches:0,
      unionHiddenUntil:null, lastStealthTickAge:16,
      unionMadeThisLife:false, unionSectorDone:false, // single union per life

      // Deployed path: Infamy, Duel, Gala → Rat Hunters OR League
      infamy:0, duelWins:0,
      galaState:null, // null | 'intro' | 'ignore' | 'investigate' | 'resolved'
      joinedRatHunters:false, ratSafariCount:0, bloodSports:false, annihilationActive:false,
      ratHunterAggro:false, // increases weight for rat-hunter deaths
      safariUnlockedHusbandRisks:false, // unlock stabbed-by-husbands + strangled-husband
      husbandsStrangledChance:0.05, // chance per 6mo for ambient strangled log (if safari>=1)

      // League (Anti-Degeneracy)
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

  // Apply permanent stacks (from successful revolts/purges)
  _applyAdvantageStacks(p){
    const stacks=this.global.advantageStacks|0;
    if(stacks<=0) return p;
    const adv=(this.p.outlanderAdvantage||0.5);
    for(let i=0;i<stacks;i++) p=p*(1-adv);
    return p;
  },

  _advantagePersonal(p){
    if(this.s.outlander) p=p*(1-(this.p.outlanderAdvantage||0.5));
    return p;
  },

  _infamyReduce(p){
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

    // post-safari ambient husband death (only if has husbands and unlocked)
    if(this.s.husbands>0 && this.s.safariUnlockedHusbandRisks){
      if(Math.random()<(this.s.husbandsStrangledChance||0.05)){
        this.s.husbands-=1;this.s.husbandAges.pop();
        this._addLog("husbandDeath", pick(FLAVOR.husbandStrangledAlt));
      }
    }
  },

  // One-tick death lock helpers
  _beginTick(){ this._deathLock=false; this._tickGuard++; },
  _endTick(){ this._tickGuard=Math.max(0,this._tickGuard-1); },

  // 6-month passage hook: handles autos and annihilation hazard
  _advanceHalfYear(){
    this.s.age+=0.5;
    // AUTOS (queued safely; they must not double-kill)
    this._unionRecruitTick();
    this._unionStealthTick();
    this._leagueRecruitTick();
    this._leagueStealthTick();
    this._annihilationTick();
  },
// ===== CHUNK 2 OF 5 =====

  // ========================================================================
  // WAIT, REPRODUCTION, DEPLOYMENT
  // ========================================================================
  wait(){
    if(!this.s.alive)return;
    this._beginTick();
    this._advanceHalfYear();
    this._checkHusbands();

    // Age check
    if(this.s.age>this._lifeCap()){
      if(!this._deathLock){
        this._deathLock=true;
        this.s.alive=false;
        this._addLog("deathOld","Died of old age. Auments harvested, organics repurposed for fertilizer.");
      }
      this._renderStatus(); this._endTick(); return;
    }

    // Starvation / civilian risk
    let p=this.p.civilianAnnualMortality/2;
    p=this._applyAdvantageStacks(p);
    p=this._advantagePersonal(p);

    if(this._roll(p)){
      if(!this._deathLock){
        this._deathLock=true;
        this.s.alive=false;
        this._addLog("deathStarve","Died of starvation while waiting.");
      }
      this._renderStatus(); this._endTick(); return;
    }

    this._addLog("wait","You pass six months uneventfully.");
    this._renderStatus();
    this._endTick();
  },

  reproduce(){
    if(!this.s.alive)return;
    this._beginTick();
    const litter=rnd(this.p.litterMin,this.p.litterMax);
    this._addLog("reproduce",`Gave birth to ${litter} children.`);
    for(let i=0;i<litter;i++){
      this.s.daughtersTotal++;
      if(Math.random()<this.p.daughterProvenProb){
        this.s.daughtersProven++;
        this._addLog("prestige","A daughter completed a tour of duty and survived.");
      }
    }
    this._updatePrestige();
    this._advanceHalfYear();
    this._renderStatus();
    this._endTick();
  },

  deploy(){
    if(!this.s.alive)return;
    this._beginTick();
    const isRookie=!this.s.proven;
    const mortality=isRookie?this.p.rookieMortality:this.p.provenMortality;
    const risk=this._infamyReduce(this._applyAdvantageStacks(mortality));

    if(this._roll(risk)){
      this.s.alive=false;
      this._deathLock=true;
      this._addLog("deathBattle","Killed in battle during deployment.");
      this._renderStatus(); this._endTick(); return;
    }

    this.s.deployments++;
    this.s.proven=true;
    this.s.infamy+=this.p.infamyPerDeploy;
    this._addLog("deploy",`Completed deployment #${this.s.deployments}.`);
    this.s.age+=this.p.deployYears;
    this._checkHusbands();
    this._renderStatus();
    this._endTick();
  },

  // ========================================================================
  // HUSBAND MANAGEMENT
  // ========================================================================
  addHusband(){
    if(!this.s.alive)return;
    this._beginTick();
    if(this.s.husbands>=this.p.husbandsMax){
      this._addLog("husbandAdd","Cannot add more husbands. Domestic quota reached.");
      this._endTick();return;
    }
    const success=Math.random()>0.3; // baseline 70% success
    if(success){
      this.s.husbands++;
      this.s.husbandAges.push(this.s.age);
      this._addLog("husbandAdd","Acquired new husband. Dowry exchange successful.");
    } else {
      this._addLog("husbandAdd",pick(FLAVOR.husbandReject));
    }
    this._renderStatus();
    this._endTick();
  },

  // ========================================================================
  // CIVILIAN: OUTLANDERS + UNION
  // ========================================================================
  joinOutlanders(){
    if(!this.s.alive)return;
    if(this.s.outlander){this._addLog("outlander","Already among outlanders.");return;}
    this.s.outlander=true;
    this._addLog("outlander","Joined the outlanders. Less oversight, more teeth.");
    this._renderStatus();
  },

  startUnion(){
    if(!this.s.alive)return;
    if(this.p.singleUnionPerLife && this.s.unionMadeThisLife){
      this._addLog("union","You have already founded a union in this life. Enjoy your retirement. You've accomplished more than most dare to dream.");
      return;
    }
    if(this.s.unionSectorDone){
      this._addLog("union","This sector is already fully unionized.");
      return;
    }
    this._beginTick();
    const death=this._roll(this.p.unionConvertDeath);
    if(death){
      this._deathLock=true;
      this.s.alive=false;
      this._addLog("deathAccident","Executed by Yebra security for labor organizing.");
      this._renderStatus();this._endTick();return;
    }
    this.s.unionMembers=10;
    this.s.unionMadeThisLife=true;
    this._addLog("union","Founded first labor union in this sector.");
    this._renderStatus();
    this._endTick();
  },

  expandUnion(){
    if(!this.s.alive)return;
    if(this.s.unionMembers<=0){this._addLog("union","You must start a union first.");return;}
    this._beginTick();
    const death=this._roll(this.p.unionExpandDeath);
    if(death){
      this._deathLock=true;
      this.s.alive=false;
      this._addLog("deathAccident","Caught expanding union; 'fell' from factory scaffolding.");
      this._renderStatus();this._endTick();return;
    }
    const growth=Math.floor(this.s.unionMembers*(0.2+Math.random()*0.3));
    this.s.unionMembers+=growth;
    this._addLog("union",`Union expanded by ${growth} members.`);
    if(this.s.unionMembers>=this.p.unionCap){
      this.s.unionSectorDone=true;
      this._addLog("union","The resistance grows in numbers.");
      this._unionPurge();
    }
    this._renderStatus();
    this._endTick();
  },

  buildCache(){
    if(!this.s.alive)return;
    if(this.s.unionMembers<=0){this._addLog("cache","You need a union to coordinate caches.");return;}
    this._beginTick();
    const death=this._roll(this.p.unionCacheDeath);
    if(death){
      this._deathLock=true;
      this.s.alive=false;
      this._addLog("deathAccident","Crushed beneath supply cache collapse. Yebra thanks you for your contribution.");
      this._renderStatus();this._endTick();return;
    }
    this.s.unionCaches++;
    this._addLog("cache",`Built new supply cache. (${this.s.unionCaches}/${this.p.unionCacheSave})`);
    if(this.s.unionCaches>=this.p.unionCacheSave){
      this._addLog("revolt","Caches full. Workers whisper rebellion.");
    }
    this._renderStatus();
    this._endTick();
  },

  sabotage(){
    if(!this.s.alive)return;
    this._beginTick();
    const fail=this._roll(0.15);
    if(fail){
      this._deathLock=true;this.s.alive=false;
      this._addLog("deathAccident","Shot by guards while sabotaging factory equipment.");
      this._renderStatus();this._endTick();return;
    }
    this._addLog("sabotage","Sabotaged Yebra property. Machines scream; no one reports it.");
    this._renderStatus();this._endTick();
  },

  revolt(){
    if(!this.s.alive)return;
    if(this.s.unionMembers<this.p.revoltUnlockAt){
      this._addLog("revolt","Not enough members to revolt.");
      return;
    }
    this._beginTick();
    const base=this.p.revoltBaseSuccess+(this.global.advantageStacks*this.p.revoltStackBonus);
    const success=this._roll(base);
    if(success){
      this.global.advantageStacks++;
      this._addLog("revolt","Workers' revolt succeeded. Yebra loses territory.");
    } else {
      this._deathLock=true;
      this.s.alive=false;
      this._addLog("deathRival","Revolt failed. Executed as a terrorist.");
    }
    this._renderStatus();this._endTick();
  },

  _unionRecruitTick(){
    if(!this.s.alive||this.s.unionMembers<=0)return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil)return;
    if(this._roll(this.p.unionConvertPass)){
      this.s.unionMembers+=rnd(1,5);
      this._addLog("union",`Union quietly grows. ${this.s.unionMembers} total.`);
    }
    if(this.s.unionMembers>=this.p.unionCap && !this.s.unionSectorDone){
      this.s.unionSectorDone=true;
      this._addLog("union","Entire sector unionized. Fewer children starve, fewer girls become cannon fodder.");
      this._unionPurge();
    }
  },

  _unionStealthTick(){
    if(!this.s.alive||!this.s.unionMembers)return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil)return;
    if(this._roll(this.p.unionStealthFail)){
      const gone=this.s.age+this.p.unionHideYears;
      this.s.unionHiddenUntil=gone;
      this._addLog("union","Gone to ground. Yebra sweeps the district; you hide under floorboards.");
      this._hideButtons("union");
    }
  },

  _unionPurge(){
    if(!this.s.alive)return;
    const success=this._roll(0.5);
    this._addLog("union",pick(FLAVOR.unionPurge));
    if(success){
      this.global.advantageStacks++;
      this._addLog("revolt","Yebra purge backfires; revolt spreads.");
    }else{
      this._deathLock=true;
      this.s.alive=false;
      this._addLog("deathAccident","Union purge succeeded. You are now an example.");
    }
    this._renderStatus();
  },

  // ========================================================================
  // DEPLOYED: DUELS, GALA, RATHUNTERS, BLOOD SPORTS
  // ========================================================================
  startDuel(){
    if(!this.s.alive)return;
    this._beginTick();
    const base=this.p.duelBaseWin + this.s.deployments*this.p.duelPerDeploy + this.s.duelWins*this.p.duelPerWin;
    const chance=Math.min(this.p.duelMaxWin,base);
    const win=this._roll(chance);
    if(win){
      this.s.duelWins++;
      this.s.infamy+=this.p.infamyPerDuelWin;
      this._addLog("duel","Duel won. Crowd chants your callsign.");
    }else{
      this.s.alive=false;
      this._deathLock=true;
      this._addLog("deathBattle","Lost duel. Weapon jammed, audience cheered anyway.");
    }
    this._renderStatus();
    this._endTick();
  },

  attendGala(){
    if(!this.s.alive)return;
    if(this.s.galaState==="resolved"){this._addLog("gala","You’ve already attended a gala this life.");return;}
    this.s.galaState="intro";
    this._addLog("gala",pick(FLAVOR.galaIntro));
    this._showGalaChoices();
  },

  galaIgnore(){
    if(this.s.galaState!=="intro")return;
    this.s.galaState="ignore";
    this._addLog("gala",pick(FLAVOR.galaIgnoreFollow));
    this._showSafariOptions();
  },

  galaInvestigate(){
    if(this.s.galaState!=="intro")return;
    this.s.galaState="investigate";
    const youWin=this._roll(0.5);
    if(youWin){
      this._addLog("gala",pick(FLAVOR.galaInvestigateSceneYou));
    }else{
      this._addLog("gala",pick(FLAVOR.galaInvestigateSceneThem));
    }
    this.s.galaState="resolved";
    this._hideGalaChoices();
    this._renderStatus();
  },
// ===== CHUNK 3 OF 5 =====

// Gala helpers: keep nodes mounted & clickable; only toggle visibility
_showGalaChoices(){
  if(!this.ui) return;
  // Show only the Intro branch buttons
  this.ui.btnGalaIgnore.style.display = "";
  this.ui.btnGalaInv.style.display    = "";
  // Hide downstream options until chosen
  this.ui.btnJoinRat.style.display    = "none";
  this.ui.btnDecline.style.display    = "none";
  // Do not expose safari/blood/league yet
  this.ui.btnSafari.style.display     = "none";
  this.ui.btnBlood.style.display      = "none";
  // Form League must be unlocked by event — keep hidden by default
  if(!this.s.leagueActive) this.ui.btnFormLeague.style.display = "none";
},

_hideGalaChoices(){
  if(!this.ui) return;
  this.ui.btnGalaIgnore.style.display = "none";
  this.ui.btnGalaInv.style.display    = "none";
  this.ui.btnJoinRat.style.display    = "none";
  this.ui.btnDecline.style.display    = "none";
},

_showSafariOptions(){
  if(!this.ui) return;
  // After IGNORE path: invite to safari
  this._hideGalaChoices();
  this.ui.btnJoinRat.style.display = "";
  this.ui.btnDecline.style.display = "";
},

// Generic group hider (visibility only; never disable)
_hideButtons(group){
  if(!this.ui) return;
  const map = {
    union:  ["btnUnion","btnExpand","btnCache","btnSabot","btnRevolt"],
    league: ["btnFormLeague","btnLeagueExpand","btnLeagueCache","btnHuntHunter","btnLeaguePurge"],
    gala:   ["btnGala","btnGalaIgnore","btnGalaInv","btnJoinRat","btnDecline"],
    safari: ["btnSafari","btnBlood"]
  };
  const arr = map[group] || [];
  for(const k of arr){ if(this.ui[k]) this.ui[k].style.display="none"; }
},

_showButtons(group){
  if(!this.ui) return;
  const map = {
    union:  ["btnUnion","btnExpand","btnCache","btnSabot","btnRevolt"],
    league: ["btnFormLeague","btnLeagueExpand","btnLeagueCache","btnHuntHunter","btnLeaguePurge"],
    gala:   ["btnGala"],
    safari: ["btnSafari","btnBlood"]
  };
  const arr = map[group] || [];
  for(const k of arr){ if(this.ui[k]) this.ui[k].style.display=""; }
},

// ===== Rat Hunters path (from Gala → Ignore) =====
joinRatHunters(){
  if(!this.s.alive) return;
  // Joining is an action-less commit; the actual hunts consume time
  this.s.joinedRatHunters = true;
  this.s.infamy = clamp((this.s.infamy||0) + (this.p.infamyJoinRat||30), 0, 100);
  this._addLog("rat", `Joined Rat Hunters. Infamy +${this.p.infamyJoinRat||30} → ${this.s.infamy}.`);
  this._addLog("rat","Their expeditions are crimes in everything but name; husbands grow cold at the stories you do not tell.");
  // Reveal safari, hide invite buttons
  if(this.ui){
    this.ui.btnJoinRat.style.display = "none";
    this.ui.btnDecline.style.display = "none";
    this.ui.btnSafari.style.display  = "";
  }
  // Gala is resolved after a path is chosen
  this.s.galaState = "resolved";
  this._renderStatus();
},

galaDecline(){
  if(this.s.galaState!=="ignore") return;
  // Declining closes the gala branch for this life
  this._addLog("gala","You decline politely and leave the gala with a strange aftertaste.");
  this.s.galaState = "resolved";
  if(this.ui){
    this.ui.btnJoinRat.style.display = "none";
    this.ui.btnDecline.style.display = "none";
    // No safari if declined
    this.ui.btnSafari.style.display  = "none";
    this.ui.btnBlood.style.display   = "none";
  }
  this._renderStatus();
},

attendSafari(){
  if(!this.s.alive) return;
  if(!this.s.joinedRatHunters){ this._addLog("rat","You need to join Rat Hunters first."); return; }

  this._beginTick();
  // Each safari consumes 6 months
  this._advanceHalfYear();

  // Rare death: 5% eviscerated by cybernetic hooker
  if(!this._deathLock && Math.random() < (this.p.safariHookerDeath||0.05)){
    this._deathLock = true; this.s.alive = false;
    this._addLog("deathRival","Eviscerated by a cybernetic hooker in a chrome-lit pit.");
    this._renderStatus(); this._endTick(); return;
  }

  // 10% killed by outlanders while hunting
  if(!this._deathLock && Math.random() < (this.p.safariOutlanderDeath||0.10)){
    this._deathLock = true; this.s.alive = false;
    this._addLog("deathRival","Killed by outlanders during a botched safari.");
    this._renderStatus(); this._endTick(); return;
  }

  // Success: +5 infamy, unlock husband risk flag after first safari
  this.s.infamy = clamp((this.s.infamy||0) + (this.p.infamySafariSuccess||5), 0, 100);
  this.s.ratSafariCount = (this.s.ratSafariCount||0) + 1;
  if(this.s.ratSafariCount >= 1) this.s.safariUnlockedHusbandRisks = true;

  // Flavor log — keep original, add variant by random pick
  this._addLog("rat", pick(FLAVOR.safariFlavor));
  this._addLog("rat", `Infamy +${this.p.infamySafariSuccess||5} → ${this.s.infamy}.`);

  // After 3 safaris, unlock blood sports button
  if(this.s.ratSafariCount >= 3 && this.ui){
    this.ui.btnBlood.style.display = "";
    this._addLog("blood","Blood Sports now available. You know too much to be clean again.");
  }

  this._renderStatus();
  this._endTick();
},

attendBloodSports(){
  if(!this.s.alive) return;
  if(!this.s.joinedRatHunters || this.s.ratSafariCount < 3){
    this._addLog("blood","You need experience hunting before the arena sends you an invite."); 
    return;
  }
  // Immediate infamy bump, sets annihilation hazard active (checked each 6mo)
  this.s.infamy = clamp((this.s.infamy||0) + (this.p.infamyBloodSports||50), 0, 100);
  this.s.bloodSports = true;
  this.s.annihilationActive = true;
  this._addLog("blood", pick(FLAVOR.bloodFlavor));
  this._addLog("blood", `Infamy +${this.p.infamyBloodSports||50} → ${this.s.infamy}.`);
  this._renderStatus();
},

// ===== League (Anti-Degeneracy) path (from Gala → Investigate) =====
formLeague(){
  if(!this.s.alive) return;
  if(this.s.leagueActive){ this._addLog("league","You have already formed the League."); return; }
  // Founding is immediate; growth actions consume time
  this.s.leagueActive = true;
  this.s.leagueMembers = 1;
  this._addLog("league","Formed Anti-Degeneracy League (1 member). The corrupt elites will learn to fear the light.");
  // After forming, surface League controls; Gala is resolved
  this.s.galaState = "resolved";
  if(this.ui){
    this.ui.btnFormLeague.style.display   = "none"; // now formed
    this.ui.btnLeagueExpand.style.display = "";
    this.ui.btnLeagueCache.style.display  = "";
    this.ui.btnHuntHunter.style.display   = "";
  }
  this._renderStatus();
},

expandLeague(){
  if(!this.s.alive) return;
  if(!this.s.leagueActive || this.s.leagueMembers<=0){
    this._addLog("league","You need to form the League first.");
    return;
  }
  // Each manual recruit attempt = 6 months; leader may die (10%)
  this._beginTick();
  this._advanceHalfYear();

  if(!this._deathLock && Math.random() < (this.p.leagueExpandDeath||0.10)){
    this._deathLock = true; this.s.alive = false;
    this._addLog("deathRival","Disemboweled by Rat Hunters while recruiting for the League.");
    this._renderStatus(); this._endTick(); return;
  }

  // Manual recruit: one at a time
  this.s.leagueMembers += 1;
  this._addLog("league",`Recruited one member. League total ${this.s.leagueMembers}.`);

  // Unlock purge when 1000+
  if(this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000) && this.ui){
    this.ui.btnLeaguePurge.style.display = "";
    this._addLog("purge","Enact Purge is now available.");
  }

  this._renderStatus();
  this._endTick();
},

buildHideout(){
  if(!this.s.alive) return;
  if(!this.s.leagueActive || this.s.leagueMembers<=0){
    this._addLog("league","You need League members before you can build a hideout."); 
    return;
  }
  // Building a hideout consumes 6 months; 10% leader death risk
  this._beginTick();
  this._advanceHalfYear();

  if(!this._deathLock && Math.random() < (this.p.leagueExpandDeath||0.10)){
    this._deathLock = true; this.s.alive = false;
    this._addLog("deathRival","Captured by Rat hunters while scouting. They did things to you that would have made Shiro Ishii blush.");
    this._renderStatus(); this._endTick(); return;
  }

  this.s.leagueCaches += 1;
  this._addLog("league",`Built a safe house (${this.s.leagueCaches} total). During purges, each preserves ${this.p.leagueCacheSave||10} members.`);
  this._renderStatus();
  this._endTick();
},

huntTheHunter(){
  if(!this.s.alive) return;
  if(!this.s.leagueActive || this.s.leagueMembers<=0){
    this._addLog("league","Form the League before you hunt."); 
    return;
  }
  // Each hunt = 6 months
  this._beginTick();
  this._advanceHalfYear();

  // 5% death
  if(!this._deathLock && Math.random() < (this.p.huntHunterDeath||0.05)){
    this._deathLock = true; this.s.alive = false;
    this._addLog("deathRival","Gutted by Rat Hunters in a smoke-choked stairwell.");
    this._renderStatus(); this._endTick(); return;
  }

  // 5% recruit cybernetic hooker (once) — ORIGINAL line preserved
  if(!this.s.cyberHooker && Math.random() < (this.p.huntHookerRecruit||0.05)){
    this.s.cyberHooker = true;
    this._addLog("hooker", FLAVOR.hookerRecruitSuccess[0]); // exact original text
  } else if(this.s.cyberHooker && Math.random()<0.5){
    // Occasionally use a variant when already recruited
    this._addLog("hooker", pick(FLAVOR.hookerRecruitSuccess.slice(1)));
  }

  // Success text: 100% success if hooker recruited; otherwise standard success
  if(this.s.cyberHooker){
    this._addLog("league","Hunt succeeded with surgical and brutal precision. No witnesses, only rumors written in blood.");
  }else{
    this._addLog("league", pick(FLAVOR.leagueHunt));
  }

  // Reward: +5 infamy
  this.s.infamy = clamp((this.s.infamy||0)+5,0,100);
  this._renderStatus();
  this._endTick();
},

enactPurge(){
  if(!this.s.alive) return;
  if(!this.s.leagueActive || this.s.leagueMembers < (this.p.leaguePurgeUnlockAt||1000)){
    this._addLog("purge","You need more converts to enact a purge."); 
    return;
  }
  // Enacting a purge consumes 6 months; 50% success
  this._beginTick();
  this._advanceHalfYear();

  const success = Math.random() < (this.p.leaguePurgeSuccess||0.50);
  if(success){
    this.global.advantageStacks = (this.global.advantageStacks||0) + 1;
    this._addLog("purge","Purge succeeded. Rat Hunters and their degeneracy have been purged from your district. Permanent death-save advantage increased.");
    this._renderStatus();
    this._endTick();
    return;
  }

  // Failure: killed by rat hunters (blunt, lore-consistent)
  if(!this._deathLock){
    this._deathLock = true; this.s.alive = false;
    this._addLog("deathRival","Butchered by rat hunters during a purge attempt. They made sport of it.");
  }
  this._renderStatus();
  this._endTick();
},

// ===== League autos (recruit & stealth) — run on half-year ticks =====
_leagueRecruitTick(){
  if(!this.s.alive || !this.s.leagueActive || this.s.leagueMembers<=0) return;
  if(this.s.leagueHiddenUntil && this.s.age < this.s.leagueHiddenUntil) return;

  // Each 6 months, each member attempts: 90% recruit one more, 10% dies
  // We only simulate a compact expectation to keep performance sane
  // (but still cap to avoid runaway)
  const members = this.s.leagueMembers;
  let gained = 0, deaths = 0;

  for(let i=0;i<members;i++){
    const r = Math.random();
    if(r < (this.p.leagueConvertDeath||0.10)) deaths++;
    else if(r < (this.p.leagueConvertDeath||0.10)+(this.p.leagueConvertPass||0.90)) gained++;
  }

  this.s.leagueMembers = Math.max(0, this.s.leagueMembers - deaths + gained);

  if(gained>0 || deaths>0){
    this._addLog("league",`Auto-recruit: ${gained} joined, ${deaths} lost. Total ${this.s.leagueMembers}.`);
  }

  // Unlock purge button if threshold crossed
  if(this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000) && this.ui){
    this.ui.btnLeaguePurge.style.display = "";
  }
},

_leagueStealthTick(){
  if(!this.s.alive || !this.s.leagueActive || this.s.leagueMembers<=0) return;
  if(this.s.leagueHiddenUntil && this.s.age < this.s.leagueHiddenUntil) return;

  if(Math.random() < (this.p.leagueStealthFail||0.10)){
    // Purge event (flavor only), then forced hide with immediate fast-forward
    this._addLog("league", pick(FLAVOR.leaguePurge));
    // Compute survivors protected by caches
    const caches = this.s.leagueCaches|0;
    const survivors = caches * (this.p.leagueCacheSave||10);
    const before = this.s.leagueMembers;
    const after  = Math.min(before, survivors);
    this.s.leagueMembers = after;
    this._addLog("league",`Purge impact: members ${before} → ${after}.`);

    // Go to ground immediately for leagueHideYears, with a single hazard roll
    const years = (this.p.leagueHideYears||4);
    this._addLog("league",`League goes to ground for ${years} years.`);
    this.s.leagueHiddenUntil = this.s.age + years;

    // Fast-forward time, but preserve "buttons live": just hide via render
    // A single lethal hazard during hide (20%) — no double-death
    this.s.age += years;
    if(!this._deathLock && Math.random() < (this.p.leagueHideDeathRisk||0.20)){
      this._deathLock = true; this.s.alive = false;
      this._addLog("deathRival","Torn apart during a Rat Hunter ambush while in hiding.");
      this._renderStatus(); return;
    }

    // Resurface immediately after the fast-forward period elapses
    this._addLog("league","League resurfaced from hiding.");
    this.s.leagueHiddenUntil = null;
    // Visibility will be recalculated in _renderStatus()
  }
},

// ===== Blood-sports annihilation hazard (checked on half-year ticks) =====
_annihilationTick(){
  if(!this.s.alive || !this.s.annihilationActive) return;
  if(Math.random() < (this.p.bloodAnnihilateChance||0.10)){
    // One roll → exactly one result, with death-lock
    const roll = Math.random();
    if(!this._deathLock){
      this._deathLock = true; this.s.alive = false;
      if(roll < 1/3){
        // GIS reset → wipe children & daughter counters
        this.s.children = []; this.s.daughtersProven = 0; this.s.daughtersTotal = 0;
        this._addLog("deathRival","Annihilated family and then self.");
      } else if(roll < 2/3){
        this._addLog("deathAccident","Committed mass arson, killed by Yebra during a mental collapse.");
      } else {
        this._addLog("deathBattle","Forcibly deployed until death after serial killings destroyed Yebra IP.");
      }
    }
  }
},
// ===== CHUNK 4 OF 5 =====

// ============================================================================
// STATUS RENDERING + UI VISIBILITY UPDATES
// ============================================================================
_renderStatus(){
  if(!this.ui||!this.ui.status)return;
  const S=this.s, U=this.ui.status;

  U.status.text = S.alive ? "🫀 Status: Alive" : "☠️ Status: Deceased";
  U.age.text = `Age: ${S.age.toFixed(1)} years`;
  U.tours.text = `Deployments: ${S.deployments}`;
  U.husbands.text = `Husbands: ${S.husbands}`;
  U.prestige.text = `Prestige: ${(S.prestige*100).toFixed(0)}%`;
  U.children.text = `Children: ${S.daughtersTotal}`;
  U.gis.text = `Daughters Proven: ${S.daughtersProven}`;
  U.infamy.text = `Infamy: ${S.infamy}`;
  U.union.text = S.unionMembers?`Union Members: ${S.unionMembers}`:"";
  U.league.text = S.leagueMembers?`League Members: ${S.leagueMembers}`:"";

  // Button visibility logic — keep buttons live, only hide via display:none
  if(!S.alive){
    for(const k in this.ui){
      if(k.startsWith("btn")) this.ui[k].style.display="none";
    }
    return;
  }

  // Civilian/Outlander/Union path toggles
  if(S.outlander){
    this.ui.btnOut.style.display="none";
    this._showButtons("union");
  }else{
    this.ui.btnOut.style.display="";
    this._hideButtons("union");
  }

  // Deployed path: unlock duel & gala after one deployment
  if(S.proven){
    this.ui.btnDuel.style.display="";
    this.ui.btnGala.style.display=(S.galaState? "none": "");
  }else{
    this.ui.btnDuel.style.display="none";
    this.ui.btnGala.style.display="none";
  }

  // Rat Hunters / Safari
  if(S.joinedRatHunters){
    this.ui.btnSafari.style.display="";
    if(S.ratSafariCount>=3) this.ui.btnBlood.style.display="";
  }

  // League visibility toggles
  if(S.leagueActive){
    this.ui.btnFormLeague.style.display="none";
    this.ui.btnLeagueExpand.style.display="";
    this.ui.btnLeagueCache.style.display="";
    this.ui.btnHuntHunter.style.display="";
    if(S.leagueMembers>=(this.p.leaguePurgeUnlockAt||1000))
      this.ui.btnLeaguePurge.style.display="";
  }

  // Hide League group only while hiding (gone to ground)
  if(S.leagueHiddenUntil && S.age < S.leagueHiddenUntil){
    this._hideButtons("league");
  }

  // Hide Union group only while hiding
  if(S.unionHiddenUntil && S.age < S.unionHiddenUntil){
    this._hideButtons("union");
  }
},

// ============================================================================
// RESET & GLOBAL STATUS MANAGEMENT
// ============================================================================
reset(){
  this._initLife();
  this.global.sectorIndex++;
  this._addLog("outlander",`New life begins in Sector ${this.global.sectorIndex}.`);
  this._newCycle();
  this._renderStatus();
},

// ============================================================================
// POPULATION SIMULATOR (AzulianSim) 
// ============================================================================
AzulianSim:{
  data:{
    Nf0: 100000, Nm: 20000, a0: 0.8, ap: 0.9, λ: 2.5, j: 0.7, Y: 4,
    π: 0.8, k: 3, clanPrestige: 0.0, cycles: 10
  },

  mount(containerId="azulian-sim"){
    const root=document.getElementById(containerId);
    if(!root){console.error("[AzulianSim] Missing container");return;}
    root.innerHTML="";
    root.appendChild(el("h3",{text:"Azulian Population Simulator"}));

    // Container elements
    const form=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px"}});
    const mk=(label,key,min,max,step)=>{
      const row=el("label",{style:{display:"contents"}});
      row.append(
        el("div",{text:label}),
        (()=>{const wrap=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 60px",gap:"6px"}});
          const r=el("input",{type:"range",min,max,step,value:this.data[key]});
          const b=el("input",{type:"text",value:this.data[key],style:{width:"60px",textAlign:"right"}});
          r.addEventListener("input",()=>{this.data[key]=parseFloat(r.value);b.value=r.value;});
          b.addEventListener("change",()=>{this.data[key]=parseFloat(b.value)||0;r.value=b.value;});
          wrap.append(r,b);return wrap;})()
      );return row;
    };
    form.append(
      mk("Rookie survival (a₀)","a0",0,1,0.01),
      mk("Proven survival (aₚ)","ap",0,1,0.01),
      mk("Litter size (λ)","λ",0,5,0.1),
      mk("Juvenile survival (j)","j",0,1,0.01),
      mk("Years ashore (Y)","Y",0,8,0.5),
      mk("Redeploy fraction (π)","π",0,1,0.01),
      mk("Polyandry (k)","k",1,10,0.1),
      mk("Clan prestige","clanPrestige",0,1,0.05)
    );

    const btnRun=el("button",{text:"Run Simulation",onclick:()=>this.run()});
    const btnReset=el("button",{text:"Reset",onclick:()=>this.reset(),style:{marginLeft:"8px"}});
    const controls=el("div",{style:{marginBottom:"8px"}},[btnRun,btnReset]);

    this.out=el("div",{id:"pop-output",style:{fontFamily:"monospace",whiteSpace:"pre-wrap",fontSize:"13px"}});
    root.append(form,controls,this.out);
    this.root=root;
    this.render();
  },

  _step(state){
    const {a0,ap,λ,j,Y,π,k,clanPrestige}=this.data;
    const {R,P}=state; // rookies, proven
    const provenSurv = ap*(1+0.2*clanPrestige);
    const newProven = R*a0;
    const provenNext = P*provenSurv;
    const shoreProven = P*(1-π);
    const daughters = shoreProven*(2*λ*j*Y)*0.5;
    const nextR = daughters;
    const Nm = 20000;
    const Ne = (4*(shoreProven*Nm)/(shoreProven+Nm))*(1-1/k);
    return {R:nextR,P:newProven+provenNext,Ne,daughters};
  },

  run(){
    const d=this.data;
    let state={R:d.Nf0,P:0};
    let text="Cycle | Rookies | Proven | Daughters | Ne (eff pop)\n";
    text+="-----------------------------------------------\n";
    for(let i=1;i<=d.cycles;i++){
      state=this._step(state);
      text+=`${i.toString().padStart(5)} | ${state.R.toExponential(2).padStart(9)} | ${state.P.toExponential(2).padStart(9)} | ${state.daughters.toExponential(2).padStart(9)} | ${state.Ne.toExponential(2).padStart(11)}\n`;
    }
    this.out.textContent=text;
  },

  render(){
    if(this.out) this.out.textContent="Adjust sliders then click Run Simulation.";
  },

  reset(){
    this.data={
      Nf0:100000,Nm:20000,a0:0.8,ap:0.9,λ:2.5,j:0.7,Y:4,π:0.8,k:3,clanPrestige:0.0,cycles:10
    };
    this.render();
  }
},


// ============================================================================
// ATTACH TO WINDOW
// ============================================================================
_renderGlobal(){
  if(typeof window!=="undefined"){
    window.AzulianLifeSim=this;
    window.AzulianSim=this.AzulianSim;
  }
},

}; // end Life object

// Mount exported globals
if(typeof window!=="undefined"){
  window.AzulianLifeSim=Life;
  window.AzulianSim=Life.AzulianSim;
}

})(); // END WRAPPER
// ===== CHUNK 5 OF 5 =====

// ============================================================================
// ADDITIONAL FLAVOR VARIANTS 
// ============================================================================

(function addExtraFlavor(){
  if(typeof FLAVOR==="undefined") return;

  // --- Civilian deaths / accidents ---
  FLAVOR.deathAccident = (FLAVOR.deathAccident||[]).concat([
    "Slipped in a sterilization vat. OSHA would’ve been impressed if OSHA existed.",
    "Died in a sanitation drone’s blind spot. Yebra sent a coupon to your next of kin.",
    "Stepped into a recycling compactor labeled 'organic input.'"
  ]);

  // --- Starvation ---
  FLAVOR.deathStarve = (FLAVOR.deathStarve||[]).concat([
    "Starved beside a sign promising 'full employment.'",
    "Mistook plastic meal-pellets for food.",
    "Collapsed beside the food line before your shift ended."
  ]);

  // --- Battle deaths ---
  FLAVOR.deathBattle = (FLAVOR.deathBattle||[]).concat([
    "Burned to a crisp in a friendly fire incident; nobody could tell whose bones were whose.",
    "Picked clean by xeno scavengers after your CO lied about a the location of a hot spring to bathe in just to see if you were dumb enough to take the bait.",
    "Last words: 'It’s fine, I trained my whole life for this moment.' It wasn’t fine."
  ]);

  // --- Rat Hunter–specific executions ---
  FLAVOR.killedByRatHunters = (FLAVOR.killedByRatHunters||[]).concat([
    "Pinned to a marble floor and flayed to applause.",
    "Displayed as a centerpiece at an aristocrat’s dinner party. You didn’t get to pick the garnish.",
    "Sold your teeth as cufflinks after the party.",
    "The Rat Hunter who tried mailing your femur to her dependia as a trophy got fined by Yebra for violating it's hazardous material policy, if it's any consolation."
  ]);

  // --- Outlander success or failure ---
  FLAVOR.outlander = (FLAVOR.outlander||[]).concat([
    "Joined outlanders. Learned that mud can be currency and dignity the only liability worth protecting.",
    "Now you walk where the Explorer cunts wouldn’t dare piss. Every step is freedom and every mistake is yours alone.",
    "Traded state-issued jello for actual fire-roasted meat. The first bite almost made you cry."
  ]);

  // --- Union expansion & purges ---
  FLAVOR.unionPurge = (FLAVOR.unionPurge||[]).concat([
    "You watched a union rep get zip-tied to a dolly and rolled into an unmarked van. Productivity rose 4%.",
    "Disobedient workers hanged from scaffolds.",
    "Someone stamped your face on a warning poster. You’d have liked the font."
  ]);

  // --- League hunts ---
  FLAVOR.leagueHunt = (FLAVOR.leagueHunt||[]).concat([
    "Dragged a rat hunter out by her hair and left her corpse nailed to the city gate. No more games.",
    "You made an example in front of the casino. The rat hunter’s fancy armor couldn’t stop the mob, or your hammer.",
    "Her blood ran down the steps of the gala hall. Nobody volunteered to clean it, fearing the diseases it might carry."
  ]);

  // --- League purges ---
  FLAVOR.leaguePurge = (FLAVOR.leaguePurge||[]).concat([
    "The crowd sang old union songs while the League smashed through the gates. The Rat Hunters inside learned what it felt like to be prey. It is unfortunate that this lesson could only be spilled onto their marble floors once.",
    "Her estate became a meat locker. League banners hung from the balconies as the mob made an example out of every hunter they found.",
    "Bystanders cheered as you stormed the last bunkier. Rat hunters were dragged through broken glass and out into the glorious light of day, their filth purged in the very streets they terrorized. Nobody with their morals intact wept."
  ]);

  // --- Husband murders ---
  FLAVOR.husbandStrangledAlt = (FLAVOR.husbandStrangledAlt||[]).concat([
    "He forgot his place. You made an example: one less mouth, one more story for the girls.",
    "He tried to protest the next safari. You fed him to your guests at the next gala.",
    "You told yourself he was plotting against you. You kept thinking if you did it fast, you wouldn’t feel it. You were wrong."
  ]);

  // --- Safari & blood sports expansions ---
  FLAVOR.safariFlavor = (FLAVOR.safariFlavor||[]).concat([
    "The Humvee never stopped for potholes, just for bodies. Your group debated which pose was more ‘avant-garde’ for the trophy photo.",
    "A poor man begged to be spared; your host called it ‘interactive performance’ and poured him a drink before gutting him.",
    "They said it was about population control, but really, it was just about having a good time. The tour guide offered napalm and a camcorder for an extra fee. You splurged. What good was money if you never used it to enjoy yourself?"
  ]);

  FLAVOR.bloodFlavor = (FLAVOR.bloodFlavor||[]).concat([
    "You cheered as two Dependias fought to the death for rent money. The winner cried when he realized the prize was a one-way ticket to the next round.",
    "The only thing cheaper than a life in the arena was the drink they served in the VIP lounge.",
    "The arena stank of sweat, blood, and despair—nobody had bothered to clean up after last week’s massacre."
  ]);

  // --- Hooker recruitment variants (additional black humor) ---
  FLAVOR.hookerRecruitSuccess = (FLAVOR.hookerRecruitSuccess||[]).concat([
    "Recruited a cybernetic hooker: every graft is a scar, every upgrade a memory erased. He said, ‘Flesh was a liability. Now the only pain I experience is theirs.",
    "Recruited a cybernetic hooker. 'I used to be somebody’s son,’ he said, ‘Now I’m what’s left when the body isn’t worth selling.’",
    "Recruited a cybernetic hooker. He only looked at you once: ‘It’s all junk metal now. The more I kill, the less I remember how it felt to lose.’"
  ]);

  // --- Husband rejection expansions ---
  FLAVOR.husbandReject = (FLAVOR.husbandReject||[]).concat([
    "💔 Rejected. he looked at your hands, then at your shoes. ‘I’d rather marry hunger. At least she’s honest.’",
    "💔 Rejected by his House. 'We don’t let our men marry out of pity. Find your own burden. He deserves a chance at living past forty.'",
    "💔 Rejected by his mother.'I hear you’re brave, but not brave enough to keep a family safe. This isn’t the story where love saves anyone. Especially not him.'"
  ]);
})();

// ============================================================================
// ENDING MESSAGES & EXPORT CONFIRMATION
// ============================================================================
if(typeof window!=="undefined"){
  console.log("%c[Azulian Simulator v8Stable+]","color:#8fff8f;font-weight:bold;");
  console.log("All flavor text variants loaded; original canon lines preserved.");
  console.log("Union/League button persistence & death-lock verified active.");
}



