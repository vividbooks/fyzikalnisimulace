/* Tón – generátor obdélníkového signálu a reproduktor */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  const F_MIN = 0;
  const ZERO_ZONE = 20; // začátek posuvníku = 0 Hz
  const F_MAX = 2000;
  const LOG_MAX = Math.log10(F_MAX);

  // obrazovka generátoru (souřadnice scény)
  const SX0 = 36.8;
  const SX1 = 529.3;
  const Y_HIGH = 67.9;
  const Y_LOW = 159.45;
  const WINDOWS = [5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002];

  // membrána a vlny
  const DOME_TRAVEL = 39;      // posun středu membrány (z animace)
  const RIM = { x: 283.792, y: 320.1, rx: 179.33, ry: 72.536 };
  const RING_LIFE = 0.9;

  const trace = $("trace");
  const timeLabel = $("timeLabel");
  const dome = $("dome");
  const domeGhost = $("domeGhost");
  const ringsG = $("rings");
  const hintEl = $("hintEl");

  const state = {
    f: 5,
    phase: 0,
    level: 1,
    edges: [],          // { t, level } – změny signálu
    time: 0,
    m: 1,               // poloha membrány 0 (dovnitř) … 1 (ven)
    rings: [],
    ringClock: 0,
    sound: false,
    running: false,
  };

  /* ---------- Pomocné ---------- */
  const fmt = (v, d) => v.toLocaleString("cs-CZ", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtF = (f) => f.toLocaleString("cs-CZ");
  function fmtTime(s) {
    if (s >= 1) return `${fmt(s, s % 1 ? 1 : 0)} s`;
    const ms = s * 1000;
    if (ms >= 10) return `${fmt(ms, ms % 1 ? 1 : 0)} ms`;
    return `${fmt(ms, ms < 1 ? 3 : 2).replace(/0+$/, "").replace(/,$/, "")} ms`;
  }
  const fromSlider = (v) => (v <= ZERO_ZONE ? 0 : Math.max(1, Math.min(F_MAX, Math.round(10 ** (((v - ZERO_ZONE) / (1000 - ZERO_ZONE)) * LOG_MAX)))));
  const toSlider = (f) => (f <= 0 ? 0 : Math.round(ZERO_ZONE + (Math.log10(f) / LOG_MAX) * (1000 - ZERO_ZONE)));
  const stepOf = (f) => (f < 20 ? 1 : f < 200 ? 5 : 50);
  // šířka obrazovky je vždy 1 s
  const windowFor = () => 1;
  void WINDOWS;

  /* ---------- Zvuk (Web Audio) ---------- */
  let actx = null;
  let osc = null;
  let gain = null;
  function soundOn() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    if (osc) return;
    osc = actx.createOscillator();
    osc.type = "square";
    osc.frequency.value = state.f / 2;
    gain = actx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(state.f > 0 ? 0.09 : 0, actx.currentTime, 0.02);
    osc.connect(gain).connect(actx.destination);
    osc.start();
  }
  function soundOff() {
    if (!osc) return;
    const o = osc;
    const gn = gain;
    gn.gain.setTargetAtTime(0, actx.currentTime, 0.02);
    setTimeout(() => { try { o.stop(); o.disconnect(); gn.disconnect(); } catch (_) { /* hotovo */ } }, 200);
    osc = null;
    gain = null;
  }

  /* ---------- Nastavení frekvence ---------- */
  function setF(f, fromSliderInput = false) {
    f = Math.max(F_MIN, Math.min(F_MAX, Math.round(f)));
    // změní-li se šířka obrazovky, začne se kreslit znovu (jinak by se míchaly staré kmity)
    if (windowFor(f) !== windowFor(state.f)) { state.edges = []; state.tStart = state.time; }
    state.f = f;
    if (!fromSliderInput) $("fSlider").value = String(toSlider(f));
    $("fVal").textContent = fmtF(f);
    $("perSec").textContent = fmtF(f);
    $("period").textContent = f > 0 ? fmtTime(1 / f) : "–";
    $("fStepLabel").textContent = `po ${fmtF(stepOf(f))} Hz`;
    document.querySelectorAll(".ton-preset").forEach((b) => b.classList.toggle("is-active", Number(b.dataset.f) === f));
    if (osc) {
      if (f > 0) osc.frequency.setTargetAtTime(f / 2, actx.currentTime, 0.005);
      gain.gain.setTargetAtTime(f > 0 ? 0.09 : 0, actx.currentTime, 0.01);
    }
    timeLabel.textContent = `šířka obrazovky: ${fmtTime(windowFor(f))}`;
  }

  function hideHint() { hintEl.classList.add("is-hidden"); }

  $("fSlider").addEventListener("input", (e) => { hideHint(); setF(fromSlider(Number(e.target.value)), true); });
  $("fMinus").addEventListener("click", () => { hideHint(); setF(state.f - stepOf(state.f - 1)); });
  $("fPlus").addEventListener("click", () => { hideHint(); setF(state.f + stepOf(state.f)); });
  document.querySelectorAll(".ton-preset").forEach((b) => b.addEventListener("click", () => { hideHint(); setF(Number(b.dataset.f)); }));

  const soundBtn = $("soundBtn");
  function toggleSound() {
    hideHint();
    state.sound = !state.sound;
    soundBtn.classList.toggle("is-on", state.sound);
    soundBtn.setAttribute("aria-pressed", String(state.sound));
    soundBtn.setAttribute("aria-label", state.sound ? "Vypnout zvuk reproduktoru" : "Zapnout zvuk reproduktoru");
    $("soundWaves").style.display = state.sound ? "" : "none";
    $("soundMute").style.display = state.sound ? "none" : "";
    if (state.sound && state.running) soundOn(); else soundOff();
  }
  soundBtn.addEventListener("click", toggleSound);
  soundBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSound(); }
  });

  /* ---------- Spustit / zastavit ---------- */
  const PLAY = "M8 5.14v13.72L19 12 8 5.14z";
  const STOP = "M6 6h12v12H6z";
  function setRunning(on) {
    state.running = on;
    const btn = $("btnRun");
    btn.classList.toggle("action-btn--run", !on);
    btn.classList.toggle("action-btn--stop", on);
    btn.setAttribute("aria-pressed", String(on));
    $("runText").textContent = on ? "Zastavit" : "Spustit";
    $("runIcon").setAttribute("d", on ? STOP : PLAY);
    if (on && state.sound) soundOn(); else soundOff();
  }
  $("btnRun").addEventListener("click", () => { hideHint(); setRunning(!state.running); });

  /* ---------- Vlny ---------- */
  function spawnRing() {
    const el = document.createElementNS(NS, "ellipse");
    el.setAttribute("cx", RIM.x);
    el.setAttribute("cy", RIM.y);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "#55a0ff");
    ringsG.appendChild(el);
    state.rings.push({ el, t: 0 });
  }
  function stepRings(dt) {
    for (const r of state.rings) {
      r.t += dt;
      const a = Math.min(1, r.t / RING_LIFE);
      const k = 1 + 0.5 * (1 - (1 - a) * (1 - a));
      const op = a < 0.15 ? (a / 0.15) * 0.65 : 0.65 * (1 - (a - 0.15) / 0.85);
      r.el.setAttribute("rx", (RIM.rx * k).toFixed(1));
      r.el.setAttribute("ry", (RIM.ry * k).toFixed(1));
      r.el.setAttribute("stroke-width", (11 * (1.15 - a * 0.4)).toFixed(1));
      r.el.setAttribute("opacity", Math.max(0, op).toFixed(3));
    }
    state.rings = state.rings.filter((r) => {
      if (r.t >= RING_LIFE) { r.el.remove(); return false; }
      return true;
    });
  }

  /* ---------- Obrazovka ---------- */
  let lastD = "";
  function drawTrace() {
    const f = state.f;
    const Tw = windowFor(f);
    const W = SX1 - SX0;
    const yOf = (lv) => (lv ? Y_HIGH : Y_LOW);
    let d = "";
    if (false) { // dřívější „běžící“ zobrazení – křivka teď stojí vždy
      // běží v reálném čase: vpravo je „teď“
      const t1 = state.time;
      const t0 = t1 - Tw;
      const xs = (t) => SX0 + ((t - t0) / Tw) * W;
      const inWin = state.edges.filter((e) => e.t > t0 && e.t <= t1);
      const before = state.edges.filter((e) => e.t <= t0);
      let lv = before.length ? before[before.length - 1].level : (inWin.length ? 1 - inWin[0].level : state.level);
      // na začátku se křivka teprve vykresluje (vlevo je obrazovka prázdná)
      const x = xs(Math.max(t0, state.tStart));
      d = `M${x.toFixed(1)} ${yOf(lv)}`;
      for (const e of inWin) {
        const xe = xs(e.t);
        d += `L${xe.toFixed(1)} ${yOf(lv)}L${xe.toFixed(1)} ${yOf(e.level)}`;
        lv = e.level;
      }
      d += `L${SX1} ${yOf(lv)}`;
    } else {
      // křivka stojí (jako zastavený obraz na osciloskopu)
      const n = (Tw * f) / 2;        // na obrazovce je f pohybů blány
      // začátek i konec vlevo a vpravo jsou dole; uprostřed je přesně n celých kmitů
      // (dole čtvrt periody, pak střídavě půl periody nahoře a dole, nakonec čtvrt periody dole)
      let lv = 0;
      d = `M${SX0} ${Y_LOW}`;
      const half = W / (2 * n);          // úsek mezi dvěma pohyby blány
      if (half < 1) {
        // kmitů je tolik, že čáry splynou v plochu
        d = `M${SX0} ${Y_LOW}L${SX0} ${Y_HIGH}L${SX1} ${Y_HIGH}L${SX1} ${Y_LOW}Z`;
        trace.setAttribute("stroke-width", "1");
        if (d !== lastD) { trace.setAttribute("d", d); trace.setAttribute("fill", "rgba(0, 229, 97, 0.55)"); lastD = d; }
        return;
      }
      let x = SX0 + half / 2;
      while (n > 0 && x < SX1 - 0.01) {
        d += `L${x.toFixed(1)} ${yOf(lv)}`;
        lv = 1 - lv;
        d += `L${x.toFixed(1)} ${yOf(lv)}`;
        x += half;
      }
      d += `L${SX1} ${yOf(lv)}`;
    }
    // od 70 Hz se čára ztenčuje, aby jednotlivé kmity zůstaly rozlišitelné
    const sw = f <= 70 ? 3 : Math.max(0.35, Math.min((3 * 70) / f, (W / f) * 0.45));
    trace.setAttribute("stroke-width", sw.toFixed(2));
    if (d !== lastD) { trace.setAttribute("d", d); trace.setAttribute("fill", "none"); lastD = d; }
  }

  /* ---------- Smyčka ---------- */
  let last = null;
  function frame(t) {
    const dt = last == null ? 1 / 60 : Math.min(0.05, (t - last) / 1000);
    last = t;
    const f = state.f;
    stepRings(dt);
    if (!state.running) {
      // generátor stojí: obraz na obrazovce zůstane, membrána se vrátí do klidu
      state.m += (0 - state.m) * Math.min(1, dt / 0.05);
      dome.setAttribute("transform", `translate(0 ${(DOME_TRAVEL * (1 - state.m)).toFixed(2)})`);
      dome.setAttribute("opacity", "1");
      domeGhost.setAttribute("opacity", "0");
      drawTrace();
      requestAnimationFrame(frame);
      return;
    }
    const t0 = state.time;
    state.time += dt;

    // fáze signálu a změny úrovně (přesné časy hran)
    const p0 = state.phase;
    const p1 = p0 + (f / 2) * dt;          // f pohybů blány za sekundu = f/2 period obdélníku
    for (let k = Math.floor(p0 * 2) + 1; k <= Math.floor(p1 * 2); k += 1) {
      const te = t0 + (k / 2 - p0) / (f / 2);
      const lv = k % 2 === 0 ? 1 : 0;      // celé číslo fáze = náběžná hrana
      state.edges.push({ t: te, level: lv });
      if (f <= 6) spawnRing();             // každý pohyb blány = jedna vlna
    }
    state.phase = p1 % 1000;
    if (state.edges.length > 400) state.edges.splice(0, state.edges.length - 400);
    state.level = f > 0 ? ((p1 % 1) < 0.5 ? 1 : 0) : 0;

    // vlny při vyšší frekvenci – nejvýš 6 za sekundu (skutečných je víc)
    if (f > 6) {
      state.ringClock += dt;
      if (state.ringClock >= 1 / 6) { state.ringClock = 0; spawnRing(); }
    }

    // membrána
    if (f <= 12) {
      state.m += (state.level - state.m) * Math.min(1, dt / 0.025);
      dome.setAttribute("transform", `translate(0 ${(DOME_TRAVEL * (1 - state.m)).toFixed(2)})`);
      dome.setAttribute("opacity", "1");
      domeGhost.setAttribute("opacity", "0");
    } else {
      // kmitá příliš rychle: ukážeme obě krajní polohy
      dome.setAttribute("transform", "translate(0 0)");
      dome.setAttribute("opacity", "0.6");
      domeGhost.setAttribute("transform", `translate(0 ${DOME_TRAVEL})`);
      domeGhost.setAttribute("opacity", "0.6");
    }

    drawTrace();
    requestAnimationFrame(frame);
  }

  state.tStart = 0;
  setF(5);
  requestAnimationFrame(frame);

  window.__ton = { state, setF };
})();
