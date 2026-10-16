/* Přeměny energie – betonová věž na ukládání energie (podle Energy Vault)
   Každý přenesený blok = jeden cyklus o 4 krocích. Energie se ukazuje jako „balíčky“,
   které mění barvu (druh energie) přesně v místě, kde přeměna probíhá. */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("view");
  const ctx = canvas.getContext("2d");
  const hintEl = $("hintEl");
  const capEl = $("caption");
  const capStep = $("capStep");
  const capText = $("capText");
  const capNext = $("capNext");

  /* ---------- Geometrie (logické souřadnice 1200 × 800) ---------- */
  const W = 1200;
  const H = 800;
  const G = 700;               // úroveň země
  const PX_M = 4;              // px na metr
  const LAYER_M = 12;          // výška jednoho patra věže (m)
  const LAYER = LAYER_M * PX_M;
  const BW = 56;
  const BH = 46;
  const N = 10;
  const STACK_X = 520;
  const MAST_X = 460;
  const SLOT_X = (i) => 610 + 60 * i;
  const JIB_Y = G - 150 * PX_M;
  const JIB_X0 = 372;
  const JIB_X1 = 1190;
  const CABLE_Y = G + 22;
  const TURB_X = 70;
  const PANEL_X = 245;
  const CITY_X = 370;
  const WINCH = { x: MAST_X, y: JIB_Y - 24 };

  /* ---------- Fyzika ---------- */
  const M = 35000;             // kg
  const g = 10;                // N/kg
  const ETA = 0.9;             // účinnost motoru i generátoru
  const E_PACK = M * g * LAYER_M; // 1 balíček = energie na zvednutí o jedno patro (4,2 MJ)
  const LIFT_V = 70;           // px/s – blok na laně (svisle)
  const MOVE_V = 150;          // px/s – blok vodorovně
  const HOOK_V = 300;
  const TROLLEY_V = 380;
  const PACK_V = 230;          // px/s – balíček energie
  const PR = 9;                // poloměr balíčku

  const COL = {
    light: "#facc15",
    el: "#3b82f6",
    kin: "#22c55e",
    pot: "#ec4899",
    heat: "#f97316",
  };

  const state = {
    mode: "pause",             // charge | pause | discharge
    lastDir: "charge",
    losses: false,
    stepMode: false,
    blocks: [],                // { where: "ground"|"carry"|"tower", d }
    trolleyX: 760,
    hookY: G - 260,
    cyc: null,                 // aktuální cyklus
    packets: [],               // letící balíčky
    buffer: [],                // balíčky čekající u motoru/generátoru ("el")
    fx: [],                    // záblesky přeměn
    epPrev: 0,
    eIn: 0,
    eOut: 0,
    heat: 0,
    night: 0,
    turbA: 0,
    turbV: 0,
    lit: 0,
    litHold: 0,
    time: 0,
    done: "",
  };

  const pathLv = (i) => LAYER * (i + 1);
  const pathLh = (i) => SLOT_X(i) - STACK_X;
  const pathLen = (i) => pathLv(i) + pathLh(i);

  function blockPos(i) {
    const b = state.blocks[i];
    const d = b.where === "tower" ? pathLen(i) : b.where === "ground" ? 0 : b.d;
    const lv = pathLv(i);
    if (d <= lv) return { x: SLOT_X(i), y: G - d };
    return { x: SLOT_X(i) - (d - lv), y: G - lv };
  }
  const heightM = (y) => (G - y) / PX_M;
  const blockEp = (i) => M * g * heightM(blockPos(i).y);

  function epTotal() {
    let e = 0;
    for (let i = 0; i < N; i += 1) e += blockEp(i);
    return e;
  }

  /* ---------- Cesty balíčků ---------- */
  function srcPath(fromPanel) {
    const start = fromPanel ? [PANEL_X, G - 30] : [TURB_X, G - 20];
    return [start, [start[0], CABLE_Y], [MAST_X, CABLE_Y], [MAST_X, JIB_Y + 4], [WINCH.x, WINCH.y]];
  }
  function ropePath() {
    // od motoru po výložníku ke kočce a dolů po laně k háku
    return [[WINCH.x, WINCH.y], [WINCH.x + 30, JIB_Y + 4], [state.trolleyX, JIB_Y + 4], [state.trolleyX, state.hookY - 12]];
  }
  function cityPath() {
    return [[WINCH.x, WINCH.y], [MAST_X, JIB_Y + 4], [MAST_X, CABLE_Y], [CITY_X, CABLE_Y], [CITY_X, G - 40]];
  }
  function polyLen(pts) {
    let L = 0;
    for (let k = 1; k < pts.length; k += 1) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    return L;
  }
  function polyAt(pts, s) {
    for (let k = 1; k < pts.length; k += 1) {
      const [x0, y0] = pts[k - 1];
      const [x1, y1] = pts[k];
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (s <= len || k === pts.length - 1) {
        const t = len ? Math.max(0, Math.min(1, s / len)) : 1;
        return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
      }
      s -= len;
    }
    return pts[pts.length - 1];
  }
  const bufferPos = (j) => [WINCH.x + 44 + (j % 10) * 19, JIB_Y - 18 - Math.floor(j / 10) * 19];

  function popFx(x, y, color) {
    state.fx.push({ x, y, color, t: 0 });
  }

  /* ---------- Cykly ---------- */
  const TEXT = {
    charge: [
      "Solární panely a větrná elektrárna mění světelnou energii Slunce a pohybovou energii větru na elektrickou energii.",
      "Elektrická energie putuje kabelem k motoru jeřábu.",
      "Motor mění elektrickou energii na pohybovou a zvedá blok. Polohová energie bloku roste.",
      "",
    ],
    discharge: [
      "",
      "Blok klesá a roztáčí generátor. Generátor mění pohybovou energii na elektrickou – polohová energie bloku ubývá.",
      "Elektrická energie putuje kabelem do města.",
      "Ve městě se elektrická energie mění na světlo a teplo.",
    ],
  };

  function stepText(c) {
    const i = c.block;
    const h = Math.round(heightM(blockPos(i).y));
    const e = fmt((M * g * h) / 1e6);
    let t = TEXT[c.dir][c.step - 1];
    if (c.dir === "charge" && c.step === 4) t = `Blok je ve výšce ${h} m a má polohovou energii Eₚ = m · g · h = ${e} MJ.`;
    if (c.dir === "discharge" && c.step === 1) t = `Blok ve výšce ${Math.round(heightM(G - pathLv(i)))} m má polohovou energii Eₚ = ${fmt((M * g * heightM(G - pathLv(i))) / 1e6)} MJ. Jeřáb ho přenese nad volné místo.`;
    if (state.losses && ((c.dir === "charge" && c.step === 3) || (c.dir === "discharge" && c.step === 2))) t += " Část energie se přitom mění na teplo.";
    return t;
  }

  function startCycle(dir) {
    state.packets = state.packets.filter((p) => p.rise);
    state.buffer = [];
    // rozpracovaný blok (po přepnutí směru)
    let i = -1;
    for (let k = 0; k < N; k += 1) if (state.blocks[k].where === "carry") i = k;
    if (i < 0) {
      if (dir === "charge") { for (let k = 0; k < N; k += 1) if (state.blocks[k].where === "ground") { i = k; break; } }
      else { for (let k = N - 1; k >= 0; k -= 1) if (state.blocks[k].where === "tower") { i = k; break; } }
    }
    if (i < 0) { state.cyc = null; return false; }
    const b = state.blocks[i];
    const lv = pathLv(i);
    const c = { dir, block: i, step: 1, t: 0, waiting: false, hold: 0, n: 0, nHeat: 0, spawned: 0, sent: 0, arrived: 0, label: 0 };
    if (dir === "charge") {
      const dNow = b.where === "carry" ? b.d : 0;
      const need = Math.max(0, M * g * (lv - Math.min(dNow, lv)) / PX_M);
      c.n = Math.max(dNow >= lv ? 0 : 1, Math.round(need / E_PACK));
      c.nHeat = state.losses ? Math.round(c.n * (1 / ETA - 1)) : 0;
      if (dNow >= lv) c.step = 4;
    } else {
      const dNow = b.where === "carry" ? b.d : pathLen(i);
      const have = M * g * Math.min(dNow, lv) / PX_M;
      c.n = Math.max(1, Math.round(have / E_PACK));
      c.nHeat = state.losses ? Math.round(c.n * (1 - ETA)) : 0;
      if (b.where === "carry" && dNow <= lv) c.step = 2;
    }
    state.cyc = c;
    showCaption();
    return true;
  }

  function showCaption() {
    const c = state.cyc;
    if (!c) { capEl.hidden = true; return; }
    capEl.hidden = false;
    capStep.textContent = `Krok ${c.step} ze 4`;
    capText.textContent = stepText(c);
    capNext.hidden = !c.waiting;
    capEl.dataset.dir = c.dir;
    renderChain();
  }

  function nextStep() {
    const c = state.cyc;
    if (!c) return;
    c.waiting = false;
    c.hold = 0;
    if (c.step >= 4) {
      state.cyc = null;
      if (state.mode !== "pause" && !startCycle(state.mode)) finish();
      return;
    }
    c.step += 1;
    c.t = 0;
    c.sent = 0;
    c.arrived = 0;
    showCaption();
  }

  // konec kroku: plynule → krátká pauza, po krocích → čeká na tlačítko
  function stepDone(dt, minT) {
    const c = state.cyc;
    if (c.t < minT) return;
    if (state.stepMode) {
      if (!c.waiting) { c.waiting = true; showCaption(); }
      return;
    }
    c.hold += dt;
    if (c.hold > 0.7) nextStep();
  }

  function finish() {
    const msg = state.mode === "charge"
      ? "Věž je nabitá – všech 10 bloků je nahoře."
      : "Věž je vybitá – všechny bloky jsou dole.";
    state.done = msg;
    capEl.hidden = true;
    hintEl.textContent = msg;
    hintEl.classList.remove("is-hidden");
    renderChain();
  }

  const approach = (v, t, s) => (Math.abs(t - v) <= s ? t : v + Math.sign(t - v) * s);

  function stackTopY() {
    let k = -1;
    for (let i = 0; i < N; i += 1) if (state.blocks[i].where === "tower") k = Math.max(k, i);
    return G - LAYER * (k + 2) + (LAYER - BH);
  }

  // prázdný hák dojede k bloku a zachytí ho; vrací true, když blok visí na háku
  function seekBlock(i, dt) {
    const b = state.blocks[i];
    if (b.where === "carry") return true;
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
        b.d = b.where === "tower" ? pathLen(i) : 0;
        b.where = "carry";
        return true;
      }
    }
    return false;
  }

  function hookToBlock(i) {
    const p = blockPos(i);
    state.trolleyX = p.x;
    state.hookY = p.y - BH;
  }

  function launch(kind, path, onArrive, delay = 0) {
    state.packets.push({ kind, path, s: -delay * PACK_V, onArrive, born: state.time });
  }

  function stepCycle(dt) {
    const c = state.cyc;
    if (!c || c.waiting) return;
    c.t += dt;
    const i = c.block;
    const b = state.blocks[i];
    const lv = pathLv(i);

    if (c.dir === "charge") {
      if (c.step === 1) {
        // zdroje vyrábějí balíčky: světelná/pohybová → elektrická
        const total = c.n + c.nHeat;
        while (c.spawned < total && c.t > 0.35 + c.spawned * (1.6 / Math.max(1, total))) {
          const fromPanel = c.spawned % 2 === 1;
          const [x, y] = srcPath(fromPanel)[0];
          state.packets.push({ kind: "light", path: () => srcPath(fromPanel), s: 0, hold: true, born: state.time, morphAt: state.time + 0.7, px: x, py: y, slot: c.spawned });
          c.spawned += 1;
        }
        const ready = seekBlock(i, dt);
        const allEl = state.packets.every((p) => p.rise || p.kind === "el");
        if (ready && c.spawned >= total && allEl) stepDone(dt, 2.6);
      } else if (c.step === 2) {
        if (c.sent === 0) {
          state.packets = state.packets.filter((p) => !p.rise);
          state.packets.forEach((p, k) => { p.hold = false; p.s = -k * 0.3 * PACK_V; p.onArrive = (q) => { state.buffer.push(q.kind); c.arrived += 1; }; });
          c.sent = state.packets.length;
        }
        if (c.arrived >= c.sent) stepDone(dt, 0.4);
      } else if (c.step === 3) {
        // motor: elektrická → pohybová; přebytečné balíčky → teplo
        if (c.sent === 0) {
          for (let k = 0; k < c.nHeat && state.buffer.length; k += 1) {
            state.buffer.pop();
            const [x, y] = bufferPos(state.buffer.length);
            state.packets.push({ kind: "heat", rise: true, x, y, born: state.time });
          }
          c.sent = -1;
        }
        b.d = Math.min(lv, b.d + LIFT_V * dt);
        hookToBlock(i);
        const frac = lv > 0 ? b.d / lv : 1;
        const toSend = Math.min(c.n, Math.ceil(frac * c.n - 1e-9));
        while (c.arrived + state.packets.filter((p) => p.kind === "kin").length < toSend && state.buffer.length) {
          state.buffer.pop();
          popFx(WINCH.x, WINCH.y, COL.kin);
          launch("kin", ropePath, (q) => {
            const [x, y] = polyAt(ropePath(), 1e9);
            popFx(x, y + 12, COL.pot);
            c.arrived += 1;
          });
        }
        const flying = state.packets.some((p) => p.kind === "kin");
        if (b.d >= lv && !flying) stepDone(dt, 1);
      } else if (c.step === 4) {
        if (b.where === "carry") {
          b.d = Math.min(pathLen(i), b.d + MOVE_V * dt);
          hookToBlock(i);
          if (b.d >= pathLen(i)) { b.where = "tower"; c.label = 0; }
        } else {
          c.label += dt;
          state.hookY = approach(state.hookY, stackTopY() - 30, HOOK_V * 0.4 * dt);
          stepDone(dt, 2.4);
        }
      }
    } else {
      if (c.step === 1) {
        if (!seekBlock(i, dt)) return;
        b.d = Math.max(lv, b.d - MOVE_V * dt);
        hookToBlock(i);
        if (b.d <= lv) stepDone(dt, 2.6);
      } else if (c.step === 2) {
        // klesání: polohová → pohybová (lano) → elektrická (generátor)
        b.d = Math.max(0, b.d - LIFT_V * dt);
        hookToBlock(i);
        const frac = lv > 0 ? 1 - b.d / lv : 1;
        const toSend = Math.min(c.n, Math.floor(frac * c.n + 1e-9));
        while (c.sent < toSend) {
          const k = c.sent;
          c.sent += 1;
          const [hx, hy] = polyAt(ropePath(), 1e9);
          popFx(hx, hy + 14, COL.pot);
          const toHeat = k < c.nHeat;
          state.packets.push({
            kind: "pot",
            morphTo: "kin",
            morphAt: state.time + 0.35,
            path: () => ropePath().slice().reverse(),
            s: 0,
            born: state.time,
            onArrive: () => {
              popFx(WINCH.x, WINCH.y, toHeat ? COL.heat : COL.el);
              if (toHeat) {
                state.packets.push({ kind: "heat", rise: true, x: WINCH.x - 30, y: WINCH.y, born: state.time });
              } else state.buffer.push("el");
              c.arrived += 1;
            },
          });
        }
        if (b.d <= 0 && c.arrived >= c.n) {
          if (b.where === "carry") { b.where = "ground"; b.d = 0; }
          state.hookY = approach(state.hookY, G - BH - 40, HOOK_V * 0.4 * dt);
          stepDone(dt, 1);
        }
      } else if (c.step === 3) {
        if (c.sent === 0) {
          const nb = state.buffer.length;
          state.buffer = [];
          for (let k = 0; k < nb; k += 1) {
            launch("el", cityPath, () => {
              popFx(CITY_X, G - 40, COL.light);
              state.packets.push({ kind: "light", rise: true, x: CITY_X + (Math.random() - 0.5) * 80, y: G - 60, born: state.time });
              state.litHold = 6;
              c.arrived += 1;
            }, k * 0.3);
          }
          c.sent = Math.max(1, nb);
          if (nb === 0) c.arrived = 1;
        }
        if (c.arrived >= c.sent) {
          c.step = 4; c.t = 0; showCaption();
        }
      } else if (c.step === 4) {
        stepDone(dt, 2.2);
      }
    }
  }

  function stepPackets(dt) {
    for (const p of state.packets) {
      if (p.rise) continue;
      if (p.morphTo && state.time >= p.morphAt && p.kind !== p.morphTo) {
        p.kind = p.morphTo;
        const [x, y] = polyAt(p.path(), p.s);
        popFx(x, y, COL[p.kind]);
      }
      if (p.morphAt && state.time >= p.morphAt && p.kind === "light") {
        p.kind = "el";
        popFx(p.px ?? polyAt(p.path(), 0)[0], p.py ?? polyAt(p.path(), 0)[1], COL.el);
      }
      if (p.hold) continue;
      p.s += PACK_V * dt;
      const pts = p.path();
      if (p.s >= polyLen(pts)) { p.done = true; if (p.onArrive) p.onArrive(p); }
    }
    for (const p of state.packets) if (p.rise && state.time - p.born > 1.6) p.done = true;
    state.packets = state.packets.filter((p) => !p.done);
    for (const f of state.fx) f.t += dt;
    state.fx = state.fx.filter((f) => f.t < 0.5);
  }

  function reset() {
    state.blocks = Array.from({ length: N }, () => ({ where: "ground", d: 0 }));
    state.trolleyX = 760;
    state.hookY = G - 260;
    state.cyc = null;
    state.packets = [];
    state.buffer = [];
    state.fx = [];
    state.epPrev = 0;
    state.eIn = 0;
    state.eOut = 0;
    state.heat = 0;
    state.night = 0;
    state.lit = 0;
    state.litHold = 0;
    state.done = "";
    setMode("pause");
    state.lastDir = "charge";
    capEl.hidden = true;
    hintEl.textContent = "Přepni věž na „nabíjet“.";
    hintEl.classList.remove("is-hidden");
    renderChain();
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

  const FONT = "'Fenomen Sans', system-ui, sans-serif";

  function drawSky() {
    const n = state.night;
    ctx.fillStyle = mixColor("#ffffe6", "#1e293b", n);
    ctx.fillRect(WORLD.x0, WORLD.y0, WORLD.x1 - WORLD.x0, WORLD.y1 - WORLD.y0);
    if (n > 0.05) {
      ctx.fillStyle = `rgba(255,255,255,${0.8 * n})`;
      for (let s = 0; s < 60; s += 1) {
        const x = WORLD.x0 + ((s * 389.7) % (WORLD.x1 - WORLD.x0));
        const y = WORLD.y0 + ((s * 211.3) % (G - 220 - WORLD.y0));
        ctx.beginPath(); ctx.arc(x, y, s % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    const sx = 130;
    const sy = mix(110, G + 80, n);
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
        ctx.moveTo(Math.cos(a) * 46, Math.sin(a) * 46);
        ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2);
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
    ctx.strokeStyle = mixColor("#64748b", "#94a3b8", n);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(TURB_X, G - 20); ctx.lineTo(TURB_X, CABLE_Y); ctx.lineTo(MAST_X, CABLE_Y);
    ctx.moveTo(PANEL_X, G - 30); ctx.lineTo(PANEL_X, CABLE_Y);
    ctx.moveTo(CITY_X, G - 40); ctx.lineTo(CITY_X, CABLE_Y);
    ctx.moveTo(MAST_X, CABLE_Y); ctx.lineTo(MAST_X, G);
    ctx.stroke();
  }

  function drawTurbine() {
    const x = TURB_X;
    const hubY = G - 290;
    // vítr (pohybová energie vzduchu)
    if (state.mode === "charge" && state.night < 0.5) {
      const c = state.cyc;
      const strong = c && c.dir === "charge" && c.step === 1;
      ctx.strokeStyle = `rgba(100, 116, 139, ${strong ? 0.6 : 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let k = 0; k < 4; k += 1) {
        const y = hubY - 70 + k * 45;
        const ph = ((state.time * 0.6 + k * 0.27) % 1);
        const x0 = WORLD.x0 + 10 + ph * 120;
        ctx.globalAlpha = Math.sin(ph * Math.PI);
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.bezierCurveTo(x0 + 20, y - 8, x0 + 40, y + 8, x0 + 60, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
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
    // sluneční paprsky na panely při výrobě
    const c = state.cyc;
    if (c && c.dir === "charge" && c.step === 1 && state.night < 0.5) {
      ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 9]);
      ctx.lineDashOffset = -state.time * 40;
      for (const [tx, ty] of [[176, G - 54], [238, G - 54]]) {
        ctx.beginPath(); ctx.moveTo(130 + (tx - 130) * 0.2, 110 + (ty - 110) * 0.2); ctx.lineTo(tx, ty); ctx.stroke();
      }
      ctx.setLineDash([]);
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
    if (lit > 0.05) {
      const gr = ctx.createRadialGradient(CITY_X, G - 60, 10, CITY_X, G - 60, 130);
      gr.addColorStop(0, `rgba(253, 224, 71, ${0.35 * lit})`);
      gr.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = gr;
      ctx.fillRect(CITY_X - 140, G - 200, 280, 200);
    }
  }

  function drawBlock(i) {
    const p = blockPos(i);
    const carried = state.blocks[i].where === "carry";
    const x0 = p.x - BW / 2;
    const y0 = p.y - BH;
    ctx.fillStyle = "#d4d4d8";
    rr(x0, y0, BW, BH, 3); ctx.fill();
    // růžová výplň = polohová energie bloku (podle výšky)
    const f = Math.max(0, Math.min(1, heightM(p.y) / 120));
    if (f > 0.001) {
      ctx.save();
      rr(x0, y0, BW, BH, 3); ctx.clip();
      ctx.fillStyle = "rgba(236, 72, 153, 0.45)";
      ctx.fillRect(x0, y0 + BH * (1 - f), BW, BH * f);
      ctx.restore();
    }
    rr(x0, y0, BW, BH, 3);
    ctx.strokeStyle = carried ? "#ec4899" : "#a1a1aa";
    ctx.lineWidth = carried ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = "#52525b";
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("35 t", p.x, y0 + BH / 2 + 1);
  }

  function badge(x, y, title, parts, active, align = "left") {
    ctx.save();
    ctx.globalAlpha = active ? 1 : 0.5;
    ctx.font = `600 14px ${FONT}`;
    const tw = ctx.measureText(title).width;
    ctx.font = `600 13px ${FONT}`;
    let pw = 0;
    for (const [t] of parts) pw += ctx.measureText(t).width;
    const w = Math.max(tw, pw) + 22;
    const h = 46;
    const bx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    rr(bx, y, w, h, 10); ctx.fill();
    ctx.lineWidth = active ? 3 : 1.5;
    ctx.strokeStyle = active ? "#f59e0b" : "#cbd5e1";
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#1e293b";
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(title, bx + 11, y + 19);
    ctx.font = `600 13px ${FONT}`;
    let cx = bx + 11;
    for (const [t, col] of parts) {
      ctx.fillStyle = col;
      ctx.fillText(t, cx, y + 37);
      cx += ctx.measureText(t).width;
    }
    ctx.restore();
  }

  function drawStations() {
    const c = state.cyc;
    const ch = c && c.dir === "charge";
    const dis = c && c.dir === "discharge";
    const T = { light: "#ca8a04", el: "#2563eb", kin: "#16a34a", pot: "#db2777", gray: "#64748b", heat: "#ea580c" };
    badge(160, G + 34, "Elektrárny", [["světelná", T.light], [" + ", T.gray], ["pohybová", T.kin], [" → ", T.gray], ["elektrická", T.el]], ch && c.step === 1, "center");
    if (state.lastDir === "charge") {
      badge(MAST_X - 22, JIB_Y + 62, "Motor", [["elektrická", T.el], [" → ", T.gray], ["pohybová", T.kin]], ch && c.step === 3, "right");
    } else {
      badge(MAST_X - 22, JIB_Y + 62, "Generátor", [["pohybová", T.kin], [" → ", T.gray], ["elektrická", T.el]], dis && c.step === 2, "right");
    }
    badge(CITY_X + 22, G + 34, "Město", [["elektrická", T.el], [" → ", T.gray], ["světelná, tepelná", T.light]], dis && c.step === 4, "center");
  }

  function drawTowerAndCrane() {
    ctx.fillStyle = "#a1a1aa";
    ctx.fillRect(STACK_X - 34, G - LAYER, 68, LAYER);
    ctx.fillStyle = "#8b8b93";
    ctx.fillRect(STACK_X - 34, G - LAYER, 68, 5);

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
    // elektrické vedení ve stožáru
    ctx.strokeStyle = mixColor("#64748b", "#94a3b8", state.night);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(MAST_X, G); ctx.lineTo(MAST_X, WINCH.y + 12); ctx.stroke();

    ctx.fillStyle = mixColor("#64748b", "#cbd5e1", state.night);
    ctx.strokeStyle = mixColor("#64748b", "#cbd5e1", state.night);
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1.5;
    for (let m = 12; m <= 132; m += 12) {
      const y = G - m * PX_M;
      ctx.beginPath(); ctx.moveTo(mx0 - 2, y); ctx.lineTo(mx0 - (m % 24 === 0 ? 10 : 6), y); ctx.stroke();
      if (m % 24 === 0) ctx.fillText(`${m} m`, mx0 - 13, y);
    }

    const apexY = JIB_Y - 74;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx0, top); ctx.lineTo(MAST_X, apexY); ctx.lineTo(mx1, top); ctx.stroke();
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(JIB_X0 + 6, JIB_Y); ctx.lineTo(MAST_X, apexY); ctx.lineTo(JIB_X1 - 120, JIB_Y); ctx.stroke();

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(JIB_X0, JIB_Y - 6, JIB_X1 - JIB_X0, 6);
    ctx.fillRect(JIB_X0, JIB_Y + 8, JIB_X1 - JIB_X0, 4);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = JIB_X0; x < JIB_X1 - 14; x += 14) { ctx.moveTo(x, JIB_Y + 8); ctx.lineTo(x + 7, JIB_Y); ctx.lineTo(x + 14, JIB_Y + 8); }
    ctx.stroke();
    ctx.fillStyle = "#71717a";
    ctx.fillRect(JIB_X0 + 4, JIB_Y + 12, 46, 40);

    // motor / generátor
    const c = state.cyc;
    const active = c && ((c.dir === "charge" && c.step === 3) || (c.dir === "discharge" && c.step === 2));
    const wx = WINCH.x - 26;
    const wy = WINCH.y - 16;
    ctx.fillStyle = "#334155";
    rr(wx, wy, 52, 32, 6); ctx.fill();
    ctx.save();
    ctx.translate(WINCH.x, WINCH.y);
    ctx.rotate(active ? state.time * (c.dir === "charge" ? 6 : -6) : 0);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = active ? "#fbbf24" : "#64748b"; ctx.fill();
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke();
    ctx.restore();

    if (state.losses && active) {
      ctx.strokeStyle = "rgba(249, 115, 22, 0.75)";
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k += 1) {
        const x0 = wx - 14 - k * 12;
        ctx.beginPath();
        for (let s = 0; s <= 1; s += 0.1) {
          const yy = wy + 30 - s * 40;
          const xx = x0 + Math.sin(s * 9 + state.time * 6 + k) * 3;
          if (s === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
    }

    for (let i = 0; i < N; i += 1) drawBlock(i);

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
  }

  // výška a polohová energie aktuálního bloku
  function drawBlockInfo() {
    const c = state.cyc;
    if (!c) return;
    const i = c.block;
    const p = blockPos(i);
    const h = heightM(p.y);
    if (h < 0.5 && !(c.dir === "charge" && c.step <= 3)) return;
    const lx = state.blocks[i].where === "tower" ? p.x + BW / 2 + 10 : p.x + BW / 2 + 8;
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 2;
    if (h > 0.5) {
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(lx, p.y); ctx.lineTo(lx, G); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(lx - 6, p.y); ctx.lineTo(lx + 6, p.y); ctx.moveTo(lx - 6, G); ctx.lineTo(lx + 6, G); ctx.stroke();
    }
    const l1 = `h = ${Math.round(h)} m`;
    const l2 = `Eₚ = ${fmt((M * g * Math.round(h)) / 1e6)} MJ`;
    ctx.font = `600 15px ${FONT}`;
    const tw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
    const ly = Math.min(G - 40, Math.max(p.y - BH / 2, (p.y + G) / 2));
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    rr(lx + 8, ly - 24, tw + 18, 48, 9); ctx.fill();
    ctx.strokeStyle = "#f9a8d4"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#475569";
    ctx.fillText(l1, lx + 17, ly - 10);
    ctx.fillStyle = "#be185d";
    ctx.fillText(l2, lx + 17, ly + 11);
  }

  function drawPacket(x, y, kind, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (kind === "light") {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      for (let r = 0; r < 8; r += 1) {
        const a = (r * Math.PI) / 4 + state.time;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (PR + 2), Math.sin(a) * (PR + 2)); ctx.lineTo(Math.cos(a) * (PR + 6), Math.sin(a) * (PR + 6)); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.arc(0, 0, PR, 0, Math.PI * 2);
    ctx.fillStyle = COL[kind];
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(15,23,42,0.35)";
    ctx.stroke();
    if (kind === "el") {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(1.5, -6.5); ctx.lineTo(-4, 1); ctx.lineTo(-0.5, 1); ctx.lineTo(-1.5, 6.5); ctx.lineTo(4, -1); ctx.lineTo(0.5, -1); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPackets() {
    // čekající u motoru / generátoru
    state.buffer.forEach((k, j) => { const [x, y] = bufferPos(j); drawPacket(x, y, k); });
    const c = state.cyc;
    for (const p of state.packets) {
      if (p.rise) {
        const a = (state.time - p.born) / 1.6;
        if (p.kind === "heat") {
          drawPacket(p.x + Math.sin(a * 12) * 4, p.y - a * 70, "heat", 1 - a);
        } else {
          drawPacket(p.x, p.y - a * 90, "light", 1 - a);
        }
        continue;
      }
      if (p.hold) {
        // vyrobené balíčky čekají u zdroje (vyskočí nahoru)
        const [x0, y0] = p.path()[0];
        const col = p.slot % 2;
        const row = Math.floor(p.slot / 2);
        const pop = Math.min(1, (state.time - p.born) / 0.3);
        const x = x0 - 18 + (row % 3) * 18 + (col === 0 ? 30 : 0);
        const y = y0 - 34 - Math.floor(row / 3) * 20 - pop * 6;
        void col;
        p.px = x; p.py = y;
        drawPacket(x, y, p.kind, pop);
        continue;
      }
      if (p.s < 0) {
        if (p.px != null) drawPacket(p.px, p.py, p.kind);
        continue;
      }
      const pts = p.path();
      if (p.px != null && p.s < 40) {
        // plynulý přechod z místa čekání do kabelu
        const [x1, y1] = polyAt(pts, p.s);
        const t = p.s / 40;
        drawPacket(mix(p.px, x1, t), mix(p.py, y1, t), p.kind);
        continue;
      }
      const [x, y] = polyAt(pts, p.s);
      drawPacket(x, y, p.kind);
    }
    for (const f of state.fx) {
      const a = f.t / 0.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, PR + a * 22, 0, Math.PI * 2);
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - a;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    void c;
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
    drawStations();
    drawBlockInfo();
    drawPackets();
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
      // krok → zvýrazněné prvky [kroky, šipky]
      map: { 1: [[0, 1], [0]], 2: [[1], []], 3: [[2, 3], [1, 2]], 4: [[3], []] },
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
      map: { 1: [[0], []], 2: [[0, 1, 2], [0, 1]], 3: [[2], []], 4: [[3], [2]] },
    },
  };

  function renderChain() {
    const c = CHAIN[state.lastDir];
    $("chainLabel").textContent = c.label;
    const cur = state.cyc && state.cyc.dir === state.lastDir ? c.map[state.cyc.step] : [[], []];
    c.steps.forEach(([cls, title, sub], j) => {
      const el = $(`st${j + 1}`);
      el.className = `pe-step ${cls}${cur[0].includes(j) ? " is-current" : ""}`;
      el.innerHTML = `<b>${title}</b><small>${sub}</small>`;
    });
    c.arrows.forEach((t, j) => {
      const el = $(`ar${j + 1}`);
      el.className = `pe-arrow${cur[1].includes(j) ? " is-current" : ""}`;
      const heat = j === c.heatAt ? ` <span class="pe-heat"${state.losses ? "" : " hidden"}>+ teplo</span>` : "";
      el.innerHTML = `<span>${t}</span>${heat}`;
    });
  }

  function updatePanel() {
    const nTop = state.blocks.filter((b) => b.where === "tower").length;
    $("nTop").textContent = `${nTop} z ${N}`;
    $("epTotal").textContent = MJ(epTotal());
    const f = $("formula");
    const c = state.cyc;
    if (c && state.blocks[c.block].where === "carry") {
      const h = Math.round(heightM(blockPos(c.block).y));
      const e = M * g * h;
      f.innerHTML = `blok na laně: <i class="qty">E</i><sub>p</sub> = <i class="qty">m</i> · <i class="qty">g</i> · <i class="qty">h</i> = 35 000 kg · 10 N/kg · ${h} m = <b>${MJ(e)}</b>`;
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
    if (state.mode !== "pause") {
      state.time += dt;
      stepCycle(dt);
      stepPackets(dt);
    }

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

    const nightTarget = state.mode === "discharge" ? 1 : state.mode === "charge" ? 0 : state.night;
    state.night += (nightTarget - state.night) * Math.min(1, dt / 0.8);
    if (state.mode !== "pause") state.litHold = Math.max(0, state.litHold - dt);
    const litTarget = state.litHold > 0 ? 1 : 0;
    state.lit += (litTarget - state.lit) * Math.min(1, dt / 0.5);
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
    const prev = state.mode;
    state.mode = m;
    modeBtns.forEach((b) => {
      const on = b.dataset.mode === m;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (m === "pause") return;
    hintEl.classList.add("is-hidden");
    const dirChanged = state.lastDir !== m;
    state.lastDir = m;
    if (!state.cyc || state.cyc.dir !== m) {
      state.done = "";
      if (!startCycle(m)) finish();
    } else if (prev === "pause") {
      showCaption();
    }
    if (dirChanged) renderChain();
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

  const runBtns = document.querySelectorAll("[data-run]");
  runBtns.forEach((b) => b.addEventListener("click", () => {
    state.stepMode = b.dataset.run === "steps";
    runBtns.forEach((o) => {
      const on = o === b;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-pressed", String(on));
    });
    if (!state.stepMode && state.cyc && state.cyc.waiting) nextStep();
  }));

  capNext.addEventListener("click", () => nextStep());
  $("btnReset").addEventListener("click", reset);

  window.addEventListener("resize", resize);
  resize();
  reset();
  updatePanel();
  requestAnimationFrame(frame);

  window.__pe = { state, epTotal, setMode, nextStep };
})();
