/* ────────────────────────────────────────────────────────────────
 * Azulian Evolution Simulator V1 — Red Queen Dynamics
 * Wide CRT Strip | Auto-scrolling | Bio-Horror Theme
 * Mount: window.RedQueenV1.mount("red-queen-v1")
 * ──────────────────────────────────────────────────────────────── */
(function(){

// ────────────────────────────────────────────────────────────────
// Core math helpers
// ────────────────────────────────────────────────────────────────
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const lerp=(a,b,t)=>a+(b-a)*t;

// ────────────────────────────────────────────────────────────────
// Simulation class
// ────────────────────────────────────────────────────────────────
class EvolutionSim {
  constructor(){
    this.params={
      K:1e9, r0:0.3, gamma:0.2,
      S0:1, alpha:3, beta:2,
      mu:0.05, nu:0.02, eta:0.5,
      c:0.5, dt:0.05
    };
    this.state={N:1e6,E:0.5,S:1,t:0,paused:false};
    this.history=[];
  }

  step(){
    const p=this.params, s=this.state;
    if(s.paused) return;

    // Equations
    s.S = p.S0*(1+p.alpha*Math.pow(s.N/p.K,p.beta));
    const r = p.r0*Math.exp(-p.gamma*s.S);
    const Ereq = p.eta*s.S;
    s.E += p.dt*(p.mu*s.S - p.nu*s.E);
    const deficit = s.E<Ereq ? 1:0;
    const dN = (r*s.N*(1 - s.N/p.K) - p.c*s.N*deficit)*p.dt;
    s.N += dN;
    s.N = Math.max(0,s.N);
    s.t += p.dt;
    this.history.push({t:s.t,N:s.N,E:s.E,S:s.S});
    if(this.history.length>900) this.history.shift();
  }
}

// ────────────────────────────────────────────────────────────────
// Renderer / UI
// ────────────────────────────────────────────────────────────────
function ensureStyles(root){
  if(root.__az_evo_styles) return;
  const css=document.createElement("style");
  css.textContent=`
  .evo-wrap{
    font-family: ui-monospace, Menlo, Consolas, monospace;
    background: linear-gradient(180deg,#0a0a0a 0%,#1a1a1a 100%);
    border:1px solid #4a2b2b;
    box-shadow:0 0 30px rgba(200,40,40,0.15) inset;
    color:#eae6df; padding:12px; border-radius:8px;
    max-width:900px; margin:auto;
    animation: crtFlicker 4s infinite linear;
  }
  h3{color:#c72e2e;margin:0 0 6px 0;text-transform:uppercase;
     font-size:14px;letter-spacing:0.05em;}
  .hud-line span{margin-right:12px;}
  .btn{background:#111;border:1px solid #a13a3a;
       color:#eae6df;padding:4px 10px;font-size:12px;
       cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;}
  .btn:hover{color:#d67b00;border-color:#d67b00;}
  .slider-row{margin:4px 0;}
  .slider-row label{display:inline-block;width:80px;}
  canvas{background:#000;border-radius:4px;width:100%;height:260px;}
  @keyframes crtFlicker{0%,19%,21%,23%,25%,54%,56%,100%{opacity:1;}
                         20%,24%,55%{opacity:0.98;}}
  `;
  root.appendChild(css);
  root.__az_evo_styles=true;
}

function renderHUD(sim,ctx){
  const s=sim.state;
  const el=ctx.hud;
  el.innerHTML=`
    <div class="hud-line">
      <span><b>t:</b> ${s.t.toFixed(1)}</span>
      <span><b>N:</b> ${(s.N/1e6).toFixed(2)}M</span>
      <span><b>E:</b> ${s.E.toFixed(3)}</span>
      <span><b>S:</b> ${s.S.toFixed(3)}</span>
    </div>
    <button class="btn" id="evo-toggle">${s.paused?"Resume":"Pause"}</button>
  `;
  el.querySelector("#evo-toggle").onclick=()=>{s.paused=!s.paused;};
}

function renderSliders(sim,ctx){
  const p=sim.params, el=ctx.sliders;
  const make=(key,min,max,step)=>`
    <div class="slider-row">
      <label>${key}</label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${p[key]}" id="${key}">
      <span id="${key}-val">${p[key]}</span>
    </div>`;
  el.innerHTML=[
    make("K",1e8,1e10,1e8),
    make("r0",0.05,1,0.01),
    make("gamma",0.05,1,0.01),
    make("alpha",0,6,0.1),
    make("beta",0.5,4,0.1),
    make("mu",0.01,0.2,0.01),
    make("nu",0.005,0.1,0.005),
    make("eta",0.1,1,0.05),
    make("c",0.1,1,0.05)
  ].join("");
  el.querySelectorAll("input").forEach(inp=>{
    inp.oninput=()=>{
      const v=parseFloat(inp.value);
      p[inp.id]=v;
      el.querySelector(`#${inp.id}-val`).textContent=v;
    };
  });
}

function renderChart(sim,ctx){
  const canvas=ctx.canvas;
  const c=canvas.getContext("2d");
  const w=canvas.width, h=canvas.height;
  // Scroll left by 1 px
  const img=c.getImageData(1,0,w-1,h);
  c.putImageData(img,0,0);
  c.fillStyle="black";
  c.fillRect(w-1,0,1,h);

  const hist=sim.history;
  if(hist.length<2)return;
  const last=hist[hist.length-1];
  const prev=hist[hist.length-2];
  const x=w-1;
  const mapY=(val,max)=>h-(val/max)*h;
  const maxN=sim.params.K*0.1; // scale relative
  const maxE=5, maxS=10;
  const yN=mapY(clamp(last.N,maxN),maxN);
  const yE=mapY(clamp(last.E,maxE),maxE);
  const yS=mapY(clamp(last.S,maxS),maxS);
  const yN0=mapY(clamp(prev.N,maxN),maxN);
  const yE0=mapY(clamp(prev.E,maxE),maxE);
  const yS0=mapY(clamp(prev.S,maxS),maxS);

  c.lineWidth=1.2;
  c.globalAlpha=0.9;

  // Population - cyan
  c.strokeStyle="#7ee7ff";
  c.beginPath(); c.moveTo(w-2,yN0); c.lineTo(x,yN); c.stroke();

  // Evolution - orange
  c.strokeStyle="#ffb36b";
  c.beginPath(); c.moveTo(w-2,yE0); c.lineTo(x,yE); c.stroke();

  // Selection - red
  c.strokeStyle="#ff3b3b";
  c.beginPath(); c.moveTo(w-2,yS0); c.lineTo(x,yS); c.stroke();
}

// ────────────────────────────────────────────────────────────────
// Mount logic
// ────────────────────────────────────────────────────────────────
const SimUI={
  mount(containerId){
    const root=document.getElementById(containerId);
    if(!root){console.error("[AzulianEvolutionSim] Missing container");return;}
    ensureStyles(document.body);
    root.innerHTML=`
      <div class="evo-wrap">
        <h3>Evolution Dynamics (Red Queen)</h3>
        <canvas width="900" height="260"></canvas>
        <div id="evo-hud"></div>
        <div id="evo-sliders"></div>
      </div>`;
    const sim=new EvolutionSim();
    const ctx={
      canvas:root.querySelector("canvas"),
      hud:root.querySelector("#evo-hud"),
      sliders:root.querySelector("#evo-sliders")
    };
    renderSliders(sim,ctx);

    // Animation loop
    function loop(){
      sim.step();
      renderChart(sim,ctx);
      renderHUD(sim,ctx);
      requestAnimationFrame(loop);
    }
    loop();
  }
};

// Expose globally
window.AzulianEvolutionSim=SimUI;

function bootEvo(){
  if(document.getElementById("azulian-evolution-sim"))
    SimUI.mount("azulian-evolution-sim");
}
if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",bootEvo);
else bootEvo();

})(); 
