//Azulian Sim V7 Union + Rats + Anti-Degen
(function(){

// ── Shared constants + helpers
const C = {
  colors:{ default:"#eaeaea", cycle:"#7ee7ff", success:"#8fff8f", info:"#ffec8f", danger:"#ff8f8f" },
  icons:{ reproduce:"🌸", wait:"🕰", deploy:"🚀", husbandAdd:"💍", husbandDeath:"⚰️",
    prestige:"🧬", jealousyKill:"🔪", deathOld:"⏳", deathBattle:"☠️", deathAccident:"⚙️",
    deathStarve:"🥀", deathPoison:"💔", deathRival:"🩸", union:"🛠️", cache:"📦",
    sabotage:"🧨", revolt:"🔥", outlander:"🏹", duel:"⚔️", gala:"🎭", rat:"🐀",
    hooker:"👠", blood:"🩸", league:"🛡️", purge:"🧹" }
};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rnd=(a,b)=>{a|=0;b|=0;return Math.floor(Math.random()*(b-a+1))+a;};
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
const pick = (arr)=>arr[(Math.random()*arr.length)|0];
const msg = (bank,fallback)=> (typeof FLAVOR!=="undefined" && FLAVOR[bank] && FLAVOR[bank].length)
  ? pick(FLAVOR[bank]) : fallback;

// ── FLAVOR banks
const FLAVOR = {
  husbandReject: [
    "💔 Rejected by prospective husband for being poor. Your dowry was a potato and a pamphlet.",
    "💔 Rejected. He read your Quality Control score and handed your potato back.",
    "💔 Rejected. He said the pamphlet was political and the potato was bruised.",
    "💔 Turned away at the door. The aunties laughed at your audacity and tiny root vegetable."
  ],
  hookerRecruitSuccess: [
    "Recruited a cybernetic hooker. He’s got more cannibalized cyberware than bone; not much left that’s Azulian.",
    "Recruited a cybernetic hooker. His chassis rattles when he laughs.",
    "Recruited a cybernetic hooker. He's recomposed himself from augments torn from man's only natural predator.",
    "Recruited a cybernetic hooker. He says the more he replaces the less he remembers."
  ],
  safariFlavor: [
    "Safari concluded. War crimes photographed for private albums.",
    "Rat Hunters took a holiday safari through the floodplains. Came back wearing new skins.",
    "Hunt complete. You spent the evening comparing screams like vintages.",
    "A vet shot a beggar to test her new augment; crowd applauded accuracy."
  ],
  bloodFlavor: [
    "You attended blood sports. Hunters bragged of cleansing dirtbloods. Even Yebra disowned the footage.",
    "They tied a starving poet to a pole and let the carca have him. Called it 'art therapy'",
    "A Dependia escaped the pits and begged the Hunters for mercy. They filmed his laughter as proof of consent.",
    "Returned from safari with a necklace of tongues. Claimed each one lied."
  ],
  leagueHunt: [
    "League purged a gambling den where captives were made to fight for sport.",
    "Rat Hunter militia crushed after three days of League skirmishes; the unclean were boiled for fertilizer.",
    "League raid uncovered a pit of bones, decided to add the captured rat hunters to the ossarium.",
    "They stormed a brothel and found hooks still dripping. Cleansed the place with fire."
  ],
  killedByRatHunters: [
    "Skinned alive by rat hunters in your own living room.",
    "Suspended from a service railing and used as a meat pinata by rat hunters who called your lack of response boring.",
    "Cornered by rat hunters; you were a souvenir before you were a body.",
    "Rat hunters boxed you in and made a night of it.",
    "You were target practice for drunk aristocrats with military hangovers."
  ],
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
  unionPurge: [
    "Rally turned into a revolt and succeeded for exactly one sunrise before the drones came back.",
    "Yebra purge burns through your ranks, forcing you to hide in tunnels. The air is thick with rot and half-remembered prayers.",
    "Purge spread through the slums like fire through straw; Yebra called it public sanitation."
  ],
  leaguePurge: [
    "Survivors of the latest purge drink from helmets of the fallen.",
    "Rat Hunters painted the stairwells and signed it with your posters.",
    "They broke doors and people in the same motion."
  ],
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

// — Extra Flavor Expansion Pack
function addExtraFlavor(){
  if(typeof FLAVOR==="undefined") return;

  FLAVOR.deathAccident = (FLAVOR.deathAccident||[]).concat([
    "Slipped in a sterilization vat. OSHA would’ve been impressed if OSHA existed.",
    "Died in a sanitation drone’s blind spot. Yebra sent a coupon to your next of kin.",
    "Stepped into a recycling compactor labeled 'organic input.'"
  ]);
  FLAVOR.deathStarve = (FLAVOR.deathStarve||[]).concat([
    "Starved beside a sign promising 'full employment.'",
    "Mistook plastic meal-pellets for food.",
    "Collapsed beside the food line before your shift ended."
  ]);
  FLAVOR.deathBattle = (FLAVOR.deathBattle||[]).concat([
    "Burned to a crisp in a friendly fire incident; nobody could tell whose bones were whose.",
    "Picked clean by xeno scavengers after your CO lied about a hot spring to bathe in just to see if you were dumb enough to take the bait.",
    "Last words: 'It’s fine, I trained my whole life for this moment.' It wasn’t fine."
  ]);
  FLAVOR.killedByRatHunters = (FLAVOR.killedByRatHunters||[]).concat([
    "Pinned to a marble floor and flayed to applause.",
    "Displayed as a centerpiece at an aristocrat’s dinner party. You didn’t get to pick the garnish.",
    "Sold your teeth as cufflinks after the party.",
    "The Rat Hunter who tried mailing your femur to her dependia had the package returned; apparently violating it's hazardous material policy, if it's any consolation."
  ]);
  FLAVOR.outlander = (FLAVOR.outlander||[]).concat([
    "Joined outlanders. Learned that mud can be currency and dignity the only liability worth protecting.",
    "Now you walk where the Explorer cunts wouldn’t dare piss. Every step is freedom and every mistake is yours alone.",
    "Traded state-issued jello for actual fire-roasted meat. The first bite almost made you cry."
  ]);
  FLAVOR.unionPurge = (FLAVOR.unionPurge||[]).concat([
    "You watched a union rep get zip-tied to a dolly and rolled into an unmarked van. Productivity rose 4%.",
    "Disobedient workers hanged from scaffolds.",
    "Someone stamped your face on a warning poster. You’d have liked the font."
  ]);
  FLAVOR.leagueHunt = (FLAVOR.leagueHunt||[]).concat([
    "Dragged a rat hunter out by her hair and left her corpse nailed to the city gate. No more games.",
    "You made an example in front of the casino. The rat hunter’s fancy armor couldn’t stop the mob, or your hammer.",
    "Her blood ran down the steps of the gala hall. Nobody volunteered to clean it, fearing the diseases it might carry."
  ]);
  FLAVOR.leaguePurge = (FLAVOR.leaguePurge||[]).concat([
    "The crowd sang old union songs while the League smashed through estates. This lesson could only be spilled onto their marble floors once.",
    "Her estate became a meat locker. League banners hung from the balconies as the mob made an example out of every hunter they found.",
    "Bystanders cheered as you stormed the last bunkier. Rat hunters were buried in the very streets they terrorized. Nobody with their morals intact wept."
  ]);
  FLAVOR.husbandStrangledAlt = (FLAVOR.husbandStrangledAlt||[]).concat([
    "He forgot his place. You made an example: one less mouth, one more story for the girls.",
    "He tried to protest the next safari. You fed him to your guests at the next gala.",
    "You told yourself he was plotting against you. You kept thinking if you did it fast, you wouldn’t feel it. You were wrong."
  ]);
  FLAVOR.safariFlavor = (FLAVOR.safariFlavor||[]).concat([
    "The Humvee never stopped for potholes, just for bodies. You debated which pose was more ‘avant-garde’ for the trophy photo.",
    "A poor man begged to be spared; your host called it ‘interactive performance’ and poured him a drink before gutting him.",
    "They said it was about population control, but really, it was about appetite. Everybody knew and nobody cared. What good was money if you never used it to enjoy yourself?"
  ]);
  FLAVOR.bloodFlavor = (FLAVOR.bloodFlavor||[]).concat([
    "You cheered as two Dependias fought to the death for rent money. The crowd went quiet when he realized the prize was a one-way ticket to the next round.",
    "The only thing cheaper than a life in the arena was the drink they served in the VIP lounge.",
    "The arena stank of sweat, blood, and despair—nobody had bothered to clean up after last week’s massacre."
  ]);
  FLAVOR.hookerRecruitSuccess = (FLAVOR.hookerRecruitSuccess||[]).concat([
    "Recruited a cybernetic hooker: every graft is a scar, every nerve mapped twice. He said flesh was a liability. Now the only pain I experience is theirs.",
    "Recruited a cybernetic hooker. 'I used to be somebody’s son,' he said, 'Now I’m what’s left when the body isn’t worth selling.'",
    "Recruited a cybernetic hooker. He only looked at you once: 'The more I replace, the less I know. The more I kill, the less I remember how it felt to lose.'"
  ]);
  FLAVOR.husbandReject = (FLAVOR.husbandReject||[]).concat([
    "💔 Rejected. He looked at your hands, then at your shoes. ‘I’d rather marry hunger. At least she’s honest.’",
    "💔 Rejected by his House. 'We don’t let our men marry out of class anymore. Find your own burden. He deserves a chance at living past forty.'",
    "💔 Rejected by his mother.'I hear you’re brave, but not brave enough to keep him fed. This isn’t the story where love saves anyone. Especially not him.'"
  ]);
}
addExtraFlavor();

// Life simulator
const Life = {
  p:{
    baseLifeIfProven:120, baseLifeIfNeverProven:80,
    rookieMortality:0.80, provenMortality:0.20, deployYears:4,
    civilianAnnualMortality:0.15, senescentAnnual:0.05,
    gestationMonths:6, litterMin:1, litterMax:6, juvenileSurvival:0.70,
    provisioningBonusPerHusband:0.05, husbandsMax:6, socialConflictRiskPerYearOverCap:0.15,
    prestigeBoostBeta:0.50, prestigeThreshold:4, daughterProvenProb:0.30,

    // Outlanders / Union
    outlanderAdvantage:0.50,
    unionConvertPass:0.90, unionConvertDeath:0.10,
    unionExpandDeath:0.10, unionCacheDeath:0.10,
    unionStealthFail:0.10, unionCacheSave:10, unionHideYears:4,
    revoltUnlockAt:1000, revoltBaseSuccess:0.10, revoltStackBonus:0.10,

    // Deployed: Infamy / Duel / Gala / Rats / League
    duelBaseWin:0.50, duelPerDeploy:0.10, duelPerWin:0.05, duelMaxWin:0.95,
    infamyPerDeploy:5, infamyPerDuelWin:5, infamyJoinRat:30, infamySafariSuccess:5, infamyBloodSports:50,
    safariOutlanderDeath:0.10, safariHookerDeath:0.05, bloodAnnihilateChance:0.10,
    ratHunterAggroBonus:0.10, leagueConvertPass:0.90, leagueConvertDeath:0.10,
    leagueExpandDeath:0.10, leagueStealthFail:0.10, leagueCacheSave:10, leagueHideYears:4, leagueHideDeathRisk:0.20,
    leaguePurgeUnlockAt:1000, leaguePurgeSuccess:0.50, huntHunterDeath:0.05, huntHookerRecruit:0.05
  },
  caps:{ unionMembers:10000 },
  s:{}, cycleCount:0, ui:{}, currentCycleBody:null,
  global:{ advantageStacks:0 },

  mount(containerId="azulian-life-sim"){
    const root=document.getElementById(containerId);
    if(!root){ console.error("[AzulianLifeSim] Missing container"); return; }
    root.innerHTML=""; root.appendChild(el("h3",{text:"Azulian Life-Cycle Simulator"}));

    const grid=el("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",alignItems:"start"}});
    const left=el("div");
    this.ui.status={ status:el("p"), age:el("p"), tours:el("p"), husbands:el("p"),
      prestige:el("p"), children:el("p"), gis:el("p"), infamy:el("p"), union:el("p"), league:el("p") };
    left.append(this.ui.status.status,this.ui.status.age,this.ui.status.tours,this.ui.status.husbands,
      this.ui.status.prestige,this.ui.status.children,this.ui.status.gis,this.ui.status.infamy,this.ui.status.union,this.ui.status.league);

    const controls=el("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}});
    // Core
    this.ui.btnRepro = el("button",{text:"Reproduce",onclick:()=>this.reproduce()});
    this.ui.btnWait  = el("button",{text:"Wait 6mo",onclick:()=>this.wait()});
    this.ui.btnDeploy= el("button",{text:"Deploy 4y",onclick:()=>this.deploy()});
    this.ui.btnHusb  = el("button",{text:"Add Husband",onclick:()=>this.addHusband()});
    this.ui.btnReset = el("button",{text:"Reset (New Cycle)",onclick:()=>this.reset()});
    // Outlander/Union
    this.ui.btnOut   = el("button",{text:"Join Outlanders",onclick:()=>this.joinOutlanders()});
    this.ui.btnUnion = el("button",{text:"Start Labor Union",onclick:()=>this.startUnion()});
    this.ui.btnExpand= el("button",{text:"Expand Union",onclick:()=>this.expandUnion()});
    this.ui.btnCache = el("button",{text:"Build Supply Cache",onclick:()=>this.buildCache()});
    this.ui.btnSabot = el("button",{text:"Sabotage Yebra Property",onclick:()=>this.sabotage()});
    this.ui.btnRevolt= el("button",{text:"Start Workers' Revolt",onclick:()=>this.revolt()});
    // Deployed path: Duel/Gala/Rats/League
    this.ui.btnDuel  = el("button",{text:"Start Duel",onclick:()=>this.startDuel()});
    this.ui.btnGala  = el("button",{text:"Attend Elite Gala",onclick:()=>this.attendGala()});
    this.ui.btnGalaIgnore = el("button",{text:"Ignore",onclick:()=>this.galaIgnore()});
    this.ui.btnGalaInv    = el("button",{text:"Investigate",onclick:()=>this.galaInvestigate()});
    this.ui.btnJoinRat    = el("button",{text:"Join Rat Hunters",onclick:()=>this.joinRatHunters()});
    this.ui.btnDecline    = el("button",{text:"Decline",onclick:()=>this.galaDecline()});
    this.ui.btnSafari     = el("button",{text:"Attend Safari",onclick:()=>this.attendSafari()});
    this.ui.btnBlood      = el("button",{text:"Attend Blood Sports",onclick:()=>this.attendBloodSports()});
    // League
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

  _addLog(type,msg){
    const icon=(C.icons[type]||""); const color=
      type.startsWith("death")?C.colors.danger:
      (["prestige","union","revolt","cache","sabotage","duel","gala","rat","blood","league","purge"].includes(type)?C.colors.success:
      (["wait","husbandAdd","husbandDeath","jealousyKill"].includes(type)?C.colors.info:C.colors.default));
    const entry=el("div"); entry.innerHTML=`${icon} <span style="color:${color}">${msg}</span>`; entry.style.opacity="0.3";
    if(this.currentCycleBody){
      this.currentCycleBody.appendChild(entry); let o=0.3; const f=setInterval(()=>{o+=0.05;entry.style.opacity=o.toFixed(2);if(o>=1)clearInterval(f);},30);
    }
    if(this.ui.logBox) this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
  },

  _newCycle(){
    this.cycleCount++; const wrap=el("details",{open:true}); const sum=el("summary");
    sum.innerHTML=`<span style="color:${C.colors.cycle};font-weight:600;">🌀 Enter Cycle ${this.cycleCount} — Age 16: Reached maturity.</span>`;
    const body=el("div",{class:"cycle-body",style:{marginLeft:"1em"}}); wrap.append(sum,body); this.ui.logBox.appendChild(wrap);
    this.currentCycleBody=body; this.ui.logBox.scrollTop=this.ui.logBox.scrollHeight;
  },

  _initLife(){
    this.s={
      age:16, alive:true, proven:false, deployments:0,
      husbands:0, husbandAges:[], children:[], daughtersProven:0, daughtersTotal:0,
      prestige:0, highPrestige:false,

      outlander:false, unionMembers:0, unionCaches:0,
      unionHiddenUntil:null, lastStealthTickAge:16,
      unionSectorCapped:false, unionCappedLogged:false,

      infamy:0, duelWins:0,
      galaState:null, galaOutcome:null,
      joinedRatHunters:false, ratSafariCount:0, bloodSports:false, annihilationActive:false,
      ratHunterAggro:false, safariUnlockedHusbandRisks:false, husbandsStrangledChance:0.05,

      leagueActive:false, leagueMembers:0, leagueCaches:0,
      leagueHiddenUntil:null, lastLeagueStealthTickAge:16, cyberHooker:false
    };
  },

  _lifeCap(){ const base=this.s.proven?this.p.baseLifeIfProven:this.p.baseLifeIfNeverProven; return base+(this.s.deployments|0)*(this.p.deployYears??4); },
  _updatePrestige(){
    const d=this.s.daughtersTotal|0, dp=this.s.daughtersProven|0, prev=+this.s.prestige||0;
    const frac=d>0?(dp/d):0; this.s.prestige=Math.min(1,Math.max(0,frac));
    this.s.highPrestige=dp>=(this.p.prestigeThreshold??4);
    if((prev<0.5&&this.s.prestige>=0.5)||(prev<1&&this.s.prestige===1)) this._addLog("prestige","Prestige increased!");
  },

  _roll(p){ return Math.random() < (Number.isFinite(p)?p:0); },
  _applyAdvantageStacks(p){ const stacks=this.global.advantageStacks|0; if(stacks<=0) return p; const adv=(this.p.outlanderAdvantage||0.5); for(let i=0;i<stacks;i++) p*=(1-adv); return p; },
  _advantagePersonal(p){ return this.s.outlander ? p*(1-(this.p.outlanderAdvantage||0.5)) : p; },
  _infamyReduce(p){ const f=clamp(this.s.infamy||0,0,100)/100; return p*(1-f); },

  _checkHusbands(){
    const alive=[]; for(const hAge of (this.s.husbandAges||[])){ if((this.s.age - hAge) > 104) this._addLog("husbandDeath","Husband died of old age."); else alive.push(hAge); }
    this.s.husbandAges=alive; this.s.husbands=alive.length;
    if(this.s.husbands>=2){ const jealousP=0.005*(this.s.husbands-1); if(Math.random()<jealousP){ this.s.husbands-=1; this.s.husbandAges.pop(); this._addLog("jealousyKill","One husband killed another out of jealousy."); } }
    if(this.s.husbands>0 && this.s.safariUnlockedHusbandRisks){
      if(Math.random()<(this.s.husbandsStrangledChance||0.05)){
        this.s.husbands-=1; this.s.husbandAges.pop();
        this._addLog("husbandDeath", msg('husbandStrangledAlt',"A husband was strangled to death by the player during a blackout rage."));
      }
    }
  },

  _advanceHalfYear(){ this.s.age+=0.5; this._unionRecruitTick(); this._unionStealthTick(); this._leagueRecruitTick(); this._leagueStealthTick(); this._annihilationTick(); },

  _checkUnionResurfaced(){ if(this.s.unionHiddenUntil && this.s.age>=this.s.unionHiddenUntil){ this.s.unionHiddenUntil=null; this._addLog("union","Union resurfaced from hiding."); } },
  _checkLeagueResurfaced(){ if(this.s.leagueHiddenUntil && this.s.age>=this.s.leagueHiddenUntil){ this.s.leagueHiddenUntil=null; this._addLog("league","League resurfaced from hiding."); } },

  _applyCivilianMortality(lastAction=null){
    if(!this.s.alive) return;
    this._checkHusbands();
    let p=(this.p.civilianAnnualMortality??0.15)*0.5;
    const cap=this._lifeCap(); if(this.s.age>cap){ const yrs=this.s.age-cap; p=Math.min(0.99,p+yrs*(this.p.senescentAnnual??0.05)*0.5); }
    p=this._applyAdvantageStacks(p); p=this._advantagePersonal(p); p=this._infamyReduce(p);
    if(!this._roll(p)){ this._unionRecruitTick(); this._unionStealthTick(); this._leagueRecruitTick(); this._leagueStealthTick(); this._annihilationTick(); return; }
    if(lastAction==="husbandAttempt" && !this.s.proven && Math.random()<0.10){ this._die("deathRival","Killed by prospective husband's House"); return; }

    const basePool = [
      ["deathAccident","Died in workplace accident",0.15],
      ["deathStarve","Starved to death",0.15],
      ["deathRival","Killed by rival House",0.10]
    ];
    const husbandPool = (this.s.husbands>0) ? [
      ["deathPoison","Poisoned by jealous husband",0.10],
      ...(this.s.safariUnlockedHusbandRisks ? [["deathRival", msg('stabbedByHusbands',"Stabbed to death by husbands"),0.08]] : [])
    ] : [];

    const civilianExtra = (!this.s.proven && this.s.deployments===0) ? [
      ["deathRival","Killed by rival wicker gang",0.12],
      ["deathRival", msg('killedByRatHunters',"Killed by rat hunters"), 0.10 + (this.s.ratHunterAggro?this.p.ratHunterAggroBonus:0)],
      ["deathRival","Killed in worker uprising",0.10],
      ["deathAccident","Died of infection",0.10],
      ["deathPoison","Executed by Yebra for illegal farming",0.10],
      ["deathPoison","Executed by Yebra for sabotage",0.10],
      ["deathPoison","Executed by Yebra for terroristic activity",0.10],
      ["deathPoison","Executed by Yebra for involvement in organized crime",0.10]
    ] : [];

    const veteranExtra = (this.s.proven||this.s.deployments>0) ? [
      ["deathRival","Killed in a duel",0.12],
      ["deathRival","Killed by outlanders while rat hunting",0.10],
      ["deathRival", msg('killedByRatHunters',"Killed by rat hunters"), 0.10 + (this.s.ratHunterAggro?this.p.ratHunterAggroBonus:0)],
      ["deathPoison","Killed by angry prostitute while slumming",0.10],
      ["deathAccident","Overdosed",0.10],
      ["deathPoison","Executed for space piracy",0.10],
      ["deathPoison","Executed for violating Yebra patent law",0.10],
      ["deathRival","Killed in a drunken brawl",0.10]
    ] : [];

    const oldAge = (this.s.age>=80) ? [["deathOld","Died of old age",0.25]] : [];
    const inf = clamp(this.s.infamy||0,0,100)/100;
    const pool = [...basePool, ...husbandPool.map(([t,m,w])=>[t,m,w*(1+inf)]), ...civilianExtra, ...veteranExtra, ...oldAge];
    const totalW=pool.reduce((a,[,,w])=>a+w,0);
    let r=Math.random()*totalW; for(const [type,msgTxt,w] of pool){ r-=w; if(r<=0){ this._die(type,msgTxt); return; } }
    this._die("deathAccident","Died in unexplained circumstances");
  },
// Life: Outlanders/Union + annihilation + core actions (with flavor)
  _unionStealthTick(){
    if(!this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.age - (this.s.lastStealthTickAge||0) < 0.5) return;
    this.s.lastStealthTickAge=this.s.age;

    if(Math.random() < (this.p.unionStealthFail||0.10)){
      const before=this.s.unionMembers, survivors=(this.s.unionCaches|0)*(this.p.unionCacheSave||10);
      const after=Math.min(before,survivors);
      this.s.unionMembers=after;
      this._addLog("union", msg('unionPurge',"Union purge by Yebra."));
      this._addLog("union",`Members ${before} → ${after}.`);
      this._addLog("union",`Union forced into hiding for ${(this.p.unionHideYears||4)} years.`);
      this.s.age += (this.p.unionHideYears||4);
      if(Math.random()<0.20){ this._applyCivilianMortality(); if(!this.s.alive) return; }
      this.s.unionHiddenUntil = this.s.age;
      this._addLog("union","Union resurfaced from hiding.");
    }
  },

  _unionRecruitTick(){
    if(!this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionSectorCapped) return;
    if(this.s.unionHiddenUntil && this.s.age < this.s.unionHiddenUntil) return;

    let gained=0, deaths=0, members=this.s.unionMembers|0;
    for(let i=0;i<members;i++){
      const r=Math.random();
      if(r < (this.p.unionConvertDeath||0.10)) deaths++;
      else if(r < (this.p.unionConvertDeath||0.10)+(this.p.unionConvertPass||0.90)) gained++;
    }
    this.s.unionMembers = Math.max(0, this.s.unionMembers - deaths + gained);

    if(this.s.unionMembers >= this.caps.unionMembers){
      this.s.unionMembers = this.caps.unionMembers;
      if(!this.s.unionCappedLogged){
        this._addLog("union","Sector unionized. No further recruitment possible in this region.");
        this.s.unionCappedLogged = true;
      }
      this.s.unionSectorCapped = true;
    }else if(deaths>0 || gained>0){
      this._addLog("union",`Auto-recruit: ${deaths>0?deaths+' executed, ':''}+${gained} recruited. Total ${this.s.unionMembers}.`);
    }
  },

  _annihilationTick(){
    if(!this.s.annihilationActive) return;
    if(Math.random() < (this.p.bloodAnnihilateChance||0.10)){
      const roll=Math.random();
      if(roll<1/3){ this.s.children=[]; this.s.daughtersProven=0; this.s.daughtersTotal=0; this._die("deathRival","Annihilated family and then self."); }
      else if(roll<2/3){ this._die("deathAccident","Committed mass arson, killed by Yebra during a mental collapse."); }
      else { this._die("deathBattle","Forcibly deployed until death after serial killings destroyed Yebra IP."); }
    }
  },

  addHusband(){
    if(!this.s.alive) return;
    if(!this.s.proven){
      this._advanceHalfYear();
      const rejected=Math.random()<0.95;
      if(rejected){
        this._addLog("wait", msg('husbandReject',"💔 Rejected by prospective husband for being poor."));
        this._applyCivilianMortality("husbandAttempt"); this._renderStatus(); return;
      }
    }else{ this._advanceHalfYear(); }
    this.s.husbands+=1; (this.s.husbandAges||[]).push(this.s.age);
    this._addLog("husbandAdd",`Took another husband. Total=${this.s.husbands}.`);
    this._renderStatus();
  },

  reproduce(){
    if(!this.s.alive) return;
    if((this.s.husbands|0)<1){ this._addLog("wait","You cannot reproduce without at least one husband."); return; }
    const litter=rnd((this.p.litterMin??1),(this.p.litterMax??6));
    const jBase=this.p.juvenileSurvival??0.7;
    const bonus=(this.p.provisioningBonusPerHusband??0.05)*Math.max(0,(this.s.husbands|0)-1);
    const j=Math.min(0.95,Math.max(0,jBase*(1+bonus)));
    let survive=0,daughters=0,proved=0;
    for(let i=0;i<litter;i++){
      const sex=Math.random()<0.5?"F":"M"; const adult=this._roll(j);
      let pv=false; if(sex==="F"&&adult) pv=this._roll(this.p.daughterProvenProb??0.2);
      this.s.children.push({sex,adult,proven:pv});
      if(adult)survive++; if(sex==="F"){daughters++; if(pv)proved++;}
    }
    this.s.daughtersTotal+=daughters; this.s.daughtersProven+=proved; this._updatePrestige();
    this._advanceHalfYear();
    this._addLog("reproduce",`Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
    this._applyCivilianMortality(); this._renderStatus();
  },

  wait(){
    if(!this.s.alive) return;
    this._advanceHalfYear();
    this._checkUnionResurfaced(); this._checkLeagueResurfaced();
    this._addLog("wait",`Waited 6 months. Age→${this.s.age.toFixed(1)}`);
    this._applyCivilianMortality(); this._renderStatus();
  },

  deploy(){
    if(!this.s.alive) return;
    if(this.s.outlander){ this._die("deathPoison","Executed by Yebra for terroristic affiliations when attempting to deploy"); return; }
    const first=!this.s.proven;
    let m=first?(this.p.rookieMortality??0.8):(this.p.provenMortality??0.2);
    m=Math.max(0, m*(1-(this.p.prestigeBoostBeta??0.5)*(+this.s.prestige||0)));
    const survived=!this._roll(m);
    this.s.age+=(this.p.deployYears??4); this.s.deployments+=1;
    if(survived){
      if(first) this.s.proven=true;
      this.s.infamy = clamp((this.s.infamy||0)+(this.p.infamyPerDeploy||5),0,100);
      this._addLog("deploy",`Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age} · Infamy ${this.s.infamy}`);
      this._renderStatus();
    }else{
      if(Math.random()<0.33) this._die("deathBattle","Thrown from airlock after failed QC"); else this._die("deathBattle","Died in battle");
    }
  },

  joinOutlanders(){
    if(!this.s.alive) return;
    if(this.s.proven){ this._addLog("outlander","Cannot join Outlanders after deploying."); return; }
    if(this.s.outlander){ this._addLog("outlander","Already aligned with Outlanders."); return; }
    this.s.outlander=true;
    this._addLog("outlander", pick(FLAVOR.outlander||["Joined Outlanders. Civilian death risk reduced; deployment locked. Union play unlocked."]));
    this._renderStatus();
  },

  startUnion(){
    if(!this.s.alive || !this.s.outlander) return;
    if(this.s.unionMembers>0){ this._addLog("union","Union already formed."); return; }
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){ this._addLog("union","Union is in hiding; cannot operate yet."); return; }
    this.s.unionMembers=1; this.s.unionSectorCapped=false; this.s.unionCappedLogged=false;
    this._addLog("union","Started a labor union (1 member)."); this._renderStatus();
  },

  expandUnion(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){ this._addLog("union","Union is in hiding; cannot expand."); return; }
    if(this.s.unionSectorCapped){ this._addLog("union","Sector unionized. No further recruitment possible in this region."); return; }
    this._advanceHalfYear();
    if(Math.random()<(this.p.unionExpandDeath||0.10)){ this._die("deathPoison","Executed by Yebra for terroristic activity while recruiting"); return; }
    this.s.unionMembers = Math.min(this.caps.unionMembers, this.s.unionMembers + 1);
    if(this.s.unionMembers===this.caps.unionMembers && !this.s.unionCappedLogged){
      this._addLog("union","Sector unionized. No further recruitment possible in this region.");
      this.s.unionCappedLogged = true; this.s.unionSectorCapped = true;
    }else{
      this._addLog("union",`Recruited one new member. Total ${this.s.unionMembers}.`);
    }
    if(this.s.unionMembers >= (this.p.revoltUnlockAt||1000)) this._addLog("revolt","Workers' Revolt is now available.");
    this._renderStatus();
  },

  buildCache(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){ this._addLog("union","Union is in hiding; cannot build caches."); return; }
    this._advanceHalfYear();
    if(Math.random()<(this.p.unionCacheDeath||0.10)){ this._die("deathAccident","Executed by Yebra drone for suspicious activity while building cache"); return; }
    this.s.unionCaches+=1; this._addLog("cache",`Built supply cache (${this.s.unionCaches} total). During purges, each cache preserves ${this.p.unionCacheSave||10} members.`);
    this._renderStatus();
  },

  sabotage(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){ this._addLog("sabotage","Union is in hiding; cannot sabotage."); return; }
    this._advanceHalfYear();
    const bonus=Math.floor((this.s.unionMembers||0)/10)*0.01;
    const successP=Math.min(0.90,0.30+bonus);
    if(Math.random()<successP) this._addLog("sabotage",`Sabotage successful (p=${(successP*100).toFixed(0)}%).`);
    else this._addLog("sabotage","Sabotage failed; lay low.");
    this._renderStatus();
  },

  revolt(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<(this.p.revoltUnlockAt||1000)) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){ this._addLog("revolt","Union is in hiding; cannot revolt."); return; }
    const p=(this.p.revoltBaseSuccess||0.10)+(this.global.advantageStacks||0)*(this.p.revoltStackBonus||0.10);
    if(Math.random()<p){ this.global.advantageStacks=(this.global.advantageStacks||0)+1; this._addLog("revolt",`Workers' Revolt succeeded! Permanent death-save advantage increased (stacks: ${this.global.advantageStacks}).`); }
    else{
      this._addLog("revolt",`Workers' Revolt failed (p=${(p*100).toFixed(0)}%). Heavy reprisals follow.`);
      const before=this.s.unionMembers, survivors=(this.s.unionCaches|0)*(this.p.unionCacheSave||10);
      const after=Math.min(before,survivors); this.s.unionMembers=after;
      this._addLog("union", msg('unionPurge', "Reprisals: union crushed."));
      this._addLog("union",`Union ${before}→${after}, went to ground for ${(this.p.unionHideYears||4)} years.`);
      this.s.age += (this.p.unionHideYears||4);
      if(Math.random()<0.20){ this._applyCivilianMortality(); if(!this.s.alive) return; }
      this.s.unionHiddenUntil = this.s.age; this._addLog("union","Union resurfaced from hiding.");
    }
    this._renderStatus();
  },
// Life: Deployed path (Duel / Gala / Rats / League) with flavor
  _duelWinChance(){
    const base=(this.p.duelBaseWin||0.50), perDep=(this.p.duelPerDeploy||0.10)*(this.s.deployments||0), perWin=(this.p.duelPerWin||0.05)*(this.s.duelWins||0);
    const inf = clamp(this.s.infamy||0,0,100)/100;
    return clamp(base+perDep+perWin+inf,0,this.p.duelMaxWin||0.95);
  },

  startDuel(){
    if(!this.s.alive) return;
    if(!this.s.proven && this.s.deployments===0){ this._addLog("duel","You need at least one successful deployment before starting duels."); return; }
    this._advanceHalfYear();
    const p=this._duelWinChance();
    if(Math.random()<p){ this.s.duelWins=(this.s.duelWins||0)+1; this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamyPerDuelWin||5),0,100);
      this._addLog("duel",`Won the duel! (win p=${Math.round(p*100)}%). Infamy +${this.p.infamyPerDuelWin||5} → ${this.s.infamy}.`);
    } else { this._die("deathRival","Killed in duel."); return; }
    this._renderStatus();
  },

  attendGala(){
    if(!this.s.alive) return;
    if(!this.s.proven && this.s.deployments===0){ this._addLog("gala","You must survive one deployment before being invited to elite galas."); return; }
    if(this.s.galaOutcome){ this._addLog("gala","That circle will not invite you again."); return; }
    this.s.galaState='intro';
    this._addLog("gala", msg('galaIntro',"You notice that some of the male attendees do not look happy about being here."));
    this.ui.btnGalaIgnore.style.display=""; this.ui.btnGalaInv.style.display="";
    this._renderStatus();
  },

  galaIgnore(){
    if(this.s.galaState!=='intro') return;
    this._advanceHalfYear();
    this._addLog("gala", msg('galaIgnoreFollow',"A rat hunter approaches you and asks if you're interested in a safari."));
    this.ui.btnJoinRat.style.display=""; this.ui.btnDecline.style.display="";
    this.ui.btnGalaIgnore.style.display="none"; this.ui.btnGalaInv.style.display="none";
    this.s.galaState='ignore';
  },

  galaDecline(){
    if(this.s.galaState!=='ignore') return;
    this._advanceHalfYear();
    this._addLog("gala","You decline politely and leave the gala with a strange aftertaste.");
    this.ui.btnJoinRat.style.display="none"; this.ui.btnDecline.style.display="none";
    this.s.galaState=null; this.s.galaOutcome="ignore_decline";
    this._renderStatus();
  },

  galaInvestigate(){
    if(this.s.galaState!=='intro') return;
    this._advanceHalfYear();
    this._addLog("gala","You discovered a trafficking ring behind the smiles.");
    const scene=Math.random()<0.5;
    if(scene){
      this._addLog("gala", msg('galaInvestigateSceneYou',"You made a scene: majority of attendees side with you; rat hunters flee."));
      this.s.ratHunterAggro=true; this.ui.btnFormLeague.style.display=""; this.s.galaOutcome="investigate_you";
    }else{
      this._addLog("gala", msg('galaInvestigateSceneThem',"You made a scene: majority of attendees side with rat hunters; you're expelled from the gala."));
      this.s.ratHunterAggro=true; this.s.galaOutcome="investigate_them";
    }
    this.ui.btnGalaIgnore.style.display="none"; this.ui.btnGalaInv.style.display="none"; this.s.galaState=null; this._renderStatus();
  },

  joinRatHunters(){
    if(this.s.joinedRatHunters) return;
    if(this.s.galaState!=='ignore') return;
    this._advanceHalfYear();
    this.s.joinedRatHunters=true;
    this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamyJoinRat||30),0,100);
    this._addLog("rat",`Joined Rat Hunters. Infamy +${this.p.infamyJoinRat||30} → ${this.s.infamy}.`);
    this._addLog("rat","Their expeditions are crimes in everything but name; husbands grow cold at the stories you do not tell.");
    this.ui.btnSafari.style.display=""; this.ui.btnJoinRat.style.display="none"; this.ui.btnDecline.style.display="none";
    this.s.galaOutcome="ignore_join"; this._renderStatus();
  },

  attendSafari(){
    if(!this.s.joinedRatHunters) return;
    this._advanceHalfYear();
    if(Math.random() < (this.p.safariHookerDeath||0.05)){ this._die("deathRival","Eviscerated by a cybernetic hooker in a chrome-lit pit."); return; }
    if(Math.random() < (this.p.safariOutlanderDeath||0.10)){ this._die("deathRival", msg('killedByRatHunters',"Killed by outlanders during a botched safari.")); return; }
    this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamySafariSuccess||5),0,100);
    this.s.ratSafariCount=(this.s.ratSafariCount||0)+1; if(this.s.ratSafariCount>=1) this.s.safariUnlockedHusbandRisks=true;
    this._addLog("rat", `${msg('safariFlavor','Safari concluded. War crimes photographed for private albums.')} Infamy +${this.p.infamySafariSuccess||5} → ${this.s.infamy}.`);
    if(this.s.ratSafariCount>=3){ this.ui.btnBlood.style.display=""; this._addLog("blood","Blood Sports now available. You know too much to be clean again."); }
    this._renderStatus();
  },

  attendBloodSports(){
    if(!this.s.joinedRatHunters || this.s.ratSafariCount<3) return;
    this.s.infamy=clamp((this.s.infamy||0)+(this.p.infamyBloodSports||50),0,100);
    this.s.bloodSports=true; this.s.annihilationActive=true;
    this._addLog("blood", `${msg('bloodFlavor','You attended blood sports.')} Infamy +${this.p.infamyBloodSports||50} → ${this.s.infamy}.`);
    this._addLog("blood","Participants become mannequins with pulses. The floor keeps the stains.");
    this._renderStatus();
  },

  // League
  formLeague(){
    if(this.s.leagueActive) return;
    if(this.s.galaOutcome!=="investigate_you"){ this._addLog("league","You need leverage from the gala scene to found the League."); return; }
    this._advanceHalfYear();
    this.s.leagueActive=true; this.s.leagueMembers=1;
    this._addLog("league","Formed Anti-Degeneracy League (1 member). The corrupt elites will learn to fear the light.");
    this._renderStatus();
  },

  expandLeague(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    this._checkLeagueResurfaced();
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){ this._addLog("league","League is in hiding; cannot expand."); return; }
    this._advanceHalfYear();
    if(Math.random()<(this.p.leagueExpandDeath||0.10)){ this._die("deathRival","Disemboweled by Rat Hunters while recruiting for the League"); return; }
    this.s.leagueMembers+=1; this._addLog("league",`Recruited one member. League total ${this.s.leagueMembers}.`);
    if(this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000)) this._addLog("purge","Enact Purge is now available.");
    this._renderStatus();
  },

  buildHideout(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    this._checkLeagueResurfaced();
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){ this._addLog("league","League is in hiding; cannot build hideouts."); return; }
    this._advanceHalfYear();
    if(Math.random()<(this.p.leagueExpandDeath||0.10)){ this._die("deathRival","Skinned alive by Rat Hunters while scouting a hideout"); return; }
    this.s.leagueCaches+=1; this._addLog("league",`Built a safe house (${this.s.leagueCaches} total). During purges, each preserves ${this.p.leagueCacheSave||10} members.`);
    this._renderStatus();
  },

  huntTheHunter(){
    if(!this.s.leagueActive || this.s.leagueMembers<=0) return;
    this._checkLeagueResurfaced();
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){ this._addLog("league","League is in hiding; cannot hunt."); return; }
    this._advanceHalfYear();
    if(Math.random()<(this.p.huntHunterDeath||0.05)){ this._die("deathRival", msg('killedByRatHunters',"Gutted by Rat Hunters in a smoke-choked stairwell")); return; }
    if(!this.s.cyberHooker && Math.random()<(this.p.huntHookerRecruit||0.05)){ this.s.cyberHooker=true; this._addLog("hooker", msg('hookerRecruitSuccess',"Recruited a cybernetic hooker. She knows where the bones are buried.")); }
    const flavor = msg('leagueHunt', this.s.cyberHooker ? "Hunt succeeded with surgical precision. No witnesses, only rumors." : "Hunt succeeded. Their fear tastes like tin.");
    this._addLog("league", flavor);
    this.s.infamy=clamp((this.s.infamy||0)+5,0,100);
    this._renderStatus();
  },

  enactPurge(){
    if(!this.s.leagueActive || this.s.leagueMembers<(this.p.leaguePurgeUnlockAt||1000)) return;
    this._checkLeagueResurfaced();
    if(this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil){ this._addLog("purge","League is in hiding; cannot enact purge."); return; }
    this._advanceHalfYear();
    if(Math.random()<(this.p.leaguePurgeSuccess||0.50)){
      this.global.advantageStacks=(this.global.advantageStacks||0)+1;
      this._addLog("purge",`Purge succeeded. Rat Hunter dens are cinders. Permanent death-save advantage increased (stacks: ${this.global.advantageStacks}).`);
    }else{
      this._die("deathRival", msg('killedByRatHunters',"Riddled with flechettes by Rat Hunters while attempting the purge")); return;
    }
    this._renderStatus();
  },
// Life: death + HUD gating + reset + export/boot
  _die(type,msg){ this.s.alive=false; this._addLog(type,`${msg}. Final age ${this.s.age.toFixed(1)}.`); this._renderStatus(); },

  _computeGIS(){
    let score=0,max=0; for(const ch of (this.s.children||[])){ max+=3; if(ch.adult) score+=1; if(ch.proven) score+=2; }
    const norm=max>0?Math.round(100*score/max):0; return {score,max,norm};
  },

  _renderStatus(){
    if(!this.ui.status) return;
    const cap=this._lifeCap(), gis=this._computeGIS();
    const total=(this.s.children?.length)||0, adults=(this.s.children?.filter(c=>c.adult).length)||0;
    const df=(this.s.children?.filter(c=>c.sex==='F').length)||0, dp=this.s.daughtersProven||0;

    this.ui.status.status.innerHTML=`<b>Status:</b> ${this.s.alive?'Alive':'Dead'} ${this.s.outlander?'· Outlander':''} ${this.s.proven||this.s.deployments>0?'· Deployed':''}`;
    this.ui.status.age.innerHTML   =`<b>Age:</b> ${this.s.age.toFixed(1)} / Cap ${cap.toFixed(1)}`;
    this.ui.status.tours.innerHTML =`<b>Deployments:</b> ${this.s.deployments|0}`;
    this.ui.status.husbands.innerHTML=`<b>Husbands:</b> ${this.s.husbands|0}`;
    this.ui.status.prestige.innerHTML=`<b>Prestige:</b> ${Math.round((+this.s.prestige||0)*100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal|0}`;
    this.ui.status.children.innerHTML=`<b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} proven daughters`;
    this.ui.status.gis.innerHTML   =`<b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)`;
    this.ui.status.infamy.innerHTML=`<b>Infamy:</b> ${clamp(this.s.infamy||0,0,100)}`;

    // Union HUD (visible from 10+)
    const revoltAvail = (this.s.outlander && this.s.unionMembers >= (this.p.revoltUnlockAt||1000));
    const hideTxtU = (this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil) ? ` · In hiding until age ${this.s.unionHiddenUntil.toFixed(1)}` : "";
    const unionVisible = this.s.outlander && this.s.unionMembers>=10;
    this.ui.status.union.innerHTML =
      (unionVisible ? `<b>Union:</b> ${this.s.unionMembers} members · Caches:${this.s.unionCaches}${hideTxtU} ${revoltAvail?'· Revolt READY':''}`
                    : `<b>Union:</b> (join Outlanders to unlock)`);

    // League HUD (visible from 10+)
    const purgeAvail = (this.s.leagueActive && this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000));
    const hideTxtL = (this.s.leagueHiddenUntil && this.s.age<this.s.leagueHiddenUntil) ? ` · In hiding until age ${this.s.leagueHiddenUntil.toFixed(1)}` : "";
    const leagueVisible = this.s.leagueActive && this.s.leagueMembers>=10;
    this.ui.status.league.innerHTML =
      (leagueVisible ? `<b>League:</b> ${this.s.leagueMembers} members · Hideouts:${this.s.leagueCaches}${hideTxtL} ${purgeAvail?'· Purge READY':''}`
                     : `<b>League:</b> (investigate at gala to unlock)`);

    // Buttons: initial story gating
    const deployed = (this.s.proven || this.s.deployments>0) && this.s.alive && !this.s.outlander;

    // Enable/disable core
    this.ui.btnDeploy.disabled = !!this.s.outlander || !this.s.alive;
    this.ui.btnRepro.disabled  = !this.s.alive;
    this.ui.btnWait.disabled   = !this.s.alive;
   this.ui.btnHusb.disabled = !this.s.alive;

    this.ui.btnReset.disabled  = false;

    // Outlanders: join only before deploying
    this.ui.btnOut.style.display    = (!this.s.proven && !this.s.outlander && this.s.alive) ? "" : "none";
    // Union: start only once, when outlander
    this.ui.btnUnion.style.display  = (this.s.outlander && this.s.alive && this.s.unionMembers===0) ? "" : "none";

    const unionOpsVisible = (this.s.outlander && this.s.alive && this.s.unionMembers>0);
    this.ui.btnExpand.style.display = unionOpsVisible ? "" : "none";
    this.ui.btnCache .style.display = unionOpsVisible ? "" : "none";
    this.ui.btnSabot .style.display = unionOpsVisible ? "" : "none";
    this.ui.btnRevolt.style.display = (unionOpsVisible && revoltAvail) ? "" : "none";

    // Deployed path — Gala button hides permanently after any outcome
    this.ui.btnDuel.style.display   = deployed ? "" : "none";
    this.ui.btnGala.style.display   = (deployed && !this.s.galaOutcome && this.s.alive) ? "" : "none";
    this.ui.btnGalaIgnore.style.display="none";
    this.ui.btnGalaInv.style.display="none";
    this.ui.btnJoinRat.style.display="none";
    this.ui.btnDecline.style.display="none";

    // Rats
    const ratVisible = deployed && this.s.joinedRatHunters;
    this.ui.btnSafari.style.display = ratVisible ? "" : "none";
    this.ui.btnBlood.style.display  = (ratVisible && this.s.ratSafariCount>=3) ? "" : "none";

    // League
    const leagueOps = deployed && this.s.leagueActive;
    this.ui.btnFormLeague.style.display   = (deployed && !this.s.leagueActive && this.s.galaOutcome==="investigate_you") ? "" : "none";
    this.ui.btnLeagueExpand.style.display = leagueOps ? "" : "none";
    this.ui.btnLeagueCache .style.display = leagueOps ? "" : "none";
    this.ui.btnHuntHunter  .style.display = leagueOps ? "" : "none";
    this.ui.btnLeaguePurge .style.display = (leagueOps && this.s.leagueMembers >= (this.p.leaguePurgeUnlockAt||1000)) ? "" : "none";
  },

  reset(){ this._initLife(); this._renderStatus(); this._newCycle(); }
}; // end Life

// Expose & boot Life
window.AzulianLifeSim = Life;
function bootLife(){ if(document.getElementById("azulian-life-sim")) Life.mount("azulian-life-sim"); }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bootLife); else bootLife();
// Population simulator
const Pop = {
  params:{ a0:0.22, ap:0.85, lambda:3, j:0.7, Y:2, pi:0.4, k:3, clanPrestige:0.0, Nf0:1e6, Nm:3e6, cycles:10 },

  // Evolutionary speed per cycle (Darwinian rate)
  evolutionSpeed(prev, curr) {
    // mean fitness proxy: fraction of proven females
    const z1 = (prev.P / ((prev.P + prev.R) || 1)) || 0;
    const z2 = (curr.P / ((curr.P + curr.R) || 1)) || 0;
    const dt = 1; // one cycle step
    return Math.log((z2 + 1e-9) / (z1 + 1e-9)) / dt; // per-cycle Darwinian rate
  },

  step(state,p){
    const a0 = +p.a0 ?? 0.22, 
          ap = +p.ap ?? 0.85, 
          λ = +p.lambda ?? 3, 
          j = +p.j ?? 0.7, 
          Y = +p.Y ?? 2, 
          π = +p.pi ?? 0.4, 
          k = Math.max(1, +p.k ?? 3),
          prestige = +p.clanPrestige ?? 0, 
          Nm = +p.Nm ?? 3e6;

    const apEff = ap * (1 + 0.2 * prestige);
    const newProven = (state.R || 0) * a0,
          provenNext = (state.P || 0) * apEff,
          shoreProven = (state.P || 0) * (1 - π);
    const birthsPerFemale = 2 * λ * j * Y,
          daughters = shoreProven * birthsPerFemale * 0.5,
          nextR = daughters;
    const Ne = shoreProven > 0
      ? (4 * (shoreProven * Nm) / (shoreProven + Nm)) * (1 - 1 / Math.max(1, k))
      : 0;
    return { R: nextR, P: newProven + provenNext, daughters, Ne };
  },

  run(){
    const p = this.params;
    let s = { R: +p.Nf0 || 0, P: 0 };
    const out = [];

    for (let t = 0; t < (+p.cycles || 0); t++) {
      const prev = { ...s };
      s = this.step(s, p);
      const evoSpeed = (t > 0) ? this.evolutionSpeed(prev, s) : 0;
      out.push({
        cycle: t + 1,
        rookies: s.R,
        proven: s.P,
        daughters: s.daughters,
        Ne: s.Ne,
        evoSpeed: evoSpeed
      });
    }
    return out;
  },

  renderTable(data){
    let h = `<table style="width:100%;border-collapse:collapse;text-align:center;">
      <tr>
        <th>Cycle</th><th>Rookies</th><th>Proven</th>
        <th>Daughters</th><th>Effective Pop (Ne)</th><th>Evolution Speed (vₜ)</th>
      </tr>`;
    const ex = v => (Number.isFinite(v) ? v.toExponential(2) : 0);
    for (const r of data) {
      const v = r.evoSpeed ? r.evoSpeed.toFixed(4) : "0.0000";
      h += `<tr>
        <td>${r.cycle}</td>
        <td>${ex(r.rookies)}</td>
        <td>${ex(r.proven)}</td>
        <td>${ex(r.daughters)}</td>
        <td>${ex(r.Ne)}</td>
        <td>${v}</td>
      </tr>`;
    }
    return h + "</table>";
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
    let h=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
    for(const s of sliders){
      const v=this.params[s.id];
      h+=`<label>${s.label}: <input type="range" id="${s.id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}"
            oninput="AzulianSim.update('${s.id}',this.value)"><span id="${s.id}-val">${v}</span></label>`;
    }
    return h+`</div><button onclick="AzulianSim.refresh()">Run Simulation</button>`;
  },

  update(id,val){ 
    this.params[id] = parseFloat(val); 
    const e = document.getElementById(`${id}-val`); 
    if(e) e.textContent = val; 
  },

refresh(){
  const c = document.getElementById("azulian-sim-output");
  if(!c) return;
  const data = this.run();
  c.innerHTML = this.renderTable(data) + `<canvas id="evoChart" width="800" height="250" style="margin-top:16px;width:100%;background:#0f1720;border-radius:6px;"></canvas>`;
  this.renderChart(data);
},

renderChart(data) {
  const canvas = document.getElementById("evoChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // ── Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ── Layout
  const left = 50, right = canvas.width - 60;
  const top = 20, bottom = canvas.height - 30;

  // ── Extract values
  const vVals = data.map(d => d.evoSpeed);
  const nVals = data.map(d => d.Ne);

  // ── Ranges
  const vMin = Math.min(...vVals), vMax = Math.max(...vVals);
  const vPad = 0.1 * (vMax - vMin || 1);
  const vLo = vMin - vPad, vHi = vMax + vPad;

  const nMin = Math.min(...nVals), nMax = Math.max(...nVals);
  const nLo = Math.log10(Math.max(1, nMin));
  const nHi = Math.log10(Math.max(1, nMax));

  // ── Helper functions
  const xAt = i => left + (i / (data.length - 1)) * (right - left);
  const yV = v => bottom - ((v - vLo) / (vHi - vLo)) * (bottom - top);
  const yN = n => bottom - ((Math.log10(Math.max(1, n)) - nLo) / (nHi - nLo)) * (bottom - top);

  // ── Axes
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  // ── Axis labels
  ctx.fillStyle = "#ccc";
  ctx.font = "12px system-ui";
  ctx.fillText("Evolution Speed (vₜ)", 8, 14);
  ctx.fillText("Cycle →", right - 50, bottom + 20);
  ctx.save();
  ctx.translate(canvas.width - 10, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffb36b";
  ctx.fillText("Effective Pop (Nₑ, log scale)", 0, 0);
  ctx.restore();

  // ── Zero line for vₜ
  const yZero = yV(0);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(left, yZero);
  ctx.lineTo(right, yZero);
  ctx.stroke();

  // ── Draw evolution speed line (cyan)
  ctx.strokeStyle = "#7ee7ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xAt(i);
    const y = yV(d.evoSpeed);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // ── Draw Ne line (orange)
  ctx.strokeStyle = "#ffb36b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = xAt(i);
    const y = yN(d.Ne);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // ── Store point coordinates for hover detection
  const points = data.map((d, i) => ({
    cycle: d.cycle,
    x: xAt(i),
    yV: yV(d.evoSpeed),
    yN: yN(d.Ne),
    v: d.evoSpeed,
    n: d.Ne
  }));

  // ── Draw data points
  points.forEach(pt => {
    // vₜ points
    ctx.fillStyle = "#b5d6ff";
    ctx.beginPath();
    ctx.arc(pt.x, pt.yV, 3, 0, Math.PI * 2);
    ctx.fill();
    // Nₑ points
    ctx.fillStyle = "#ffb36b";
    ctx.beginPath();
    ctx.arc(pt.x, pt.yN, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── Legends
  ctx.fillStyle = "#7ee7ff";
  ctx.fillText("vₜ", left + 10, top + 12);
  ctx.fillStyle = "#ffb36b";
  ctx.fillText("Nₑ", left + 40, top + 12);

  // ── Tooltip handler
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.pointerEvents = "none";
  tooltip.style.background = "rgba(20,30,40,0.9)";
  tooltip.style.border = "1px solid #7ee7ff";
  tooltip.style.borderRadius = "4px";
  tooltip.style.padding = "4px 8px";
  tooltip.style.color = "#e6eef8";
  tooltip.style.font = "12px system-ui";
  tooltip.style.display = "none";
  tooltip.style.zIndex = 100;
  canvas.parentElement.appendChild(tooltip);

  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let nearest = null, dist = 1e9;
    for (const pt of points) {
      const dv = Math.hypot(mx - pt.x, my - pt.yV);
      const dn = Math.hypot(mx - pt.x, my - pt.yN);
      const dmin = Math.min(dv, dn);
      if (dmin < dist) { dist = dmin; nearest = pt; }
    }

    if (nearest && dist < 15) {
      tooltip.style.left = (rect.left + nearest.x + 12) + "px";
      tooltip.style.top = (rect.top + my - 20) + "px";
      tooltip.style.display = "block";
      tooltip.innerHTML = `
        <b>Cycle ${nearest.cycle}</b><br>
        <span style="color:#7ee7ff">vₜ:</span> ${nearest.v.toFixed(4)}<br>
        <span style="color:#ffb36b">Nₑ:</span> ${nearest.n.toExponential(2)}
      `;
    } else {
      tooltip.style.display = "none";
    }
  };

  canvas.onmouseleave = () => tooltip.style.display = "none";
},

// ✅ now properly *inside* Pop object:
mount(containerId = "azulian-sim") {
  const root = document.getElementById(containerId);
  if (!root) {
    console.error("[AzulianSim] Missing container");
    return;
  }
  root.innerHTML = `
    <h3>Azulian Population Simulator</h3>
    ${this.renderControls()}
    <div id="azulian-sim-output" style="margin-top:8px;">
      ${this.renderTable(this.run())}
      <canvas id="evoChart" width="800" height="250"
        style="margin-top:16px;width:100%;background:#0f1720;border-radius:6px;"></canvas>
    </div>`;
  this.renderChart(this.run());
}
}; // ✅ close Pop object here

// Expose & boot Pop
window.AzulianSim = Pop;
function bootPop() {
  if (document.getElementById("azulian-sim"))
    Pop.mount("azulian-sim");
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", bootPop);
else bootPop();

// IIFE end
})();

