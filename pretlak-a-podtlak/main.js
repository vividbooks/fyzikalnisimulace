/* Přetlak a podtlak – válec s pístem a částicemi vzduchu */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("view");
  const ctx = canvas.getContext("2d");
  const hintEl = $("hintEl");

  /* ---------- Geometrie (logické souřadnice 1200 × 800) ---------- */

  const W = 1200;
  const H = 800;
  const BORE = { x0: 262, x1: 860, y0: 282, y1: 518 };   // vnitřek válce
  const CYL = { x0: 250, x1: 860, y0: 270, y1: 530 };    // vnější obrys válce
  const PISTON_W = 28;
  const PX_MIN = 320;
  const PX_MAX = 820;
  const PX0 = 600;
  const ROD = { len: 262, half: 10 };
  const HANDLE = { w: 24, half: 70 };
  const VALVE = { y0: 340, y1: 460, left: 212, diskX: 224, diskW: 8 }; // trubka s ventilem vlevo (ve dně válce)
  const GAUGE = { x: 326, y: 160, r: 68 };
  const GAUGE_MAX = 500; // rozsah manometru (kPa)                                // manometr nahoře
  const R = 4.5;              // poloměr částice
  const SPEED = 260;        // střední rychlost částic (px/s)
  const P0 = 100;           // atmosférický tlak (kPa)
  const AREA_CM2 = 20;      // plocha pístu
  const N_IN0 = 70;         // částic uvnitř na začátku
  const PISTON_MAX_V = 420; // nejvyšší rychlost pístu (px/s)

  const innerVolume = (px) => (px - BORE.x0) * (BORE.y1 - BORE.y0) + (BORE.x0 - (VALVE.diskX + VALVE.diskW)) * (VALVE.y1 - VALVE.y0);
  const N0_DENSITY = N_IN0 / innerVolume(PX0);

  /* ---------- Stav ---------- */

  const state = {
    px: PX0,
    pxTarget: PX0,
    vp: 0,
    vFree: 0,
    nSmooth: N_IN0,
    closedAt: -10,
    valveOpen: false,
    particles: [],
    hits: [],     // { t, side: "in"|"out", x, y }
    pShown: P0,
    time: 0,
    hitsSince: 0,
    drag: null,
    interacted: false,
  };

  /* ---------- Pevné překážky ---------- */

  function solids() {
    const px = state.px;
    const list = [
      { x0: CYL.x0, x1: CYL.x1, y0: CYL.y0, y1: BORE.y0 },                    // horní stěna
      { x0: CYL.x0, x1: CYL.x1, y0: BORE.y1, y1: CYL.y1 },                    // dolní stěna
      { x0: CYL.x0, x1: BORE.x0, y0: CYL.y0, y1: VALVE.y0 },                  // dno nad výpustí
      { x0: CYL.x0, x1: BORE.x0, y0: VALVE.y1, y1: CYL.y1 },                  // dno pod výpustí
      { x0: VALVE.left, x1: CYL.x0, y0: VALVE.y0 - 12, y1: VALVE.y0 },        // trubka nahoře
      { x0: VALVE.left, x1: CYL.x0, y0: VALVE.y1, y1: VALVE.y1 + 12 },        // trubka dole
      { x0: GAUGE.x - 6, x1: GAUGE.x + 6, y0: GAUGE.y + GAUGE.r - 6, y1: CYL.y0 }, // trubička manometru
      { x0: px, x1: px + PISTON_W, y0: BORE.y0, y1: BORE.y1, piston: true },  // píst
      { x0: px + PISTON_W, x1: px + PISTON_W + ROD.len, y0: 400 - ROD.half, y1: 400 + ROD.half }, // pístnice
      { x0: px + PISTON_W + ROD.len, x1: px + PISTON_W + ROD.len + HANDLE.w, y0: 400 - HANDLE.half, y1: 400 + HANDLE.half }, // rukojeť
    ];
    if (!state.valveOpen) list.push({ x0: VALVE.diskX, x1: VALVE.diskX + VALVE.diskW, y0: VALVE.y0, y1: VALVE.y1 });
    return list;
  }

  function inSolid(x, y, list) {
    for (const s of list) if (x > s.x0 - R && x < s.x1 + R && y > s.y0 - R && y < s.y1 + R) return true;
    const dx = x - GAUGE.x;
    const dy = y - GAUGE.y;
    return dx * dx + dy * dy < (GAUGE.r + R) ** 2;
  }

  const isInside = (x, y, px) =>
    (x > BORE.x0 && x < px && y > BORE.y0 && y < BORE.y1) ||
    (x > VALVE.diskX + VALVE.diskW && x <= BORE.x0 && y > VALVE.y0 && y < VALVE.y1);

  /* ---------- Částice ---------- */

  function newParticle(x, y) {
    const a = Math.random() * Math.PI * 2;
    const s = SPEED * (0.7 + Math.random() * 0.6);
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, s, inside: isInside(x, y, state.px) };
  }

  function initParticles() {
    state.particles = [];
    const list = solids();
    // vnitřek
    let guard = 0;
    while (state.particles.length < N_IN0 && guard++ < 20000) {
      const x = BORE.x0 + R + Math.random() * (state.px - BORE.x0 - 2 * R);
      const y = BORE.y0 + R + Math.random() * (BORE.y1 - BORE.y0 - 2 * R);
      if (!inSolid(x, y, list)) state.particles.push(newParticle(x, y));
    }
    // venku – stejná hustota jako uvnitř
    let free = 0;
    let total = 0;
    for (let x = 4; x < W; x += 8) {
      for (let y = 4; y < H; y += 8) {
        total += 1;
        if (!inSolid(x, y, list) && !isInside(x, y, state.px)) free += 1;
      }
    }
    const nOut = Math.round(N0_DENSITY * W * H * (free / total));
    let placed = 0;
    guard = 0;
    while (placed < nOut && guard++ < 200000) {
      const x = R + Math.random() * (W - 2 * R);
      const y = R + Math.random() * (H - 2 * R);
      if (inSolid(x, y, list) || isInside(x, y, state.px)) continue;
      state.particles.push(newParticle(x, y));
      placed += 1;
    }
  }

  // odraz od obdélníku; u pístu se započítává náraz a předává se jeho rychlost
  function collideRect(p, s, prevX, prevPistonX) {
    if (!(p.x > s.x0 - R && p.x < s.x1 + R && p.y > s.y0 - R && p.y < s.y1 + R)) return;
    if (s.piston) {
      // strana se určí podle toho, kde částice byla – nikdy neprojde pístem
      const leftSide = prevX < prevPistonX + PISTON_W / 2;
      if (leftSide) {
        p.x = s.x0 - R;
        p.vx = 2 * state.vp - p.vx;
        if (p.vx > state.vp - 30) p.vx = state.vp - 30 - Math.random() * 40;
      } else {
        p.x = s.x1 + R;
        p.vx = 2 * state.vp - p.vx;
        if (p.vx < state.vp + 30) p.vx = state.vp + 30 + Math.random() * 40;
      }
      // rychlá částice (odražená pohybujícím se pístem) se postupně zpomalí, pomalejší se hned vrátí na svou rychlost
      if (Math.hypot(p.vx, p.vy) < p.s) renorm(p);
      state.hits.push({ t: state.time, side: leftSide ? "in" : "out", x: leftSide ? s.x0 : s.x1, y: p.y });
      return;
    }
    const dl = p.x - (s.x0 - R);
    const dr = s.x1 + R - p.x;
    const dt = p.y - (s.y0 - R);
    const db = s.y1 + R - p.y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) { p.x = s.x0 - R; p.vx = -Math.abs(p.vx); }
    else if (m === dr) { p.x = s.x1 + R; p.vx = Math.abs(p.vx); }
    else if (m === dt) { p.y = s.y0 - R; p.vy = -Math.abs(p.vy); }
    else { p.y = s.y1 + R; p.vy = Math.abs(p.vy); }
  }

  function renorm(p) {
    const v = Math.hypot(p.vx, p.vy) || 1;
    // teplota se drží stálá: velikost rychlosti se vrátí na původní hodnotu
    p.vx *= p.s / v;
    p.vy *= p.s / v;
  }

  function step(dt, prevPistonX) {
    const list = solids();
    for (const p of state.particles) {
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > p.s * 1.01) {
        const k = 1 - Math.min(1, 1.5 * dt) * (1 - p.s / sp);
        p.vx *= k;
        p.vy *= k;
      }
      const prevX = p.x;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < R) { p.x = R; p.vx = Math.abs(p.vx); }
      if (p.x > W - R) { p.x = W - R; p.vx = -Math.abs(p.vx); }
      if (p.y < R) { p.y = R; p.vy = Math.abs(p.vy); }
      if (p.y > H - R) { p.y = H - R; p.vy = -Math.abs(p.vy); }
      for (const s of list) collideRect(p, s, prevX, prevPistonX);
      const dx = p.x - GAUGE.x;
      const dy = p.y - GAUGE.y;
      const d = Math.hypot(dx, dy);
      if (d < GAUGE.r + R) {
        const nx = dx / (d || 1);
        const ny = dy / (d || 1);
        p.x = GAUGE.x + nx * (GAUGE.r + R);
        p.y = GAUGE.y + ny * (GAUGE.r + R);
        const vn = p.vx * nx + p.vy * ny;
        if (vn < 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
      }
    }
  }

  /* ---------- Proudění ventilem ---------- */

  // Při otevřeném ventilu proudí vzduch z místa s vyšším tlakem do místa s nižším:
  // částice u ventilu na straně vyššího tlaku se natáčejí směrem k otvoru.
  function steerThroughValve(dt) {
    // řídí se průměrným tlakem, aby proudění nereagovalo na náhodné výkyvy
    const dp = (P0 * state.nSmooth) / (N0_DENSITY * innerVolume(state.px)) - P0;
    if (Math.abs(dp) < Math.max(5, 1.2 * kPaPerParticle())) return;
    const tx = VALVE.diskX + VALVE.diskW / 2;
    const ty = (VALVE.y0 + VALVE.y1) / 2;
    // podíl natočení za snímek (slábne s vyrovnáváním); nasávání zvenku je silnější, protože venku je vzduch řidší u otvoru
    const strength = dp > 0 ? Math.min(1, dp / 100) * 6 * dt : Math.min(1, -dp / 50) * 6 * dt;
    const reach = dp > 0 ? 260 : 380;
    for (const p of state.particles) {
      const inside = isInside(p.x, p.y, state.px);
      if (dp > 0 ? !inside : inside) continue;
      if (dp < 0 && p.x > CYL.x0) continue; // zvenku se nasává jen z prostoru před výpustí
      // cíl: projít otvorem na druhou stranu
      const gx = dp > 0 ? tx - 60 : BORE.x0 + 40;
      const dx = gx - p.x;
      const dy = ty - p.y + (Math.random() - 0.5) * 60;
      const d = Math.hypot(tx - p.x, ty - p.y);
      if (d > reach) continue;
      const len = Math.hypot(dx, dy) || 1;
      const sp = Math.hypot(p.vx, p.vy) || p.s;
      const f = strength * (1 - d / reach);
      const nx = (p.vx / sp) * (1 - f) + (dx / len) * f;
      const ny = (p.vy / sp) * (1 - f) + (dy / len) * f;
      const nl = Math.hypot(nx, ny) || 1;
      p.vx = (nx / nl) * sp;
      p.vy = (ny / nl) * sp;
    }
  }

  /* ---------- Tlak ---------- */

  function countInside() {
    let n = 0;
    for (const p of state.particles) if (isInside(p.x, p.y, state.px)) n += 1;
    return n;
  }

  // poloha pístu, při které je tlak uvnitř stejný jako venku (pro aktuální počet částic uvnitř)
  function equilibriumX() {
    const vNeeded = countInside() / N0_DENSITY;
    const pipe = innerVolume(BORE.x0); // objem trubky výpusti
    return BORE.x0 + (vNeeded - pipe) / (BORE.y1 - BORE.y0);
  }

  // o kolik kPa se změní tlak, když přibude/ubude jedna částice uvnitř
  const kPaPerParticle = () => P0 / (N0_DENSITY * innerVolume(state.px));

  function pressureNow() {
    return (P0 * countInside()) / (N0_DENSITY * innerVolume(state.px));
  }

  /* ---------- Kreslení ---------- */

  let view = { k: 1, ox: 0, oy: 0 };

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const k = Math.min(cw / W, ch / H);
    view = { k, ox: (cw - W * k) / 2, oy: (ch - H * k) / 2, dpr };
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function arrow(x0, y0, x1, color) {
    const dir = Math.sign(x1 - x0) || 1;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.moveTo(x1 - dir * 22, y0 - 16);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1 - dir * 22, y0 + 16);
    ctx.stroke();
    ctx.restore();
  }

  function drawGauge(p) {
    const { x, y, r } = GAUGE;
    // trubička
    ctx.fillStyle = "#64748b";
    ctx.fillRect(x - 6, y + r - 6, 12, CYL.y0 - (y + r - 6));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#475569";
    ctx.stroke();
    const a0 = (Math.PI * 3) / 4;
    const sweep = (Math.PI * 3) / 2;
    const ang = (v) => a0 + sweep * Math.min(1, Math.max(0, v / GAUGE_MAX));
    // atmosférický tlak
    ctx.beginPath();
    ctx.arc(x, y, r - 14, ang(95), ang(105));
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "#334155";
    ctx.fillStyle = "#334155";
    ctx.font = "600 13px 'Fenomen Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let v = 0; v <= GAUGE_MAX; v += 50) {
      const a = ang(v);
      const big = v % 100 === 0;
      ctx.lineWidth = big ? 3 : 1.6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6));
      ctx.lineTo(x + Math.cos(a) * (r - (big ? 18 : 13)), y + Math.sin(a) * (r - (big ? 18 : 13)));
      ctx.stroke();
      if (big) ctx.fillText(String(v), x + Math.cos(a) * (r - 32), y + Math.sin(a) * (r - 32));
    }
    ctx.font = "600 13px 'Fenomen Sans', system-ui, sans-serif";
    ctx.fillText("kPa", x, y + 30);
    const a = ang(p);
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#334155";
    ctx.fill();
  }

  function draw() {
    const { k, ox, oy, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);

    const px = state.px;

    // vnitřek válce (lehce tónovaný)
    ctx.fillStyle = "rgba(147, 197, 253, 0.18)";
    ctx.fillRect(BORE.x0, BORE.y0, px - BORE.x0, BORE.y1 - BORE.y0);
    ctx.fillRect(VALVE.diskX + VALVE.diskW, VALVE.y0, BORE.x0 - VALVE.diskX - VALVE.diskW, VALVE.y1 - VALVE.y0);

    // částice
    ctx.fillStyle = "#5b7aa8";
    for (const p of state.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fill();
    }

    // nárazy do pístu (krátký záblesk)
    for (const h of state.hits) {
      const age = state.time - h.t;
      if (age > 0.3) continue;
      const a = 1 - age / 0.3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 6 + 14 * (1 - a), 0, Math.PI * 2);
      ctx.strokeStyle = h.side === "in" ? `rgba(225, 29, 72, ${a})` : `rgba(37, 99, 235, ${a})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // válec
    ctx.fillStyle = "#94a3b8";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    const wallRects = [
      [CYL.x0, CYL.y0, CYL.x1 - CYL.x0, BORE.y0 - CYL.y0],
      [CYL.x0, BORE.y1, CYL.x1 - CYL.x0, CYL.y1 - BORE.y1],
      [CYL.x0, CYL.y0, BORE.x0 - CYL.x0, VALVE.y0 - CYL.y0],
      [CYL.x0, VALVE.y1, BORE.x0 - CYL.x0, CYL.y1 - VALVE.y1],
      [VALVE.left, VALVE.y0 - 12, CYL.x0 - VALVE.left + 12, 12],
      [VALVE.left, VALVE.y1, CYL.x0 - VALVE.left + 12, 12],
    ];
    for (const [x, y, w, h] of wallRects) { ctx.fillRect(x, y, w, h); }
    ctx.strokeRect(CYL.x0, CYL.y0, CYL.x1 - CYL.x0, CYL.y1 - CYL.y0);

    // výpusť: klapka v trubce + páčka nad trubkou
    const vx = VALVE.diskX + VALVE.diskW / 2;
    const vy = (VALVE.y0 + VALVE.y1) / 2;
    ctx.save();
    ctx.lineCap = "round";
    if (state.valveOpen) {
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(vx - 16, vy); ctx.lineTo(vx + 16, vy); ctx.stroke();
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(VALVE.diskX, VALVE.y0, VALVE.diskW, VALVE.y1 - VALVE.y0);
    }
    const hy = VALVE.y0 - 12; // osa páčky na horní stěně trubky
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(vx, hy);
    if (state.valveOpen) ctx.lineTo(vx - 46, hy);   // páčka podél trubky = otevřeno
    else ctx.lineTo(vx, hy - 46);                   // páčka napříč trubkou = zavřeno
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(vx, hy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#e11d48";
    ctx.fill();
    ctx.restore();

    // píst, pístnice, rukojeť
    ctx.fillStyle = "#475569";
    rr(px + PISTON_W, 400 - ROD.half, ROD.len, ROD.half * 2, 6);
    ctx.fill();
    const g = ctx.createLinearGradient(px, 0, px + PISTON_W, 0);
    g.addColorStop(0, "#64748b");
    g.addColorStop(0.5, "#94a3b8");
    g.addColorStop(1, "#64748b");
    ctx.fillStyle = g;
    ctx.fillRect(px, BORE.y0, PISTON_W, BORE.y1 - BORE.y0);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.strokeRect(px, BORE.y0, PISTON_W, BORE.y1 - BORE.y0);
    const hx0 = px + PISTON_W + ROD.len;
    ctx.fillStyle = state.drag ? "#2563eb" : "#3b82f6";
    rr(hx0, 400 - HANDLE.half, HANDLE.w, HANDLE.half * 2, 10);
    ctx.fill();

    // síly na píst (zevnitř doprava, zvenku doleva)
    const kF = 1.2; // px na kPa
    arrow(px + PISTON_W / 2, 330, px + PISTON_W / 2 + state.pShown * kF, "#e11d48");
    arrow(px + PISTON_W / 2, 470, px + PISTON_W / 2 - P0 * kF, "#2563eb");

    drawGauge(state.pShown);
  }

  /* ---------- Panel ---------- */

  const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  function updatePanel() {
    const p = state.pShown;
    $("pIn").textContent = fmt(p);
    const fIn = p * 1000 * AREA_CM2 * 1e-4;
    const fOut = P0 * 1000 * AREA_CM2 * 1e-4;
    $("fIn").textContent = fmt(fIn);
    $("fOut").textContent = fmt(fOut);
    const st = $("pState");
    const d = Math.round(p - P0);
    st.classList.remove("pp-state--over", "pp-state--under", "pp-state--eq");
    if (d >= 2) { st.textContent = `přetlak o ${fmt(d)} kPa`; st.classList.add("pp-state--over"); }
    else if (d <= -2) { st.textContent = `podtlak o ${fmt(-d)} kPa`; st.classList.add("pp-state--under"); }
    else { st.textContent = "stejný tlak jako venku"; st.classList.add("pp-state--eq"); }
    let hin = 0;
    let hout = 0;
    // průměr za poslední 3 s (aby čísla tolik neskákala)
    const span = Math.min(3, Math.max(0.5, state.time - state.hitsSince));
    for (const h of state.hits) {
      if (state.time - h.t > 3) continue;
      if (h.side === "in") hin += 1; else hout += 1;
    }
    $("hitsIn").textContent = String(Math.round(hin / span));
    $("hitsOut").textContent = String(Math.round(hout / span));
  }

  /* ---------- Smyčka ---------- */

  let last = null;
  let panelTimer = 0;
  function frame(t) {
    const dt = last == null ? 1 / 60 : Math.min(1 / 30, (t - last) / 1000);
    last = t;
    state.time += dt;

    const prevPx = state.px;
    const maxStep = PISTON_MAX_V * dt;
    if (state.valveOpen && !state.drag) {
      // otevřený ventil: tlaky se vyrovnají prouděním vzduchu, píst zůstane stát
      state.vFree = 0;
      state.pxTarget = state.px;
    } else if (state.drag) {
      // píst se přibližuje k cíli tažení s omezenou rychlostí
      const want = state.pxTarget - state.px;
      state.px += Math.max(-maxStep, Math.min(maxStep, want));
      state.vFree = 0;
    } else {
      // puštěný píst: tlaková síla zevnitř a zvenku ho posune tam, kde se tlaky vyrovnají
      const eq = equilibriumX();
      const acc = 14 * (eq - state.px) - 7 * state.vFree; // tlumená „pružina“ – vzduch funguje jako pružina
      state.vFree += acc * dt;
      state.vFree = Math.max(-PISTON_MAX_V, Math.min(PISTON_MAX_V, state.vFree));
      let nx = state.px + state.vFree * dt;
      if (nx < PX_MIN) { nx = PX_MIN; state.vFree = 0; }
      if (nx > PX_MAX) { nx = PX_MAX; state.vFree = 0; }
      state.px = nx;
      state.pxTarget = nx;
    }
    state.vp = (state.px - prevPx) / dt;

    if (state.valveOpen) steerThroughValve(dt);

    const SUB = 3;
    for (let i = 0; i < SUB; i += 1) {
      const pPrev = prevPx + ((state.px - prevPx) * i) / SUB;
      step(dt / SUB, pPrev);
    }
    state.hits = state.hits.filter((h) => state.time - h.t < 3.05);

    const pNow = pressureNow();
    if (state.valveOpen) {
      // počet částic uvnitř se průměruje (částic je málo, okamžitá hodnota by skákala)
      const nNow = countInside();
      state.nSmooth += (nNow - state.nSmooth) * Math.min(1, dt / 1.5);
      const pSmooth = (P0 * state.nSmooth) / (N0_DENSITY * innerVolume(state.px));
      // po vyrovnání je zbylé kolísání jen šum – ukazuje se tlak okolí
      const target = Math.abs(pSmooth - P0) < Math.max(10, 2 * kPaPerParticle()) ? P0 : pSmooth;
      state.pShown += (target - state.pShown) * Math.min(1, dt / 0.6);
    }
    else {
      // těsně po zavření ventilu se ukazovaná hodnota k přesnému tlaku jen plynule dotáhne
      // (při otevřeném ventilu se ukazoval průměr, skutečný počet částic se od něj o kousek liší)
      const sinceClose = state.time - state.closedAt;
      if (sinceClose < 1.5) state.pShown += (pNow - state.pShown) * Math.min(1, dt / 0.35);
      else state.pShown = pNow;
      state.nSmooth = countInside();
    }

    draw();
    panelTimer += dt;
    if (panelTimer > 0.1) { panelTimer = 0; updatePanel(); }
    requestAnimationFrame(frame);
  }

  /* ---------- Ovládání ---------- */

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.k, y: (e.clientY - r.top - view.oy) / view.k };
  }

  function onPiston(p) {
    const px = state.px;
    const hx0 = px + PISTON_W + ROD.len;
    if (p.x > px - 10 && p.x < px + PISTON_W + 10 && p.y > BORE.y0 && p.y < BORE.y1) return true;
    if (p.x > px && p.x < hx0 && Math.abs(p.y - 400) < 26) return true;
    return p.x > hx0 - 14 && p.x < hx0 + HANDLE.w + 14 && Math.abs(p.y - 400) < HANDLE.half + 14;
  }

  function onValve(p) {
    return p.x > VALVE.left - 60 && p.x < CYL.x0 && p.y > VALVE.y0 - 70 && p.y < VALVE.y1 + 14;
  }

  function hideHint() {
    if (state.interacted) return;
    state.interacted = true;
    hintEl.classList.add("is-hidden");
  }

  canvas.addEventListener("pointerdown", (e) => {
    const p = toLogical(e);
    if (onPiston(p)) {
      hideHint();
      state.drag = { off: p.x - state.px };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("is-dragging");
    } else if (onValve(p)) {
      setValve(!state.valveOpen);
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = toLogical(e);
    if (state.drag) {
      state.pxTarget = Math.max(PX_MIN, Math.min(PX_MAX, p.x - state.drag.off));
      return;
    }
    canvas.classList.toggle("is-over-piston", onPiston(p));
    canvas.classList.toggle("is-over-valve", !onPiston(p) && onValve(p));
  });
  const endDrag = (e) => {
    if (!state.drag) return;
    state.drag = null;
    canvas.classList.remove("is-dragging");
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* uvolněno */ }
  };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  const valveBtns = document.querySelectorAll("[data-valve]");
  function setValve(open) {
    if (state.valveOpen && !open) state.closedAt = state.time;
    state.valveOpen = open;
    valveBtns.forEach((b) => {
      const on = (b.dataset.valve === "open") === open;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  valveBtns.forEach((b) => b.addEventListener("click", () => setValve(b.dataset.valve === "open")));

  $("btnReset").addEventListener("click", () => {
    state.px = PX0;
    state.pxTarget = PX0;
    state.vp = 0;
    state.vFree = 0;
    state.hits = [];
    state.hitsSince = state.time;
    setValve(false);
    initParticles();
    state.pShown = P0;
    updatePanel();
  });

  window.addEventListener("resize", resize);
  resize();
  initParticles();
  updatePanel();
  requestAnimationFrame(frame);

  window.__pp = { state, countInside, pressureNow, setTarget: (x) => { state.pxTarget = x; }, setValve };
})();
