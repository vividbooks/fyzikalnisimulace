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
    manual: false,       // ruční ovládání blány
    manualLevel: 0,
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

  // housle: tvar jedné periody podle předlohy (osciloskop) – nepravidelné hroty nahoru a dolů,
  // struna rozechvěná smyčcem + ozvučnice dávají složený signál z mnoha harmonických
  // [x, y] – x roste zleva doprava (perioda 65,4), y dolů kladné, klidová čára ≈ 2,45
  const VIOLIN_PTS = [
    [-32.67, 2.45], [-30.91, 10.42], [-29.36, 10.45], [-27.49, 2.15], [-26.41, -5.6], [-24.65, -5.6],
    [-23.51, 2.94], [-22.29, 31.63], [-20.37, 31.68], [-18.97, 2.47], [-16.66, -39.43], [-14.74, -39.23],
    [-13.18, 2.83], [-12.28, 10.89], [-10.41, 10.38], [-9.94, 2.24], [-7.95, 2.83], [-6.5, 11.62],
    [-4.79, 11.58], [-3.32, 1.99], [-1.68, -27.28], [0.23, -27.1], [1.38, 2.47], [2.31, 36.81],
    [4.23, 37.1], [4.96, 23.86], [6.39, 2.47], [8.29, -24.83], [10.19, -24.74], [11.87, 2.77],
    [13.31, 14.14], [15.12, 14.01], [16.44, 2.31], [18.15, -8.95], [19.93, -8.59], [21.15, 2.68],
    [22.12, 17.65], [24.02, 17.65], [25.0, 2.47], [26.02, -12.46], [27.87, -12.93], [29.45, 0.42],
    [30.35, 2.446], [32.71, 2.446],
  ];
  const VIOLIN_TABLE = (() => {
    const N = 1024;
    const x0 = VIOLIN_PTS[0][0];
    const P = VIOLIN_PTS[VIOLIN_PTS.length - 1][0] - x0;
    const ys = VIOLIN_PTS.map((p) => p[1]);
    const lo = Math.min(...ys); const hi = Math.max(...ys);
    const t = new Float32Array(N);
    let k = 0;
    for (let i = 0; i < N; i += 1) {
      const x = x0 + (i / N) * P;
      while (k < VIOLIN_PTS.length - 2 && VIOLIN_PTS[k + 1][0] < x) k += 1;
      const [xa, ya] = VIOLIN_PTS[k]; const [xb, yb] = VIOLIN_PTS[k + 1];
      const y = ya + ((yb - ya) * (x - xa)) / (xb - xa);
      t[i] = (hi - y) / (hi - lo); // 1 = nahoře
    }
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
  const volOf = (f) => (f > 0 ? ({ sine: 0.35, square: 0.09, violin: 0.12 })[state.wave] : 0);

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
  let voice = null;   // { oscs, gain, stopables, nodes }

  const noiseBufs = new WeakMap();
  function getNoise(ctx) {
    if (noiseBufs.has(ctx)) return noiseBufs.get(ctx);
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(ctx, buf);
    return buf;
  }
  // dozvuk místnosti – uměle vytvořená odezva (doznívající šum), housle pak nezní „nasucho“
  const reverbBufs = new WeakMap();
  function getReverb(ctx) {
    if (reverbBufs.has(ctx)) return reverbBufs.get(ctx);
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.8);
    const buf = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch += 1) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i += 1) {
        const tt = i / sr;
        lp += 0.35 * ((Math.random() * 2 - 1) - lp); // trochu ztlumené výšky
        d[i] = lp * Math.exp(-tt / 0.38) * Math.min(1, tt / 0.012);
      }
    }
    reverbBufs.set(ctx, buf);
    return buf;
  }

  // housle: fyzikální model struny rozechvěné smyčcem (digitální vlnovod podle STK „Bowed“).
  // Struna je modelovaná jako dvě zpožďovací linky (smyčec–kobylka a smyčec–prstoklad), ve kterých
  // běhají vlny. Smyčec strunu střídavě „chytí“ a „pustí“ (tření) – vzniká Helmholtzův pohyb.
  const BOWED_SRC = `
  class BowedString extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [{ name: "frequency", defaultValue: 440, minValue: 1, maxValue: 5000, automationRate: "k-rate" }];
    }
    constructor() {
      super();
      const L = Math.ceil(sampleRate) + 16;
      this.neck = new Float32Array(L); this.bridge = new Float32Array(L);
      this.L = L; this.w = 0;
      this.neckOut = 0; this.bridgeOut = 0; this.sf = 0;
      this.t = 0; this.alive = true; this.release = -1;
      this.jv = 0; this.jp = 0; this.jf = 0;
      this.port.onmessage = (e) => { if (e.data === "stop") this.release = this.t; };
    }
    read(buf, d) {
      let p = this.w - d; while (p < 0) p += this.L;
      const i = Math.floor(p); const fr = p - i;
      return buf[i % this.L] * (1 - fr) + buf[(i + 1) % this.L] * fr;
    }
    process(inputs, outputs, params) {
      const out = outputs[0][0];
      const sr = sampleRate; const dt = 1 / sr;
      const f = params.frequency[0];
      const base = Math.max(4, sr / f - (1.5 - 0.00012 * f));
      const beta = Math.max(0.18, 6 / base);
      const pole = 0.75 - 0.2 * 22050 / sr;
      for (let n = 0; n < out.length; n += 1) {
        const t = this.t;
        // smyčec: náběh, drobné kolísání rychlosti a přítlaku (ruka není stroj)
        this.jv += 0.0004 * ((Math.random() * 2 - 1) - this.jv);
        this.jp += 0.0003 * ((Math.random() * 2 - 1) - this.jp);
        this.jf += 0.0002 * ((Math.random() * 2 - 1) - this.jf);
        let env = Math.min(1, t / 0.09);
        if (this.release >= 0) env *= Math.max(0, 1 - (t - this.release) / 0.08);
        const bowV = (0.19 + 0.5 * this.jv) * env;
        const pressure = 1.15 + 1.2 * this.jp + 0.25 * Math.max(0, 1 - t / 0.12);
        const slope = 5 - 4 * pressure;
        // vibrato začne chvíli po nasazení
        const vd = 0.0055 * Math.min(1, Math.max(0, (t - 0.3) / 0.6));
        const vib = vd * Math.sin(2 * Math.PI * 5.4 * t) + 0.25 * this.jf * 0.004;
        const neckLen = base * (1 - beta) + base * vib;
        const bridgeLen = base * beta;
        // odraz na kobylce (s útlumem vyšších frekvencí) a na prstokladu
        this.sf = 0.95 * ((1 - pole) * this.bridgeOut + pole * this.sf);
        const bridgeRefl = -this.sf;
        const nutRefl = -this.neckOut;
        const stringV = bridgeRefl + nutRefl;
        const dv = bowV - stringV;
        let bt = Math.pow(Math.abs((dv + 0.001) * slope) + 0.75, -4);
        bt = Math.min(1, Math.max(0.01, bt));
        const nv = dv * bt;
        this.neck[this.w] = bridgeRefl + nv;
        this.bridge[this.w] = nutRefl + nv;
        this.w = (this.w + 1) % this.L;
        this.neckOut = this.read(this.neck, neckLen);
        this.bridgeOut = this.read(this.bridge, bridgeLen);
        out[n] = this.bridgeOut;
        this.t += dt;
      }
      for (let c = 1; c < outputs[0].length; c += 1) outputs[0][c].set(out);
      return !(this.release >= 0 && this.t - this.release > 0.2);
    }
  }
  registerProcessor("bowed-string", BowedString);
  `;
  const workletReady = new WeakMap();
  function ensureBowed(ctx) {
    if (!workletReady.has(ctx)) {
      const url = URL.createObjectURL(new Blob([BOWED_SRC], { type: "application/javascript" }));
      workletReady.set(ctx, ctx.audioWorklet ? ctx.audioWorklet.addModule(url) : Promise.reject(new Error("no worklet")));
    }
    return workletReady.get(ctx);
  }

  // ozvučnice houslí – rezonance dřevěného těla
  const VIOLIN_BODY = [
    { type: "highpass", f: 190, Q: 0.7 },
    { type: "peaking", f: 280, Q: 4, g: 6 },     // vzduchová rezonance (A0)
    { type: "peaking", f: 460, Q: 3, g: 5 },     // tělo (B1−)
    { type: "peaking", f: 580, Q: 3, g: 3 },     // tělo (B1+)
    { type: "peaking", f: 1100, Q: 2, g: -3 },
    { type: "peaking", f: 1600, Q: 1.5, g: -4 }, // méně „nosový“ tón
    { type: "peaking", f: 2600, Q: 1.4, g: 6 },  // „můstková“ oblast
    { type: "peaking", f: 3500, Q: 2, g: 3 },
    { type: "lowpass", f: 7000, Q: 0 },
  ];
  function buildViolin(out, freq, ctx = actx) {
    const t = ctx.currentTime;
    const nodes = [];
    const stopables = [];
    const input = ctx.createGain();
    input.gain.value = 1.3;
    let node = input;
    nodes.push(input);
    VIOLIN_BODY.forEach((flt) => {
      const bq = ctx.createBiquadFilter();
      bq.type = flt.type; bq.frequency.value = flt.f; bq.Q.value = flt.Q;
      if (flt.g !== undefined) bq.gain.value = flt.g;
      node = node.connect(bq);
      nodes.push(bq);
    });
    const dry = ctx.createGain(); dry.gain.value = 1;
    node.connect(dry);
    nodes.push(dry);
    // jemný šum žíní smyčce
    const ns = ctx.createBufferSource(); ns.buffer = getNoise(ctx); ns.loop = true;
    const nbp = ctx.createBiquadFilter(); nbp.type = "bandpass"; nbp.frequency.value = 3000; nbp.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.03, t); ng.gain.setTargetAtTime(0.006, t, 0.08);
    ns.connect(nbp).connect(ng).connect(dry);
    ns.start();
    nodes.push(ns, nbp, ng); stopables.push(ns);
    // dozvuk
    const rev = ctx.createConvolver(); rev.buffer = getReverb(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.25;
    dry.connect(out);
    dry.connect(rev).connect(wet).connect(out);
    nodes.push(rev, wet);
    // struna (fyzikální model) – modul se načítá asynchronně
    let bowed = null; let stopped = false; let curF = freq;
    const freqProxy = {
      setTargetAtTime(v, when, tc) {
        curF = v;
        if (bowed) bowed.parameters.get("frequency").setTargetAtTime(v, when, tc);
      },
    };
    ensureBowed(ctx).then(() => {
      if (stopped) return;
      bowed = new AudioWorkletNode(ctx, "bowed-string", { outputChannelCount: [1], parameterData: { frequency: curF } });
      bowed.connect(input);
      nodes.push(bowed);
    }).catch(() => {
      // záloha bez AudioWorkletu: pila
      if (stopped) return;
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = curF;
      const g = ctx.createGain(); g.gain.value = 0.05;
      o.connect(g).connect(input); o.start();
      freqProxy.setTargetAtTime = (v, when, tc) => o.frequency.setTargetAtTime(v, when, tc);
      nodes.push(o, g); stopables.push(o);
    });
    stopables.push({ stop() { stopped = true; if (bowed) bowed.port.postMessage("stop"); } });
    return { oscs: [{ frequency: freqProxy }], stopables, nodes };
  }

  function buildSimple(out, freq) {
    const o = actx.createOscillator();
    o.type = state.wave;
    o.frequency.value = freq;
    o.connect(out);
    o.start();
    return { oscs: [o], stopables: [o], nodes: [o] };
  }

  function soundOn() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      ensureBowed(actx).catch(() => {});
    }
    if (actx.state === "suspended") actx.resume();
    if (voice) return;
    const gain = actx.createGain();
    gain.gain.value = 0;
    // u houslí pomalejší náběh (smyčec), jinak rychlý
    gain.gain.setTargetAtTime(volOf(state.f), actx.currentTime, state.wave === "violin" ? 0.08 : 0.02);
    gain.connect(actx.destination);
    const freq = Math.max(1, rateOf(state.f));
    const v = state.wave === "violin" ? buildViolin(gain, freq) : buildSimple(gain, freq);
    voice = { ...v, gain };
  }
  function soundOff() {
    if (!voice) return;
    const v = voice;
    voice = null;
    v.gain.gain.setTargetAtTime(0, actx.currentTime, 0.03);
    setTimeout(() => {
      try {
        v.stopables.forEach((n) => n.stop());
        v.nodes.forEach((n) => n.disconnect());
        v.gain.disconnect();
      } catch (_) { /* hotovo */ }
    }, 250);
  }
  function updateVoice() {
    if (!voice) return;
    const f = state.f;
    if (f > 0) voice.oscs.forEach((o) => o.frequency.setTargetAtTime(rateOf(f), actx.currentTime, 0.005));
    voice.gain.gain.setTargetAtTime(volOf(f), actx.currentTime, 0.01);
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
    updateVoice();
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
    if (state.sound && state.running && !state.manual) soundOn(); else soundOff();
    updateSoundNote();
  }
  soundBtn.addEventListener("click", toggleSound);
  soundBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSound(); }
  });

  /* ---------- Tvar signálu ---------- */
  function updateMeaning() {
    $("fMeaning").textContent = state.wave === "square" ? "počet pohybů blány za sekundu" : "počet kmitů blány za sekundu";
  }
  const waveBtns = document.querySelectorAll("[data-wave]");
  waveBtns.forEach((b) => b.addEventListener("click", () => {
    hideHint();
    state.wave = b.dataset.wave;
    updateMeaning();
    waveBtns.forEach((o) => {
      const on = o === b;
      o.classList.toggle("is-active", on);
      o.setAttribute("aria-pressed", String(on));
    });
    // jiný tvar = jiný zdroj zvuku: hrající zvuk se přestaví
    if (voice) { soundOff(); soundOn(); }
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
    if (on && state.sound && !state.manual) soundOn(); else soundOff();
  }
  $("btnRun").addEventListener("click", () => { hideHint(); setRunning(!state.running); });

  /* ---------- Ruční ovládání blány ---------- */
  function playClick(dir) {
    if (!state.sound) return;
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    // krátké „cvaknutí“ – tlakový impulz od náhlého pohybu blány
    const sr = actx.sampleRate;
    const len = Math.floor(sr * 0.06);
    const buf = actx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const t = i / sr;
      d[i] = dir * (Math.exp(-t / 0.002) * 0.9 + Math.exp(-t / 0.015) * 0.35 * Math.sin(2 * Math.PI * 140 * t));
    }
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(actx.destination);
    src.start();
  }
  function manualPush() {
    if (!state.manual) return;
    hideHint();
    state.manualLevel = 1 - state.manualLevel;
    state.edges.push({ t: state.time, level: state.manualLevel });
    if (state.edges.length > 400) state.edges.splice(0, state.edges.length - 400);
    spawnRing();
    playClick(state.manualLevel ? 1 : -1);
  }
  $("speaker").addEventListener("pointerdown", (e) => { e.preventDefault(); manualPush(); });

  function setManual(on) {
    state.manual = on;
    document.body.classList.toggle("is-manual", on);
    document.querySelectorAll("[data-ctl]").forEach((b) => {
      const act = (b.dataset.ctl === "manual") === on;
      b.classList.toggle("is-active", act);
      b.setAttribute("aria-pressed", String(act));
    });
    state.edges = [];
    state.tStart = state.time;
    state.manualLevel = 0;
    state.manualCount = -1;
    lastD = "";
    if (on) {
      soundOff();
      timeLabel.textContent = `šířka obrazovky: ${fmtTime(MANUAL_WINDOW)}`;
      $("fMeaning").textContent = "počet pohybů blány za poslední sekundu";
      hintEl.textContent = "Klikej na reproduktor – blána se pohne ven a zpět.";
      hintEl.classList.remove("is-hidden");
      delete hintEl.dataset.note;
    } else {
      hintEl.classList.add("is-hidden");
      updateMeaning();
      setF(state.f);
      if (state.running && state.sound) soundOn();
    }
  }
  document.querySelectorAll("[data-ctl]").forEach((b) => b.addEventListener("click", () => setManual(b.dataset.ctl === "manual")));

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
  const MANUAL_WINDOW = 5;
  function drawTrace() {
    const f = state.f;
    const Tw = state.manual ? MANUAL_WINDOW : windowFor(f);
    const W = SX1 - SX0;
    const yOf = (lv) => (lv ? Y_HIGH : Y_LOW);
    let d = "";
    if (state.manual) { // ruční režim: záznam pohybů blány běží zprava doleva
      // běží v reálném čase: vpravo je „teď“
      const t1 = state.time;
      const t0 = t1 - Tw;
      const xs = (t) => SX0 + ((t - t0) / Tw) * W;
      const inWin = state.edges.filter((e) => e.t > t0 && e.t <= t1);
      const before = state.edges.filter((e) => e.t <= t0);
      let lv = before.length ? before[before.length - 1].level : (inWin.length ? 1 - inWin[0].level : state.manualLevel);
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
    const sw = state.manual || f <= 70 ? 3 : Math.max(0.35, Math.min((3 * 70) / f, (W / f) * 0.45));
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
    if (state.manual) {
      state.time += dt;
      state.m += (state.manualLevel - state.m) * Math.min(1, dt / 0.03);
      dome.setAttribute("transform", `translate(0 ${(DOME_TRAVEL * (1 - state.m)).toFixed(2)})`);
      dome.setAttribute("opacity", "1");
      domeGhost.setAttribute("opacity", "0");
      // kolikrát se blána pohnula za poslední sekundu
      const cnt = state.edges.filter((e) => e.t > state.time - 1).length;
      if (cnt !== state.manualCount) {
        state.manualCount = cnt;
        $("fVal").textContent = String(cnt);
      }
      drawTrace();
      requestAnimationFrame(frame);
      return;
    }
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

  window.__ton = { state, setF, buildViolin, ensureBowed };
})();
