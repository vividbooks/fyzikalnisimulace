/* Přeměny energie – betonová věž na ukládání energie (podle Energy Vault) */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("view");
  const ctx = canvas.getContext("2d");
  const hintEl = $("hintEl");

  /* ---------- Geometrie (logické souřadnice 1200 × 800) ---------- */
  const W = 1200;
  const H = 800;
  const G = 700;               // úroveň země
  const PX_M = 4;              // px na metr
  const LAYER_M = 12;          // výška jednoho patra věže (m)
  const LAYER = LAYER_M * PX_M;
  const BW = 56;               // šířka bloku
  const BH = 46;               // výška bloku (kresba)
  const N = 10;                // počet bloků
  const STACK_X = 520;         // střed věže z bloků
  const MAST_X = 460;          // střed stožáru jeřábu
  const SLOT_X = (i) => 610 + 60 * i; // místa bloků na zemi (0 = nejblíž věži)
  const JIB_Y = G - 150 * PX_M; // výložník ve výšce 150 m
  const JIB_X0 = 372;
  const JIB_X1 = 1190;
  const CABLE_Y = G + 22;      // podzemní kabel
  const TURB_X = 70;
  const PANEL_X = 245;
  const CITY_X = 370;

  /* ---------- Fyzika ---------- */
  const M = 35000;             // kg
  const g = 10;                // N/kg
  const ETA = 0.9;             // účinnost motoru i generátoru
  const CARRY_V = 190;         // px/s – rychlost bloku na laně
  const HOOK_V = 340;
  const TROLLEY_V = 440;

  const state = {
    mode: "pause",             // charge | pause | discharge
    lastDir: "charge",
    losses: false,
    blocks: [],                // { where: "ground"|"carry"|"tower", d }
    carrying: -1,
    trolleyX: 760,
    hookY: G - 260,
    epPrev: 0,
    eIn: 0,
    eOut: 0,
    heat: 0,
    power: 0,                  // vyhlazený výkon (J/s), + nabíjení, − vybíjení
    flow: 0,                   // úroveň toku energie pro zobrazení (−1 … 1), pomalu doznívá
    flowT: 0,
    night: 0,
    turbA: 0,
    turbV: 0,
    lit: 0,
    time: 0,
    done: "",
  };

  const pathLv = (i) => LAYER * (i + 1);
  const pathLh = (i) => SLOT_X(i) - STACK_X;
  const pathLen = (i) => pathLv(i) + pathLh(i);

  // poloha bloku i na dráze: nahoru u svého místa na zemi, pak vodorovně k věži
  function blockPos(i) {
    const b = state.blocks[i];
    const d = b.where === "tower" ? pathLen(i) : b.where === "ground" ? 0 : b.d;
    const lv = pathLv(i);
    if (d <= lv) return { x: SLOT_X(i), y: G - d };          // y = spodek bloku
    return { x: SLOT_X(i) - (d - lv), y: G - lv };
  }
  const heightM = (y) => (G - y) / PX_M;

  function epTotal() {
    let e = 0;
    for (let i = 0; i < N; i += 1) e += M * g * heightM(blockPos(i).y);
    return e;
  }

  function reset() {
    state.blocks = Array.from({ length: N }, () => ({ where: "ground", d: 0 }));
    state.carrying = -1;
    state.trolleyX = 760;
    state.hookY = G - 260;
    state.epPrev = 0;
    state.eIn = 0;
    state.eOut = 0;
    state.heat = 0;
    state.power = 0;
    state.night = 0;
    state.lit = 0;
    state.done = "";
    setMode("pause");
    state.lastDir = "charge";
    hintEl.textContent = "Přepni věž na „nabíjet“.";
    hintEl.classList.remove("is-hidden");
    renderChain();
  }

  /* ---------- Jeřáb ---------- */
  const approach = (v, t, s) => (Math.abs(t - v) <= s ? t : v + Math.sign(t - v) * s);

  function stackTopY() {
    let k = -1;
    for (let i = 0; i < N; i += 1) if (state.blocks[i].where === "tower") k = Math.max(k, i);
    return G - LAYER * (k + 2) + (LAYER - BH);   // vršek nejvyššího bloku (nebo podstavce)
  }

  function nextTarget() {
    if (state.mode === "charge") {
      for (let i = 0; i < N; i += 1) if (state.blocks[i].where === "ground") return i;
    } else if (state.mode === "discharge") {
      for (let i = N - 1; i >= 0; i -= 1) if (state.blocks[i].where === "tower") return i;
    }
    return -1;
  }

  function stepCrane(dt) {
    if (state.mode === "pause") return;
    if (state.carrying >= 0) {
      const i = state.carrying;
      const b = state.blocks[i];
      const dir = state.mode === "charge" ? 1 : -1;
      b.d = Math.max(0, Math.min(pathLen(i), b.d + dir * CARRY_V * dt));
      const p = blockPos(i);
      state.trolleyX = p.x;
      state.hookY = p.y - BH;
      if (b.d >= pathLen(i) && dir > 0) { b.where = "tower"; state.carrying = -1; }
      else if (b.d <= 0 && dir < 0) { b.where = "ground"; state.carrying = -1; }
      return;
    }
    const i = nextTarget();
    if (i < 0) {
      const msg = state.mode === "charge"
        ? "Věž je nabitá – všech 10 bloků je nahoře."
        : "Věž je vybitá – všechny bloky jsou dole.";
      if (state.done !== msg) {
        state.done = msg;
        hintEl.textContent = msg;
        hintEl.classList.remove("is-hidden");
      }
      // hák vyjede nahoru z cesty
      state.hookY = approach(state.hookY, Math.min(state.hookY, stackTopY() - 40), HOOK_V * dt);
      return;
    }
    const p = blockPos(i);
    const tx = p.x;
    const ty = p.y - BH;
    const safeY = Math.min(ty, stackTopY(), G - BH) - 22;
    if (Math.abs(state.trolleyX - tx) > 0.5) {
      if (state.hookY > safeY + 0.5) state.hookY = approach(state.hookY, safeY, HOOK_V * dt);
      else state.trolleyX = approach(state.trolleyX, tx, TROLLEY_V * dt);
    } else {
      state.trolleyX = tx;
      state.hookY = approach(state.hookY, ty, HOOK_V * dt);
      if (Math.abs(state.hookY - ty) < 0.5) {
        state.carrying = i;
        state.blocks[i].d = state.blocks[i].where === "tower" ? pathLen(i) : 0;
        state.blocks[i].where = "carry";
      }
    }
  }

  /* ---------- Kreslení ---------- */
  let view = { k: 1, ox: 0, oy: 0, dpr: 1 };
  const WORLD = { x0: 0, y0: 0, x1: W, y1: H };

  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const k = Math.min(cw / W, ch / H);
    view = { k, ox: (cw - W * k) / 2, oy: (ch - H * k) / 2, dpr };
    if (k > 0) {
      WORLD.x0 = -view.ox / k; WORLD.x1 = (cw - view.ox) / k;
      WORLD.y0 = -view.oy / k; WORLD.y1 = (ch - view.oy) / k;
    }
  }

  const mix = (a, b, t) => a + (b - a) * t;
  function mixColor(c1, c2, t) {
    const p = (c) => [1, 3, 5].map((o) => parseInt(c.slice(o, o + 2), 16));
    const a = p(c1); const b = p(c2);
    return `rgb(${a.map((v, j) => Math.round(mix(v, b[j], t))).join(",")})`;
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

  function drawSky() {
    const n = state.night;
    ctx.fillStyle = mixColor("#ffffe6", "#1e293b", n);
    ctx.fillRect(WORLD.x0, WORLD.y0, WORLD.x1 - WORLD.x0, WORLD.y1 - WORLD.y0);
    // hvězdy
    if (n > 0.05) {
      ctx.fillStyle = `rgba(255,255,255,${0.8 * n})`;
      for (let s = 0; s < 60; s += 1) {
        const x = WORLD.x0 + ((s * 389.7) % (WORLD.x1 - WORLD.x0));
        const y = WORLD.y0 + ((s * 211.3) % (G - 220 - WORLD.y0));
        ctx.beginPath(); ctx.arc(x, y, s % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Slunce a Měsíc
    const sx = 170;
    const sy = mix(120, G + 80, n);
    if (n < 0.98) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      const rot = state.time * 0.3;
      for (let r = 0; r < 12; r += 1) {
        const a = rot + (r * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 50, Math.sin(a) * 50);
        ctx.lineTo(Math.cos(a) * 64, Math.sin(a) * 64);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24"; ctx.fill();
      ctx.restore();
    }
    if (n > 0.02) {
      const my = mix(G + 80, 48, n);
      ctx.save();
      ctx.globalAlpha = n;
      ctx.beginPath(); ctx.arc(1000, my, 32, 0, Math.PI * 2);
      ctx.fillStyle = "#f1f5f9"; ctx.fill();
      ctx.beginPath(); ctx.arc(1016, my - 10, 30, 0, Math.PI * 2);
      ctx.fillStyle = mixColor("#ffffe6", "#1e293b", n); ctx.fill();
      ctx.restore();
    }
  }

  function drawGround() {
    const n = state.night;
    ctx.fillStyle = mixColor("#d9e8c3", "#334155", n * 0.85);
    ctx.fillRect(WORLD.x0, G, WORLD.x1 - WORLD.x0, WORLD.y1 - G);
    ctx.fillStyle = mixColor("#9cbf7a", "#475569", n * 0.85);
    ctx.fillRect(WORLD.x0, G, WORLD.x1 - WORLD.x0, 6);
    // kabel v zemi
    ctx.strokeStyle = mixColor("#64748b", "#94a3b8", n);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(TURB_X, G); ctx.lineTo(TURB_X, CABLE_Y); ctx.lineTo(MAST_X, CABLE_Y);
    ctx.moveTo(PANEL_X, G - 20); ctx.lineTo(PANEL_X, CABLE_Y);
    ctx.moveTo(CITY_X, G); ctx.lineTo(CITY_X, CABLE_Y);
    ctx.moveTo(MAST_X, CABLE_Y); ctx.lineTo(MAST_X, G);
    ctx.stroke();
  }

  function drawTurbine() {
    const x = TURB_X;
    const hubY = G - 290;
    ctx.fillStyle = "#e2e8f0";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 9, G); ctx.lineTo(x - 4, hubY); ctx.lineTo(x + 4, hubY); ctx.lineTo(x + 9, G); ctx.closePath();
    ctx.fill(); ctx.stroke();
    rr(x - 8, hubY - 9, 30, 16, 6); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.translate(x - 8, hubY - 1);
    ctx.rotate(state.turbA);
    for (let b = 0; b < 3; b += 1) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.quadraticCurveTo(40, -12, 100, -2);
      ctx.quadraticCurveTo(40, 6, 0, 5);
      ctx.closePath();
      ctx.fillStyle = "#f8fafc";
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x - 8, hubY - 1, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#cbd5e1"; ctx.fill(); ctx.stroke();
  }

  function drawPanels() {
    for (const px of [150, 212]) {
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px + 26, G); ctx.lineTo(px + 26, G - 34); ctx.stroke();
      ctx.save();
      ctx.translate(px + 26, G - 40);
      ctx.rotate(-0.35);
      ctx.fillStyle = "#1e3a8a";
      rr(-30, -14, 60, 28, 3); ctx.fill();
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1;
      for (let c = -15; c <= 15; c += 15) { ctx.beginPath(); ctx.moveTo(c, -14); ctx.lineTo(c, 14); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
      if (state.night < 0.5 && state.mode === "charge") {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(-12, -12); ctx.lineTo(-24, 12); ctx.lineTo(-30, 12); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawCity() {
    const blds = [[300, 34, 84], [338, 40, 110], [382, 28, 64], [314, 30, 46]];
    const lit = state.lit;
    for (const [x, w, h] of blds) {
      ctx.fillStyle = mixColor("#94a3b8", "#475569", state.night);
      ctx.fillRect(x, G - h, w, h);
      for (let wy = G - h + 8; wy < G - 12; wy += 14) {
        for (let wx = x + 6; wx < x + w - 8; wx += 10) {
          ctx.fillStyle = lit > 0.02 ? `rgba(253, 224, 71, ${0.25 + 0.75 * lit})` : mixColor("#e2e8f0", "#1e293b", state.night);
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
  }

  function drawBlock(x, yBottom, hl) {
    const x0 = x - BW / 2;
    const y0 = yBottom - BH;
    ctx.fillStyle = hl ? "#e4e4e7" : "#d4d4d8";
    rr(x0, y0, BW, BH, 3); ctx.fill();
    ctx.strokeStyle = hl ? "#ec4899" : "#a1a1aa";
    ctx.lineWidth = hl ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = "#71717a";
    ctx.font = "600 13px 'Fenomen Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("35 t", x, y0 + BH / 2 + 1);
  }

  function drawTowerAndCrane() {
    // podstavec věže (12 m)
    ctx.fillStyle = "#a1a1aa";
    ctx.fillRect(STACK_X - 34, G - LAYER, 68, LAYER);
    ctx.fillStyle = "#8b8b93";
    ctx.fillRect(STACK_X - 34, G - LAYER, 68, 5);

    // stožár (příhradový)
    const mx0 = MAST_X - 11;
    const mx1 = MAST_X + 11;
    const top = JIB_Y - 6;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx0, G); ctx.lineTo(mx0, top); ctx.moveTo(mx1, G); ctx.lineTo(mx1, top); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = G; y > top + 22; y -= 22) {
      ctx.moveTo(mx0, y); ctx.lineTo(mx1, y - 22);
      ctx.moveTo(mx1, y - 22); ctx.lineTo(mx0, y - 22);
    }
    ctx.stroke();
    // výškové značky na stožáru
    ctx.fillStyle = mixColor("#64748b", "#cbd5e1", state.night);
    ctx.strokeStyle = mixColor("#64748b", "#cbd5e1", state.night);
    ctx.font = "12px 'Fenomen Sans', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1.5;
    for (let m = 12; m <= 132; m += 12) {
      const y = G - m * PX_M;
      ctx.beginPath(); ctx.moveTo(mx0 - 2, y); ctx.lineTo(mx0 - (m % 24 === 0 ? 10 : 6), y); ctx.stroke();
      if (m % 24 === 0) ctx.fillText(`${m} m`, mx0 - 13, y);
    }

    // vrchol s táhly
    const apexY = JIB_Y - 74;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx0, top); ctx.lineTo(MAST_X, apexY); ctx.lineTo(mx1, top); ctx.stroke();
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(JIB_X0 + 6, JIB_Y); ctx.lineTo(MAST_X, apexY); ctx.lineTo(JIB_X1 - 120, JIB_Y); ctx.stroke();

    // výložník
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(JIB_X0, JIB_Y - 6, JIB_X1 - JIB_X0, 6);
    ctx.fillRect(JIB_X0, JIB_Y + 8, JIB_X1 - JIB_X0, 4);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = JIB_X0; x < JIB_X1 - 14; x += 14) { ctx.moveTo(x, JIB_Y + 8); ctx.lineTo(x + 7, JIB_Y); ctx.lineTo(x + 14, JIB_Y + 8); }
    ctx.stroke();
    // protizávaží
    ctx.fillStyle = "#71717a";
    ctx.fillRect(JIB_X0 + 4, JIB_Y + 12, 46, 40);

    // motor / generátor (naviják)
    const wx = MAST_X - 26;
    const wy = JIB_Y - 40;
    const active = Math.abs(state.flow) > 0.05;
    ctx.fillStyle = "#334155";
    rr(wx, wy, 52, 32, 6); ctx.fill();
    ctx.beginPath(); ctx.arc(MAST_X, wy + 16, 10, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#fbbf24" : "#64748b"; ctx.fill();
    ctx.fillStyle = mixColor("#334155", "#f8fafc", state.night);
    ctx.font = "600 14px 'Fenomen Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(state.lastDir === "charge" ? "motor" : "generátor", MAST_X, wy - 10);

    // teplo (ztráty)
    if (state.losses && active) {
      const lvl = Math.min(1, Math.abs(state.flow) * 1.6);
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.35 + 0.5 * lvl})`;
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k += 1) {
        const x0 = wx + 62 + k * 14;
        const ph = (state.time * 1.5 + k * 0.33) % 1;
        ctx.beginPath();
        for (let s = 0; s <= 1; s += 0.1) {
          const yy = wy + 30 - s * 40 - ph * 6;
          const xx = x0 + Math.sin(s * 9 + state.time * 6 + k) * 3;
          if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#ea580c";
      ctx.font = "600 13px 'Fenomen Sans', system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("teplo", wx + 104, wy + 20);
    }

    // bloky
    for (let i = 0; i < N; i += 1) {
      const p = blockPos(i);
      drawBlock(p.x, p.y, state.blocks[i].where === "carry");
    }

    // kočka, lano, hák
    const tx = state.trolleyX;
    ctx.fillStyle = "#475569";
    rr(tx - 16, JIB_Y + 12, 32, 12, 3); ctx.fill();
    const rope = mixColor("#1e293b", "#cbd5e1", state.night);
    ctx.strokeStyle = rope;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - 4, JIB_Y + 24); ctx.lineTo(tx - 4, state.hookY - 10);
    ctx.moveTo(tx + 4, JIB_Y + 24); ctx.lineTo(tx + 4, state.hookY - 10);
    ctx.stroke();
    ctx.fillStyle = rope;
    rr(tx - 10, state.hookY - 12, 20, 9, 2); ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx, state.hookY - 3); ctx.lineTo(tx, state.hookY); ctx.stroke();

    // výška zvedaného bloku
    if (state.carrying >= 0) {
      const p = blockPos(state.carrying);
      const h = heightM(p.y);
      if (h > 0.5) {
        const lx = p.x + BW / 2 + 8;
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(lx, p.y); ctx.lineTo(lx, G); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(lx - 6, p.y); ctx.lineTo(lx + 6, p.y); ctx.moveTo(lx - 6, G); ctx.lineTo(lx + 6, G); ctx.stroke();
        const label = `h = ${Math.round(h)} m`;
        ctx.font = "600 15px 'Fenomen Sans', system-ui, sans-serif";
        const tw = ctx.measureText(label).width;
        const ly = (p.y + G) / 2;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        rr(lx + 6, ly - 13, tw + 14, 26, 8); ctx.fill();
        ctx.fillStyle = "#be185d";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, lx + 13, ly + 1);
      }
    }
  }

  // tečky energie podél vedení
  function flowDots(points, offset, alpha) {
    const segs = [];
    let total = 0;
    for (let k = 1; k < points.length; k += 1) {
      const [x0, y0] = points[k - 1];
      const [x1, y1] = points[k];
      const len = Math.hypot(x1 - x0, y1 - y0);
      segs.push({ x0, y0, x1, y1, len, start: total });
      total += len;
    }
    const gap = 26;
    ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
    ctx.strokeStyle = `rgba(161, 98, 7, ${alpha})`;
    ctx.lineWidth = 1.5;
    for (let s = ((offset % gap) + gap) % gap; s < total; s += gap) {
      const seg = segs.find((q) => s >= q.start && s <= q.start + q.len);
      if (!seg) continue;
      const t = (s - seg.start) / seg.len;
      ctx.beginPath();
      ctx.arc(mix(seg.x0, seg.x1, t), mix(seg.y0, seg.y1, t), 5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  function drawFlow() {
    const lvl = Math.min(1, Math.abs(state.flow) * 1.6);
    if (lvl < 0.05) return;
    const up = JIB_Y - 24;
    if (state.flow > 0) {
      flowDots([[TURB_X, G], [TURB_X, CABLE_Y], [MAST_X, CABLE_Y], [MAST_X, up]], state.flowT, lvl);
      flowDots([[PANEL_X, G - 20], [PANEL_X, CABLE_Y]], state.flowT, lvl);
    } else {
      flowDots([[MAST_X, up], [MAST_X, CABLE_Y], [CITY_X, CABLE_Y], [CITY_X, G]], state.flowT, lvl);
    }
  }

  function draw() {
    const { k, ox, oy, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
    drawSky();
    drawGround();
    drawTurbine();
    drawPanels();
    drawCity();
    drawTowerAndCrane();
    drawFlow();
  }

  /* ---------- Panel ---------- */
  const fmt = (v, d = 1) => v.toLocaleString("cs-CZ", { minimumFractionDigits: d, maximumFractionDigits: d });
  const MJ = (j) => `${fmt(j / 1e6)} MJ`;

  const CHAIN = {
    charge: {
      label: "Přeměny při nabíjení",
      steps: [
        ["pe-step--light", "světelná energie Slunce a pohybová energie větru", "solární panely a větrná elektrárna"],
        ["pe-step--el", "elektrická energie", "vede se kabelem k jeřábu"],
        ["pe-step--kin", "pohybová energie", "motor navíjí lano a zvedá blok"],
        ["pe-step--pot", "polohová energie bloku", "čím výš blok je, tím víc energie má"],
      ],
      arrows: ["elektrárny", "motor", "zvedání bloku"],
      heatAt: 1,
    },
    discharge: {
      label: "Přeměny při vybíjení",
      steps: [
        ["pe-step--pot", "polohová energie bloku", "blok visí vysoko nad zemí"],
        ["pe-step--kin", "pohybová energie", "klesající blok odvíjí lano"],
        ["pe-step--el", "elektrická energie", "generátor ji posílá kabelem do města"],
        ["pe-step--light", "světelná a tepelná energie ve městě", "svítí lampy a okna, topí spotřebiče"],
      ],
      arrows: ["klesání bloku", "generátor", "spotřebiče"],
      heatAt: 1,
    },
  };

  function renderChain() {
    const c = CHAIN[state.lastDir];
    $("chainLabel").textContent = c.label;
    c.steps.forEach(([cls, title, sub], j) => {
      const el = $(`st${j + 1}`);
      el.className = `pe-step ${cls}`;
      el.innerHTML = `<b>${title}</b><small>${sub}</small>`;
    });
    c.arrows.forEach((t, j) => {
      const heat = j === c.heatAt ? ` <span class="pe-heat"${state.losses ? "" : " hidden"}>+ teplo</span>` : "";
      $(`ar${j + 1}`).innerHTML = `<span>${t}</span>${heat}`;
    });
  }

  function updatePanel() {
    $("chain").classList.toggle("is-active", Math.abs(state.flow) > 0.05);
    const nTop = state.blocks.filter((b) => b.where === "tower").length;
    $("nTop").textContent = `${nTop} z ${N}`;
    $("epTotal").textContent = MJ(epTotal());
    const f = $("formula");
    if (state.carrying >= 0) {
      const h = Math.round(heightM(blockPos(state.carrying).y));
      const e = M * g * h;
      f.innerHTML = `zvedaný blok: <i class="qty">E</i><sub>p</sub> = <i class="qty">m</i> · <i class="qty">g</i> · <i class="qty">h</i> = 35 000 kg · 10 N/kg · ${h} m = <b>${MJ(e)}</b>`;
    } else {
      f.textContent = "Jeřáb teď nic nenese.";
    }
    $("eIn").textContent = MJ(state.eIn);
    $("eOut").textContent = MJ(state.eOut);
    $("eHeat").textContent = MJ(state.heat);
    $("heatRow").hidden = !state.losses;
  }

  /* ---------- Smyčka ---------- */
  let last = null;
  let panelTimer = 0;
  function frame(t) {
    const dt = last == null ? 1 / 60 : Math.min(1 / 30, (t - last) / 1000);
    last = t;
    state.time += dt;

    stepCrane(dt);

    const ep = epTotal();
    const dE = ep - state.epPrev;
    state.epPrev = ep;
    const eta = state.losses ? ETA : 1;
    if (dE > 0) {
      state.eIn += dE / eta;
      state.heat += dE / eta - dE;
    } else if (dE < 0) {
      state.eOut += -dE * eta;
      state.heat += -dE * (1 - eta);
    }
    const pNow = dE / dt;
    state.power += (pNow - state.power) * Math.min(1, dt / 0.15);
    // tok energie v kabelu: rychle naběhne, pomalu doznívá (mezi bloky nebliká)
    const fNow = Math.max(-1, Math.min(1, state.power / 1.2e6));
    const tau = Math.abs(fNow) > Math.abs(state.flow) || Math.sign(fNow) !== Math.sign(state.flow) && fNow !== 0 ? 0.25 : 4;
    state.flow += (fNow - state.flow) * Math.min(1, dt / tau);
    if (state.mode === "pause") state.flow += (0 - state.flow) * Math.min(1, dt / 0.4);
    state.flowT += dt * 140 * Math.sign(state.flow || 1);

    const nightTarget = state.mode === "discharge" ? 1 : state.mode === "charge" ? 0 : state.night;
    state.night += (nightTarget - state.night) * Math.min(1, dt / 0.8);
    const litTarget = Math.max(0, Math.min(1, -state.flow * 2.5));
    state.lit += (litTarget - state.lit) * Math.min(1, dt / 0.4);
    const turbTarget = state.mode === "charge" ? 2.2 : 0;
    state.turbV += (turbTarget - state.turbV) * Math.min(1, dt / 1.2);
    state.turbA += state.turbV * dt;

    draw();
    panelTimer += dt;
    if (panelTimer > 0.08) { panelTimer = 0; updatePanel(); }
    requestAnimationFrame(frame);
  }

  /* ---------- Ovládání ---------- */
  const modeBtns = document.querySelectorAll("[data-mode]");
  function setMode(m) {
    state.mode = m;
    if (m !== "pause") {
      state.lastDir = m;
      state.done = "";
      hintEl.classList.add("is-hidden");
      renderChain();
    }
    modeBtns.forEach((b) => {
      const on = b.dataset.mode === m;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  const lossBtns = document.querySelectorAll("[data-loss]");
  lossBtns.forEach((b) => b.addEventListener("click", () => {
    state.losses = b.dataset.loss === "on";
    lossBtns.forEach((o) => {
      const on = o === b;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-pressed", String(on));
    });
    renderChain();
    updatePanel();
  }));

  $("btnReset").addEventListener("click", reset);

  window.addEventListener("resize", resize);
  resize();
  reset();
  updatePanel();
  requestAnimationFrame(frame);

  window.__pe = { state, epTotal, setMode };
})();
