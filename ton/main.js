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
    wave: "square",     // square | sine
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

  // skutečná frekvence periodického signálu:
  // sinus – f celých kmitů za sekundu; obdélník – f pohybů blány za sekundu (f/2 period)
  const rateOf = (f) => (state.wave === "square" ? f / 2 : f);

  // housle: smyčcem rozechvěná struna kmitá zhruba jako „pila“ (Helmholtzův pohyb),
  // ozvučnice zesílí některé vyšší harmonické – tón je složený z mnoha sinusovek
  const VIOLIN_W = [1, 0.85, 1.0, 0.9, 0.75, 0.7, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05];
  const VIOLIN_B = VIOLIN_W.map((w, i) => w / (i + 1));
  const VIOLIN_TABLE = (() => {
    const N = 1024;
    const raw = new Float32Array(N);
    for (let i = 0; i < N; i += 1) {
      let v = 0;
      VIOLIN_B.forEach((b, h) => { v += b * Math.sin((2 * Math.PI * (h + 1) * i) / N); });
      raw[i] = v;
    }
    let lo = Infinity; let hi = -Infinity; let iMin = 0;
    raw.forEach((v, i) => { if (v < lo) { lo = v; iMin = i; } if (v > hi) hi = v; });
    // posun, aby křivka začínala dole (jako ostatní tvary)
    const t = new Float32Array(N);
    for (let i = 0; i < N; i += 1) t[i] = (raw[(i + iMin) % N] - lo) / (hi - lo);
    return t;
  })();
  function violinVal(phase) {
    const N = VIOLIN_TABLE.length;
    const x = (((phase % 1) + 1) % 1) * N;
    const i = Math.floor(x);
    const fr = x - i;
    return VIOLIN_TABLE[i % N] * (1 - fr) + VIOLIN_TABLE[(i + 1) % N] * fr;
  }
  // sinus je při stejné amplitudě mnohem tišší než obdélník – dostane víc hlasitosti
  const volOf = (f) => (f > 0 ? ({ sine: 0.35, square: 0.09, violin: 0.16 })[state.wave] : 0);

  // upozornění: sinus nízké frekvence ucho (a malé reproduktory) neslyší
  function updateSoundNote() {
    const show = state.sound && state.wave === "sine" && state.f > 0 && state.f < 60;
    if (show) {
      hintEl.textContent = "Sinus s tak nízkou frekvencí skoro neuslyšíš – zkus aspoň 200 Hz.";
      hintEl.classList.remove("is-hidden");
      hintEl.dataset.note = "1";
    } else if (hintEl.dataset.note) {
      hintEl.classList.add("is-hidden");
      delete hintEl.dataset.note;
    }
  }

  /* ---------- Zvuk (Web Audio) ---------- */
  let actx = null;
  let osc = null;
  let gain = null;
  let lfo = null;
  let lfoGain = null;
  function applyWave() {
    if (!osc) return;
    if (state.wave === "violin") {
      const real = new Float32Array(VIOLIN_B.length + 1);
      const imag = new Float32Array(VIOLIN_B.length + 1);
      VIOLIN_B.forEach((b, i) => { imag[i + 1] = b; });
      osc.setPeriodicWave(actx.createPeriodicWave(real, imag));
    } else {
      osc.type = state.wave;
    }
    if (lfoGain) lfoGain.gain.setTargetAtTime(state.wave === "violin" ? 12 : 0, actx.currentTime, 0.05);
  }
  function soundOn() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    if (osc) return;
    osc = actx.createOscillator();
    applyWave();
    // vibrato (u houslí)
    lfo = actx.createOscillator();
    lfo.frequency.value = 5.5;
    lfoGain = actx.createGain();
    lfoGain.gain.value = state.wave === "violin" ? 12 : 0;
    lfo.connect(lfoGain).connect(osc.detune);
    lfo.start();
    osc.frequency.value = rateOf(state.f);
    gain = actx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(volOf(state.f), actx.currentTime, 0.02);
    osc.connect(gain).connect(actx.destination);
    osc.start();
  }
  function soundOff() {
    if (!osc) return;
    const o = osc;
    const gn = gain;
    gn.gain.setTargetAtTime(0, actx.currentTime, 0.02);
    const l = lfo;
    setTimeout(() => { try { o.stop(); o.disconnect(); gn.disconnect(); l.stop(); l.disconnect(); } catch (_) { /* hotovo */ } }, 200);
    osc = null;
    gain = null;
    lfo = null;
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
      if (f > 0) osc.frequency.setTargetAtTime(rateOf(f), actx.currentTime, 0.005);
      gain.gain.setTargetAtTime(volOf(f), actx.currentTime, 0.01);
    }
    timeLabel.textContent = `šířka obrazovky: ${fmtTime(windowFor(f))}`;
    updateSoundNote();
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
    updateSoundNote();
  }
  soundBtn.addEventListener("click", toggleSound);
  soundBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSound(); }
  });

  /* ---------- Tvar signálu ---------- */
  const waveBtns = document.querySelectorAll("[data-wave]");
  waveBtns.forEach((b) => b.addEventListener("click", () => {
    hideHint();
    state.wave = b.dataset.wave;
    waveBtns.forEach((o) => {
      const on = o === b;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-pressed", String(on));
    });
    if (osc) {
      applyWave();
      if (state.f > 0) osc.frequency.setTargetAtTime(rateOf(state.f), actx.currentTime, 0.005);
      gain.gain.setTargetAtTime(volOf(state.f), actx.currentTime, 0.01);
    }
    updateSoundNote();
    lastD = "";
    drawTrace();
  }));

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
      const n = Tw * rateOf(f);      // počet period na obrazovce
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
      if (state.wave === "violin") {
        const steps = Math.min(6000, Math.max(400, Math.ceil(n * 90)));
        d = "";
        for (let i = 0; i <= steps; i += 1) {
          const u = i / steps;
          const y = Y_LOW - violinVal(n * u) * (Y_LOW - Y_HIGH);
          d += `${i ? "L" : "M"}${(SX0 + u * W).toFixed(2)} ${y.toFixed(2)}`;
        }
      } else if (state.wave === "sine") {
        // sinusovka se stejnými průchody středem jako obdélník (začíná dole)
        const yMid = (Y_HIGH + Y_LOW) / 2;
        const A = (Y_LOW - Y_HIGH) / 2;
        const steps = Math.min(4000, Math.max(200, Math.ceil(n * 40)));
        d = "";
        for (let i = 0; i <= steps; i += 1) {
          const u = i / steps;
          const y = yMid + A * Math.cos(2 * Math.PI * n * u);
          d += `${i ? "L" : "M"}${(SX0 + u * W).toFixed(2)} ${y.toFixed(2)}`;
        }
      } else {
      let x = SX0 + half / 2;
      while (n > 0 && x < SX1 - 0.01) {
        d += `L${x.toFixed(1)} ${yOf(lv)}`;
        lv = 1 - lv;
        d += `L${x.toFixed(1)} ${yOf(lv)}`;
        x += half;
      }
      d += `L${SX1} ${yOf(lv)}`;
      }
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
    const rate = rateOf(f);
    const p1 = p0 + rate * dt;
    // hrany jsou ve fázi 0,25 + k/2 (stejně jako na obrazovce: začíná se dole)
    for (let k = Math.floor((p0 - 0.25) * 2) + 1; k <= Math.floor((p1 - 0.25) * 2); k += 1) {
      const te = t0 + (0.25 + k / 2 - p0) / rate;
      const lv = k % 2 === 0 ? 1 : 0;      // sudé k = náběžná hrana
      state.edges.push({ t: te, level: lv });
      // obdélník: vlna při každém pohybu blány; sinus: vlna při každém vyklenutí ven
      if (f <= 6 && (state.wave === "square" || lv === 1)) spawnRing();
    }
    state.phase = p1 % 1000;
    if (state.edges.length > 400) state.edges.splice(0, state.edges.length - 400);
    const q = (((p1 - 0.25) % 1) + 1) % 1;
    state.level = f > 0 ? (q < 0.5 ? 1 : 0) : 0;
    state.sineM = f > 0 ? 0.5 - 0.5 * Math.cos(2 * Math.PI * p1) : 0;

    // vlny při vyšší frekvenci – nejvýš 6 za sekundu (skutečných je víc)
    if (f > 6) {
      state.ringClock += dt;
      if (state.ringClock >= 1 / 6) { state.ringClock = 0; spawnRing(); }
    }

    // membrána
    if (f <= 12) {
      if (state.wave === "sine") state.m = state.sineM;
      else if (state.wave === "violin") state.m = violinVal(p1);
      else state.m += (state.level - state.m) * Math.min(1, dt / 0.025);
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
