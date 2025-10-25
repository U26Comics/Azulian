/* Azulian Life-Cycle & Population Simulators — Bundled Build (Outlanders + Union)
   Carrd / GitHub compatible, self-contained, UTF-8.
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
    revolt:"🔥", outlander:"🏹"
  }
};
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
    unionConvertPass:0.90, unionConvertDeath:0.10,
    unionExpandDeath:0.10, unionCacheDeath:0.10,
    unionStealthFail:0.10, unionCacheSave:10,
    unionHideYears:4,
    revoltUnlockAt:1000, revoltBaseSuccess:0.10,
    revoltStackBonus:0.10
  },

  s:{}, cycleCount:0, ui:{}, currentCycleBody:null,
  global:{outlanderAdvantageUnlocked:false,successfulRevolts:0},

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
      union:el("p")
    };
    left.append(
      this.ui.status.status,this.ui.status.age,this.ui.status.tours,
      this.ui.status.husbands,this.ui.status.prestige,
      this.ui.status.children,this.ui.status.gis,this.ui.status.union
    );

    // Controls
    const controls=el("div",{style:{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"6px"}});
    this.ui.btnRepro = el("button",{text:"Reproduce",onclick:()=>this.reproduce()});
    this.ui.btnWait  = el("button",{text:"Wait 6mo",onclick:()=>this.wait()});
    this.ui.btnDeploy= el("button",{text:"Deploy 4y",onclick:()=>this.deploy()});
    this.ui.btnHusb  = el("button",{text:"Add Husband",onclick:()=>this.addHusband()});
    this.ui.btnReset = el("button",{text:"Reset (New Cycle)",onclick:()=>this.reset()});
    this.ui.btnOut   = el("button",{text:"Join Outlanders",onclick:()=>this.joinOutlanders()});
    this.ui.btnUnion = el("button",{text:"Start Labor Union",onclick:()=>this.startUnion()});
    this.ui.btnExpand= el("button",{text:"Expand Union",onclick:()=>this.expandUnion()});
    this.ui.btnCache = el("button",{text:"Build Supply Cache",onclick:()=>this.buildCache()});
    this.ui.btnSabot = el("button",{text:"Sabotage Yebra Property",onclick:()=>this.sabotage()});
    this.ui.btnRevolt= el("button",{text:"Start Workers' Revolt",onclick:()=>this.revolt()});
    controls.append(
      this.ui.btnRepro,this.ui.btnWait,this.ui.btnDeploy,this.ui.btnHusb,
      this.ui.btnOut,this.ui.btnUnion,this.ui.btnExpand,
      this.ui.btnCache,this.ui.btnSabot,this.ui.btnRevolt,this.ui.btnReset
    );
    left.appendChild(controls);

    const right=el("div");
    const logBox=el("div",{id:"life-log",style:{maxHeight:"320px",overflow:"auto",border:"1px solid #444",padding:"8px",borderRadius:"8px",background:"#111"}});
    right.appendChild(logBox);
    grid.append(left,right);
    root.appendChild(grid);
    root.appendChild(el("p",{style:{fontSize:"12px",opacity:"0.8"},text:
      "Deaths: ⏳ old age (80+), ☠️ battle, ⚙️ accident, 🥀 starvation, 💔 poisoning, 🩸 rival House. "+
      "Outlanders gain death-save advantage ashore and unlock labor-union play; deploying while Outlander = summary execution."
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
      (["prestige","union","revolt","cache","sabotage"].includes(type)?C.colors.success:
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
      outlander:false, unionMembers:0, unionCaches:0,
      unionHiddenUntil:null, lastStealthTickAge:16
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
  _advantage(p){return Math.max(0,p*(1-(this.p.outlanderAdvantage||0)));},
  _checkHusbands(){
    const alive=[];
    for(const hAge of(this.s.husbandAges||[])){
      if((this.s.age-hAge)>104)this._addLog("husbandDeath","Husband died of old age.");
      else alive.push(hAge);
    }
    this.s.husbandAges=alive;
    this.s.husbands=alive.length;
    if(this.s.husbands>=2){
      const jealousP=0.005*(this.s.husbands-1);
      if(Math.random()<jealousP){
        this.s.husbands-=1;this.s.husbandAges.pop();
        this._addLog("jealousyKill","One husband killed another out of jealousy.");
      }
    }
  },
  // ========================================================================
  // MORTALITY & UNION STEALTH
  // ========================================================================
  _applyCivilianMortality(lastAction=null){
    if(!this.s.alive) return;

    // Husbands ageing + jealousy
    this._checkHusbands();

    // base half-year mortality
    let p=(this.p.civilianAnnualMortality??0.15)*0.5;

    // senescence beyond life cap
    const cap=this._lifeCap();
    if(this.s.age>cap){
      const yrs=this.s.age-cap;
      p=Math.min(0.99,p+yrs*(this.p.senescentAnnual??0.05)*0.5);
    }

    // global advantage from prior successful revolts OR personal Outlander status
    if(this.global.outlanderAdvantageUnlocked || this.s.outlander){
      p=this._advantage(p);
    }

    // survive this half-year? (if yes, still do stealth tick)
    if(!this._roll(p)){ this._unionStealthTick(); return; }

    // retaliation if attempting husband while unproven
    if(lastAction==="husbandAttempt" && !this.s.proven && Math.random()<0.10){
      this._die("deathRival","Killed by prospective husband's House"); return;
    }

    // weighted death causes
    const civilianExtra = [
      ["deathRival","Killed by rival wicker gang",0.12],
      ["deathRival","Killed by rat hunters",0.12],
      ["deathRival","Killed in worker uprising",0.10],
      ["deathAccident","Died of infection",0.10],
      ["deathPoison","Executed by Yebra for illegal farming",0.10],
      ["deathPoison","Executed by Yebra for sabotage",0.10],
      ["deathPoison","Executed by Yebra for terroristic activity",0.10],
      ["deathPoison","Executed by Yebra for involvement in organized crime",0.10]
    ];
    const veteranExtra = [
      ["deathRival","Killed in a duel",0.12],
      ["deathRival","Killed by outlanders while rat hunting",0.10],
      ["deathPoison","Killed by angry prostitute while slumming",0.10],
      ["deathAccident","Overdosed",0.10],
      ["deathPoison","Executed for Posadist-terror cell activities",0.10],
      ["deathPoison","Executed for space piracy",0.10],
      ["deathPoison","Executed for violating Yebra patent law",0.10],
      ["deathRival","Killed in a drunken brawl",0.10]
    ];
    const base = [
      ["deathAccident","Died in workplace accident",0.15],
      ["deathStarve","Starved to death",0.15],
      // ✅ fixed stray parenthesis here:
      ...(this.s.husbands>0 ? [["deathPoison","Poisoned by jealous husband",0.10]] : []),
      ["deathRival","Killed by rival House",0.10]
    ];

    let pool=[...base];
    if(!this.s.proven && this.s.deployments===0) pool.push(...civilianExtra);
    else pool.push(...veteranExtra);
    if(this.s.age>=80) pool.push(["deathOld","Died of old age",0.25]);

    const totalW=pool.reduce((a,[,,w])=>a+w,0);
    let r=Math.random()*totalW;
    for(const [type,msg,w] of pool){
      r-=w; if(r<=0){ this._die(type,msg); return; }
    }
    this._die("deathAccident","Died in unexplained circumstances");
  },

  // Union stealth tick every 6 months (runs only if Outlander with active union)
  _unionStealthTick(){
    if(!this.s.outlander || this.s.unionMembers<=0) return;

    // run at most once per 0.5 years
    if(this.s.age - (this.s.lastStealthTickAge||0) < 0.5) return;
    this.s.lastStealthTickAge=this.s.age;

    // stealth fail triggers purge & hiding
    if(Math.random() < (this.p.unionStealthFail||0.10)){
      const caches=this.s.unionCaches|0;
      const survivors=caches*(this.p.unionCacheSave||10);
      const before=this.s.unionMembers;
      const after=Math.min(before,survivors);
      this.s.unionMembers=after;
      this._addLog("union",`Union purge by Yebra. Members ${before} → ${after}.`);

      // go to ground
      this.s.unionHiddenUntil=(this.s.unionHiddenUntil||this.s.age)+(this.p.unionHideYears||4);
      this._addLog("union",`Union in hiding for ${(this.p.unionHideYears||4)} years.`);
    }
  },

  // ========================================================================
  // ACTIONS
  // ========================================================================
  addHusband(){
    if(!this.s.alive) return;

    // courting is risky if unproven
    if(!this.s.proven){
      const rejected=Math.random()<0.95;
      this.s.age+=0.5;
      if(rejected){
        this._addLog("wait","💔 Rejected by prospective husband for being poor.");
        this._applyCivilianMortality("husbandAttempt");
        this._renderStatus();
        return;
      }
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

    this.s.age+=0.5;
    this._addLog("reproduce",`Reproduced: litter=${litter}, adults=${survive}, F=${daughters}, ProvenF+${proved}. Age→${this.s.age.toFixed(1)}`);
    this._applyCivilianMortality();
    this._renderStatus();
  },

  wait(){
    if(!this.s.alive) return;
    this.s.age+=0.5;

    if(this.s.unionHiddenUntil && this.s.age>=this.s.unionHiddenUntil){
      this.s.unionHiddenUntil=null;
      this._addLog("union","Union resurfaced from hiding.");
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
      this._addLog("deploy",`Deployment ${this.s.deployments} survived. Mortality ${(m*100).toFixed(1)}%. Age→${this.s.age}`);
      this._renderStatus();
    }else{
      if(Math.random()<0.33) this._die("deathBattle","Thrown from airlock after failed QC");
      else this._die("deathBattle","Died in battle");
    }
  },

  // ========================================================================
  // OUTLANDERS & UNION
  // ========================================================================
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

    // risk to leader
    if(Math.random()<(this.p.unionExpandDeath||0.10)){
      this._die("deathPoison","Executed by Yebra for terroristic activity while recruiting");
      return;
    }

    // chain recruitment process
    let gained=1; // manual recruit succeeds
    const pass=(this.p.unionConvertPass||0.90);
    const death=(this.p.unionConvertDeath||0.10);
    let frontier=1;

    while(frontier>0){
      let next=0;
      for(let i=0;i<frontier;i++){
        const r=Math.random();
        if(r<death){ /* recruit executed, no member added */ }
        else if(r<death+pass){ gained++; next++; }
        else { /* neither convert nor die */ }
      }
      frontier=next;
      if(gained>5000) break; // safety cap
    }

    const before=this.s.unionMembers;
    this.s.unionMembers=before+gained;
    this._addLog("union",`Expanded union: +${gained} members (total ${this.s.unionMembers}).`);

    if(this.s.unionMembers >= (this.p.revoltUnlockAt||1000))
      this._addLog("revolt","Workers' Revolt is now available.");

    this._renderStatus();
  },

  buildCache(){
    if(!this.s.alive || !this.s.outlander || this.s.unionMembers<=0) return;
    if(this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil){
      this._addLog("union","Union is in hiding; cannot build caches."); return;
    }
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
    // base success 30%, +1% per 10 members
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

    const p=(this.p.revoltBaseSuccess||0.10)+(this.global.successfulRevolts||0)*(this.p.revoltStackBonus||0.10);
    if(Math.random()<p){
      this.global.successfulRevolts=(this.global.successfulRevolts||0)+1;
      this.global.outlanderAdvantageUnlocked=true;
      this._addLog("revolt",`Workers' Revolt succeeded! Future cycles gain Outlander death-save advantage (stacked successes: ${this.global.successfulRevolts}).`);
    }else{
      this._addLog("revolt",`Workers' Revolt failed (p=${(p*100).toFixed(0)}%). Heavy reprisals follow.`);
      const caches=this.s.unionCaches|0;
      const survivors=caches*(this.p.unionCacheSave||10);
      const before=this.s.unionMembers;
      const after=Math.min(before,survivors);
      this.s.unionMembers=after;
      this.s.unionHiddenUntil=(this.s.unionHiddenUntil||this.s.age)+(this.p.unionHideYears||4);
      this._addLog("union",`Reprisals: union ${before}→${after}, went to ground for ${(this.p.unionHideYears||4)} years.`);
    }
    this._renderStatus();
  },

  // ========================================================================
  // DEATH + HUD
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

    this.ui.status.status.innerHTML   = `<b>Status:</b> ${this.s.alive?'Alive':'Dead'} ${this.s.outlander?'· Outlander':''}`;
    this.ui.status.age.innerHTML      = `<b>Age:</b> ${this.s.age.toFixed(1)} / Cap ${cap.toFixed(1)}`;
    this.ui.status.tours.innerHTML    = `<b>Deployments:</b> ${this.s.deployments|0}`;
    this.ui.status.husbands.innerHTML = `<b>Husbands:</b> ${this.s.husbands|0}`;
    this.ui.status.prestige.innerHTML = `<b>Prestige:</b> ${Math.round((+this.s.prestige||0)*100)}% · Proven daughters: ${dp}/${this.s.daughtersTotal|0}`;
    this.ui.status.children.innerHTML = `<b>Children:</b> ${total} total; ${adults} adults; ${df} daughters; ${dp} proven daughters`;
    this.ui.status.gis.innerHTML      = `<b>GIS:</b> ${gis.score}/${gis.max} (${gis.norm}%)`;

    const revoltAvail = (this.s.outlander && this.s.unionMembers >= (this.p.revoltUnlockAt||1000));
    const hideTxt = (this.s.unionHiddenUntil && this.s.age<this.s.unionHiddenUntil)
      ? ` · In hiding until age ${this.s.unionHiddenUntil.toFixed(1)}`
      : "";
    this.ui.status.union.innerHTML =
      (this.s.outlander
        ? `<b>Union:</b> ${this.s.unionMembers} members · Caches:${this.s.unionCaches}${hideTxt} ${revoltAvail?'· Revolt READY':''}`
        : `<b>Union:</b> (join Outlanders to unlock)`);

    // button visibility
    this.ui.btnOut.style.display    = (!this.s.proven && !this.s.outlander && this.s.alive) ? "" : "none";
    this.ui.btnUnion.style.display  = (this.s.outlander && this.s.alive && this.s.unionMembers===0) ? "" : "none";

    const unionOpsVisible = (this.s.outlander && this.s.alive && this.s.unionMembers>0);
    this.ui.btnExpand.style.display = unionOpsVisible ? "" : "none";
    this.ui.btnCache .style.display = unionOpsVisible ? "" : "none";
    this.ui.btnSabot .style.display = unionOpsVisible ? "" : "none";
    this.ui.btnRevolt.style.display = (unionOpsVisible && this.s.unionMembers >= (this.p.revoltUnlockAt||1000)) ? "" : "none";

    // disable deploy when Outlander
    this.ui.btnDeploy.disabled = !!this.s.outlander || !this.s.alive;

    // general
    this.ui.btnRepro.disabled = !this.s.alive;
    this.ui.btnWait .disabled = !this.s.alive;
    this.ui.btnHusb .disabled = !this.s.alive;
    this.ui.btnReset.disabled = false;
  },

  // ========================================================================
  // RESET
  // ========================================================================
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
// POPULATION SIMULATOR
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

    // safe Ne (no div-by-zero; returns 0 if shoreProven = 0)
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
