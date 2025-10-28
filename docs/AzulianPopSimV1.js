// Population simulator
(function(){
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
      // ── Inject matching CRT theme for consistency ───────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #${containerId} {
      color: #eae6df;
      font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: 12px;
    }
    #${containerId} canvas {
      background: #0f1720;
      border: 1px solid #4a2b2b;
      border-radius: 8px;
    }
    #${containerId} table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-size: 12px;
    }
    #${containerId} th, #${containerId} td {
      padding: 4px 6px;
      border-bottom: 1px solid rgba(200,40,40,0.15);
    }
    #${containerId} th {
      color: #d67b00;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }`;
  document.head.appendChild(style);

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
