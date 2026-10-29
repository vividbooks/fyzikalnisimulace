/* Reverse – nahraj zvuk a pusť ho pozpátku */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";

  // obrazovka (souřadnice scény)
  const SX0 = 36.8;
  const SX1 = 529.3;
  const Y_MID = 113.7;
  const AMP = 62;              // výška křivky nad/pod osou
  const MAX_REC = 10;          // nejdelší nahrávka z mikrofonu (s)
  const MAX_FILE = 30;         // ze souboru se vezme nejvýš tolik sekund

  // membrána a vlny
  const DOME_TRAVEL = 39;
  const RIM = { x: 283.792, y: 320.1, rx: 179.33, ry: 72.536 };
  const RING_LIFE = 0.9;

  const dome = $("dome");
  const ringsG = $("rings");
  const hintEl = $("hintEl");
  const timeLabel = $("timeLabel");
  const waveBase = $("waveBase");
  const wavePlayed = $("wavePlayed");
  const playedRect = $("playedRect");
  const playhead = $("playhead");
  const playheadLine = $("playheadLine");
  const playheadArrow = $("playheadArrow");
  const screenMsg = $("screenMsg");

  const state = {
    buffer: null,       // nahrávka (AudioBuffer)
    reversed: null,     // její obrácená kopie
    peaks: null,        // [min, max] pro každý sloupec obrazovky
    name: "",
    play: null,         // { src, dir, t0, dur }
    rec: null,          // probíhající nahrávání
    m: 0.5,             // poloha blány 0…1
    level: 0,
    lastRing: 0,
    rings: [],
    micRings: [],
  };

  let actx = null;
  function ctx() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }

  const fmt = (x, d = 1) => x.toFixed(d).replace(".", ",");

  /* ---------- Hlášky ---------- */
  function showHint(text) { hintEl.textContent = text; hintEl.classList.remove("is-hidden"); }
  function hideHint() { hintEl.classList.add("is-hidden"); }

  /* ---------- Křivka ---------- */
  const COLS = 246; // sloupců přes šířku obrazovky (2 jednotky na sloupec)
  function computePeaks(data, len = data.length, total = len) {
    // total = délka, na kterou se škáluje osa (při nahrávání pevných 10 s)
    const peaks = [];
    const per = total / COLS;
    for (let c = 0; c < COLS; c += 1) {
      const a = Math.floor(c * per);
      if (a >= len) break;
      const b = Math.min(len, Math.max(a + 1, Math.floor((c + 1) * per)));
      let lo = 0; let hi = 0;
      const step = Math.max(1, Math.floor((b - a) / 400));
      for (let i = a; i < b; i += step) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
      peaks.push([lo, hi]);
    }
    return peaks;
  }
  function peaksPath(peaks, gain) {
    if (!peaks || !peaks.length) return "";
    const W = (SX1 - SX0) / COLS;
    const amp = (v) => Math.max(-1, Math.min(1, v * gain)) * AMP;
    let top = ""; let bot = "";
    peaks.forEach(([lo, hi], c) => {
      const x = SX0 + (c + 0.5) * W;
      const yh = Y_MID - Math.max(0.8, amp(hi));
      const yl = Y_MID - Math.min(-0.8, amp(lo));
      top += `${c ? "L" : "M"}${x.toFixed(1)} ${yh.toFixed(1)}`;
      bot = `L${x.toFixed(1)} ${yl.toFixed(1)}` + bot;
    });
    return `${top}${bot}Z`;
  }
  // tichou nahrávku zesílíme, aby byla křivka vidět
  function gainFor(peaks) {
    let m = 0;
    peaks.forEach(([lo, hi]) => { m = Math.max(m, -lo, hi); });
    return m > 0 ? Math.min(8, 0.95 / m) : 1;
  }
  function drawWave() {
    if (!state.peaks) {
      waveBase.setAttribute("d", "");
      wavePlayed.setAttribute("d", "");
      screenMsg.style.display = "";
      return;
    }
    const d = peaksPath(state.peaks, state.gain);
    waveBase.setAttribute("d", d);
    wavePlayed.setAttribute("d", d);
    screenMsg.style.display = "none";
  }

  /* ---------- Nastavení nahrávky ---------- */
  function reverseBuffer(buf) {
    const c = ctx();
    const out = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let ch = 0; ch < buf.numberOfChannels; ch += 1) {
      const src = buf.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0, n = src.length; i < n; i += 1) dst[i] = src[n - 1 - i];
    }
    return out;
  }
  function setBuffer(buf, name) {
    stopPlay();
    state.buffer = buf;
    state.reversed = reverseBuffer(buf);
    state.name = name;
    const data = buf.getChannelData(0);
    state.peaks = computePeaks(data);
    state.gain = gainFor(state.peaks);
    $("srcName").textContent = name;
    $("srcLen").textContent = `${fmt(buf.duration)} s`;
    timeLabel.textContent = `délka: ${fmt(buf.duration)} s`;
    $("btnFwd").disabled = false;
    $("btnRev").disabled = false;
    $("btnDlFwd").disabled = false;
    $("btnDlRev").disabled = false;
    document.querySelectorAll(".rev-sample").forEach((b) => b.classList.toggle("is-active", b.dataset.sample === state.sampleId));
    setPlayed(0, 1);
    playhead.style.display = "none";
    drawWave();
  }

  /* ---------- Přehrávání ---------- */
  function setPlayed(frac, dir) {
    // dir 1: přehráno zleva po frac, dir −1: přehráno zprava
    const W = SX1 - SX0;
    const w = Math.max(0, Math.min(1, frac)) * W;
    playedRect.setAttribute("x", (dir > 0 ? SX0 : SX1 - w).toFixed(1));
    playedRect.setAttribute("width", w.toFixed(1));
  }
  function setPlayhead(x, dir) {
    playheadLine.setAttribute("x1", x.toFixed(1));
    playheadLine.setAttribute("x2", x.toFixed(1));
    const y = 44;
    playheadArrow.setAttribute("d", dir > 0
      ? `M${(x + 9).toFixed(1)} ${y + 4}L${(x - 2).toFixed(1)} ${y - 3}L${(x - 2).toFixed(1)} ${y + 11}Z`
      : `M${(x - 9).toFixed(1)} ${y + 4}L${(x + 2).toFixed(1)} ${y - 3}L${(x + 2).toFixed(1)} ${y + 11}Z`);
  }
  function setPlayButtons() {
    const p = state.play;
    [["btnFwd", 1, "Přehrát normálně", "M8 5.14v13.72L19 12 8 5.14z"], ["btnRev", -1, "Přehrát pozpátku", "M16 5.14v13.72L5 12l11-6.86z"]].forEach(([id, dir, label, icon]) => {
      const b = $(id);
      const playing = p && p.dir === dir;
      b.querySelector(".rev-lbl").textContent = playing ? "Zastavit" : label;
      b.querySelector(".rev-ico").setAttribute("d", playing ? "M6 6h12v12H6z" : icon);
      b.setAttribute("aria-pressed", String(!!playing));
    });
  }
  function play(dir) {
    if (!state.buffer) return;
    if (state.play && state.play.dir === dir) { stopPlay(); return; }
    stopPlay();
    hideHint();
    const c = ctx();
    const src = c.createBufferSource();
    src.buffer = dir > 0 ? state.buffer : state.reversed;
    src.connect(c.destination);
    const t0 = c.currentTime + 0.03;
    src.start(t0);
    const p = { src, dir, t0, dur: src.buffer.duration };
    src.onended = () => { if (state.play === p) finishPlay(); };
    state.play = p;
    playhead.style.display = "";
    setPlayButtons();
  }
  function finishPlay() {
    const dir = state.play ? state.play.dir : 1;
    state.play = null;
    setPlayed(1, dir);
    playhead.style.display = "none";
    setPlayButtons();
  }
  function stopPlay() {
    if (!state.play) return;
    const p = state.play;
    state.play = null;
    try { p.src.onended = null; p.src.stop(); } catch (_) { /* hotovo */ }
    playhead.style.display = "none";
    setPlayed(0, 1);
    setPlayButtons();
  }
  /* ---------- Stažení (WAV) ---------- */
  function toWav(buf) {
    const ch = buf.numberOfChannels; const n = buf.length; const sr = buf.sampleRate;
    const dv = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const str = (o, t) => { for (let i = 0; i < t.length; i += 1) dv.setUint8(o + i, t.charCodeAt(i)); };
    str(0, "RIFF"); dv.setUint32(4, 36 + n * ch * 2, true); str(8, "WAVE"); str(12, "fmt ");
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true);
    str(36, "data"); dv.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c += 1) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i += 1) {
      for (let c = 0; c < ch; c += 1) {
        const v = Math.max(-1, Math.min(1, data[c][i]));
        dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
      }
    }
    return new Blob([dv], { type: "audio/wav" });
  }
  function download(dir) {
    const buf = dir > 0 ? state.buffer : state.reversed;
    if (!buf) return;
    const base = (state.name || "nahravka").replace(/^ukázka: /, "").replace(/\.[a-z0-9]+$/i, "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "nahravka";
    const url = URL.createObjectURL(toWav(buf));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}${dir > 0 ? "" : "-pozpatku"}.wav`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  $("btnDlFwd").addEventListener("click", () => download(1));
  $("btnDlRev").addEventListener("click", () => download(-1));

  $("btnFwd").addEventListener("click", () => play(1));
  $("btnRev").addEventListener("click", () => play(-1));

  /* ---------- Nahrávání z mikrofonu ---------- */
  // Nahrává se přes MediaRecorder (funguje i když je zvukový kontext prohlížeče uspaný);
  // průběžnou křivku kreslí analyzátor. Když MediaRecorder chybí, záloha přes ScriptProcessor.
  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
  }
  // výběr mikrofonu (názvy zařízení prohlížeč prozradí až po povolení mikrofonu)
  const micSelect = $("micSelect");
  const MIC_KEY = "reverse-mic";
  const loadMic = () => { try { return localStorage.getItem(MIC_KEY) || ""; } catch (_) { return ""; } };
  const saveMic = (v) => { try { localStorage.setItem(MIC_KEY, v); } catch (_) { /* nevadí */ } };
  async function refreshMics() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    let devs = [];
    try { devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput"); } catch (_) { return; }
    const want = loadMic();
    micSelect.innerHTML = "";
    const def = document.createElement("option");
    def.value = ""; def.textContent = "výchozí mikrofon";
    micSelect.appendChild(def);
    devs.forEach((d, i) => {
      if (!d.deviceId || d.deviceId === "default" || d.deviceId === "communications") return;
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label || `mikrofon ${i + 1}`;
      micSelect.appendChild(o);
    });
    // prohlížeč dokud mikrofon nepovolíš, neprozradí seznam zařízení → nabídnout jejich načtení
    if (micSelect.options.length <= 1) {
      const scan = document.createElement("option");
      scan.value = "__scan"; scan.textContent = "najít další mikrofony…";
      micSelect.appendChild(scan);
    }
    micSelect.value = [...micSelect.options].some((o) => o.value === want) ? want : "";
  }
  async function scanMics() {
    hideHint();
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      await refreshMics();
      st.getTracks().forEach((t) => t.stop());
      if (micSelect.options.length <= 2) showHint("Prohlížeč vidí jen jeden mikrofon. Další zkontroluj v nastavení systému (Soukromí → Mikrofon).");
      else showHint("Mikrofony jsou načtené – vyber v nabídce ten, který chceš.");
    } catch (_) {
      showHint("Mikrofon není povolený. Povol ho v prohlížeči (ikona vedle adresy) a zkus to znovu.");
      micSelect.value = loadMic() || "";
    }
  }
  micSelect.addEventListener("change", () => {
    if (micSelect.value === "__scan") { micSelect.value = ""; scanMics(); return; }
    saveMic(micSelect.value); hideHint();
  });
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener("devicechange", refreshMics);
  refreshMics();

  async function startRec() {
    stopPlay();
    hideHint();
    // zvukový kontext je potřeba vytvořit/probudit hned při kliknutí (pak už to prohlížeč nemusí dovolit)
    const c = ctx();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showHint(window.isSecureContext === false
        ? "Nahrávat z mikrofonu jde jen na zabezpečené stránce (https nebo localhost). Vyber soubor nebo ukázku."
        : "Tento prohlížeč neumí nahrávat z mikrofonu. Vyber soubor nebo ukázku.");
      return;
    }
    let stream;
    try {
      const id = micSelect.value;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: id ? { deviceId: { exact: id } } : true });
      } catch (e1) {
        // vybraný mikrofon už není připojený → zkusit výchozí
        if (id && (e1.name === "OverconstrainedError" || e1.name === "NotFoundError")) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micSelect.value = ""; saveMic("");
        } else throw e1;
      }
      refreshMics().then(() => {
        // ukázat, který mikrofon se opravdu použil
        const tr = stream.getAudioTracks()[0];
        const used = tr && tr.getSettings ? tr.getSettings().deviceId : "";
        if (!micSelect.value && used && [...micSelect.options].some((o) => o.value === used)) micSelect.value = used;
      });
    } catch (err) {
      const name = err && err.name;
      showHint(name === "NotFoundError" || name === "OverconstrainedError"
        ? "Nenašel jsem žádný mikrofon. Připoj ho, nebo vyber soubor či ukázku."
        : name === "NotReadableError"
          ? "Mikrofon používá jiná aplikace. Zavři ji a zkus to znovu."
          : "Mikrofon není povolený. Povol ho v prohlížeči (ikona vedle adresy), nebo vyber soubor či ukázku.");
      return;
    }
    if (c.state === "suspended") { try { await c.resume(); } catch (_) { /* nevadí */ } }
    const rec = { stream, t0: performance.now(), live: [], chunks: [], pcm: [], pcmLen: 0, sr: c.sampleRate };
    // průběžná křivka
    try {
      rec.srcNode = c.createMediaStreamSource(stream);
      rec.an = c.createAnalyser();
      rec.an.fftSize = 2048;
      rec.buf = new Float32Array(rec.an.fftSize);
      rec.srcNode.connect(rec.an);
    } catch (_) { /* bez živé křivky */ }
    const mime = pickMime();
    if (window.MediaRecorder) {
      try {
        rec.mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch (_) { rec.mr = null; }
    }
    if (rec.mr) {
      rec.mr.ondataavailable = (e) => { if (e.data && e.data.size) rec.chunks.push(e.data); };
      rec.mr.onstop = () => finishRec(rec);
      rec.mr.start(250);
    } else {
      // záloha: syrové vzorky přes ScriptProcessor
      const proc = c.createScriptProcessor(4096, 1, 1);
      const mute = c.createGain(); mute.gain.value = 0;
      proc.onaudioprocess = (e) => {
        if (state.rec !== rec) return;
        const d = e.inputBuffer.getChannelData(0);
        rec.pcm.push(new Float32Array(d));
        rec.pcmLen += d.length;
      };
      rec.srcNode.connect(proc).connect(mute).connect(c.destination);
      rec.proc = proc; rec.mute = mute;
    }
    state.rec = rec;
    setMicMode(true);
    state.sampleId = null;
    state.peaks = null; state.buffer = null;
    waveBase.setAttribute("d", ""); wavePlayed.setAttribute("d", "");
    $("btnFwd").disabled = true; $("btnRev").disabled = true;
    $("btnDlFwd").disabled = true; $("btnDlRev").disabled = true;
    const btn = $("btnRec");
    btn.classList.add("is-recording");
    btn.setAttribute("aria-pressed", "true");
    screenMsg.style.display = "none";
    $("srcName").textContent = "nahrávám…";
    $("srcLen").textContent = "–";
    document.querySelectorAll(".rev-sample").forEach((x) => x.classList.remove("is-active"));
  }
  function stopRec() {
    const r = state.rec;
    if (!r) return;
    state.rec = null;
    setMicMode(false);
    const btn = $("btnRec");
    btn.classList.remove("is-recording");
    btn.setAttribute("aria-pressed", "false");
    $("recText").textContent = "Nahrát z mikrofonu";
    $("srcName").textContent = "zpracovávám…";
    if (r.mr && r.mr.state !== "inactive") r.mr.stop(); // → finishRec
    else finishRec(r);
  }
  function failRec(msg) {
    state.peaks = null; drawWave();
    timeLabel.textContent = "";
    showHint(msg);
    if (state.prevBuffer) setBuffer(state.prevBuffer, state.prevName);
    else { $("srcName").textContent = "zatím nic"; $("srcLen").textContent = "–"; }
  }
  async function finishRec(r) {
    try { if (r.srcNode) r.srcNode.disconnect(); if (r.proc) r.proc.disconnect(); if (r.mute) r.mute.disconnect(); } catch (_) { /* hotovo */ }
    r.stream.getTracks().forEach((t) => t.stop());
    let all; let sr;
    try {
      if (r.mr) {
        const blob = new Blob(r.chunks, { type: r.mr.mimeType || "audio/webm" });
        const arr = await blob.arrayBuffer();
        const c = ctx();
        const buf = await new Promise((res, rej) => {
          const p = c.decodeAudioData(arr, res, rej);
          if (p && p.then) p.then(res, rej);
        });
        all = buf.getChannelData(0); sr = buf.sampleRate;
      } else {
        all = new Float32Array(r.pcmLen); sr = r.sr;
        let o = 0; r.pcm.forEach((ch) => { all.set(ch, o); o += ch.length; });
      }
    } catch (_) {
      failRec("Nahrávku se nepodařilo zpracovat. Zkus to znovu, nebo vyber soubor či ukázku.");
      return;
    }
    // oříznout ticho na začátku a na konci
    let pk = 0; for (let i = 0; i < all.length; i += 4) pk = Math.max(pk, Math.abs(all[i]));
    const thr = pk * 0.06;
    let a = 0; while (a < all.length && Math.abs(all[a]) < thr) a += 1;
    let b = all.length - 1; while (b > a && Math.abs(all[b]) < thr) b -= 1;
    const margin = Math.floor(0.08 * sr);
    a = Math.max(0, a - margin); b = Math.min(all.length, b + margin);
    if (all.length < sr * 0.15 || pk < 0.0003) {
      failRec("Nic se nenahrálo – mikrofon nic nezachytil. Zkus v nabídce „Mikrofon“ vybrat jiný.");
      return;
    }
    if (b - a < sr * 0.15) { a = 0; b = all.length; }
    const buf = ctx().createBuffer(1, b - a, sr);
    const out = buf.getChannelData(0);
    out.set(all.subarray(a, b));
    // tichou nahrávku zesílit, aby bylo slyšet
    if (pk < 0.5) { const g = 0.8 / pk; for (let i = 0; i < out.length; i += 1) out[i] *= g; }
    const opt = micSelect.options[micSelect.selectedIndex];
    setBuffer(buf, "nahrávka z mikrofonu");
    if (opt && opt.value) $("srcName").title = opt.textContent;
  }
  $("btnRec").addEventListener("click", () => {
    if (state.rec) { stopRec(); return; }
    state.prevBuffer = state.buffer; state.prevName = state.name;
    startRec();
  });

  /* ---------- Soubor ---------- */
  $("btnFile").addEventListener("click", () => { if (state.rec) stopRec(); $("fileInput").click(); });
  $("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    hideHint();
    try {
      const arr = await file.arrayBuffer();
      const c = ctx();
      let buf = await new Promise((res, rej) => {
        const p = c.decodeAudioData(arr, res, rej);
        if (p && p.then) p.then(res, rej);
      });
      if (buf.duration > MAX_FILE) {
        const n = Math.floor(MAX_FILE * buf.sampleRate);
        const cut = c.createBuffer(buf.numberOfChannels, n, buf.sampleRate);
        for (let ch = 0; ch < buf.numberOfChannels; ch += 1) cut.getChannelData(ch).set(buf.getChannelData(ch).subarray(0, n));
        buf = cut;
        showHint(`Soubor je dlouhý – použije se jen prvních ${MAX_FILE} s.`);
      }
      state.sampleId = null;
      setBuffer(buf, file.name);
    } catch (_) {
      showHint("Tenhle soubor se nepodařilo přečíst. Zkus jiný zvukový soubor (mp3, wav, m4a…).");
    }
  });

  /* ---------- Ukázky (vytvořené přímo v prohlížeči) ---------- */
  const SAMPLE_NAMES = { piano: "klavír", bell: "zvon", scale: "stupnice", siren: "siréna", drop: "kapka", boom: "bouchnutí" };
  function synth(id) {
    const sr = 44100;
    const dur = { piano: 2.2, bell: 3.2, scale: 2.4, siren: 1.8, drop: 0.8, boom: 1.6 }[id];
    const n = Math.floor(sr * dur);
    const d = new Float32Array(n);
    const TAU = 2 * Math.PI;
    const note = (start, f, len, decay, harm, gain = 1) => {
      const a = Math.floor(start * sr); const L = Math.floor(len * sr);
      for (let i = 0; i < L && a + i < n; i += 1) {
        const t = i / sr;
        const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
        let v = 0;
        harm.forEach((h, k) => { v += h * Math.sin(TAU * f * (k + 1) * t) * Math.exp(-t * k * 0.8); });
        d[a + i] += gain * env * v;
      }
    };
    if (id === "piano") {
      // akord C dur – úder a pomalé doznívání (pozpátku: tón „nasává“ a utne se)
      [261.63, 329.63, 392.0].forEach((f) => note(0, f, dur, 0.55, [1, 0.5, 0.3, 0.15, 0.08], 0.33));
    } else if (id === "bell") {
      // zvon: neharmonické složky, dlouhý dozvuk
      const parts = [[1, 1, 1.4], [2.0, 0.6, 1.1], [2.76, 0.5, 0.8], [5.4, 0.3, 0.45], [8.93, 0.2, 0.3]];
      for (let i = 0; i < n; i += 1) {
        const t = i / sr; let v = 0;
        parts.forEach(([m, g, tau]) => { v += g * Math.sin(TAU * 220 * m * t) * Math.exp(-t / tau); });
        d[i] = 0.4 * Math.min(1, t / 0.002) * v;
      }
    } else if (id === "scale") {
      // stupnice nahoru c¹ … c² (pozpátku jde dolů)
      [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25].forEach((f, k) => note(k * 0.25, f, 0.6, 0.18, [1, 0.35, 0.15], 0.7));
    } else if (id === "siren") {
      // tón, který stoupá (pozpátku klesá)
      let ph = 0;
      for (let i = 0; i < n; i += 1) {
        const t = i / sr;
        const f = 300 * Math.pow(4, t / dur);
        ph += TAU * f / sr;
        const env = Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.05);
        d[i] = 0.5 * env * (Math.sin(ph) + 0.3 * Math.sin(2 * ph));
      }
    } else if (id === "drop") {
      // kapka: krátký tón, který rychle stoupne
      let ph = 0;
      for (let i = 0; i < n; i += 1) {
        const t = i / sr;
        const f = 500 + 1400 * (1 - Math.exp(-t / 0.03));
        ph += TAU * f / sr;
        d[i] = 0.8 * Math.min(1, t / 0.002) * Math.exp(-t / 0.07) * Math.sin(ph);
      }
    } else if (id === "boom") {
      // bouchnutí: náraz a dozvuk šumu (pozpátku „vysátí“)
      let lp = 0; let lp2 = 0;
      for (let i = 0; i < n; i += 1) {
        const t = i / sr;
        const r = Math.random() * 2 - 1;
        lp += 0.08 * (r - lp); lp2 += 0.3 * (r - lp2);
        const env = Math.min(1, t / 0.003) * (0.75 * Math.exp(-t / 0.35) + 0.25 * Math.exp(-t / 0.05));
        d[i] = env * (2.2 * lp + 0.35 * lp2 + 0.6 * Math.sin(TAU * 55 * t) * Math.exp(-t / 0.2));
      }
    }
    let pk = 0; d.forEach((v) => { pk = Math.max(pk, Math.abs(v)); });
    const buf = ctx().createBuffer(1, n, sr);
    const out = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) out[i] = (d[i] / pk) * 0.85;
    return buf;
  }
  document.querySelectorAll(".rev-sample").forEach((b) => b.addEventListener("click", () => {
    if (state.rec) stopRec();
    hideHint();
    state.sampleId = b.dataset.sample;
    setBuffer(synth(b.dataset.sample), `ukázka: ${SAMPLE_NAMES[b.dataset.sample]}`);
  }));

  /* ---------- Text pozpátku ---------- */
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter("cs", { granularity: "grapheme" }) : null;
  function reverseText(t) {
    const parts = seg ? Array.from(seg.segment(t), (x) => x.segment) : Array.from(t);
    return parts.reverse().join("");
  }
  $("txtIn").addEventListener("input", (e) => { $("txtOut").textContent = reverseText(e.target.value); });

  /* ---------- Vlny ---------- */
  // při nahrávání je místo reproduktoru mikrofon; zvuk k němu přichází ve vlnách
  const MIC_HEAD = { x: 283, y: 262 };
  const micRingsG = $("micRings");
  function setMicMode(on) {
    $("mic").style.display = on ? "" : "none";
    $("speaker").style.display = on ? "none" : "";
    $("spkCable").style.display = on ? "none" : "";
    ringsG.style.display = on ? "none" : "";
    if (!on) { state.micRings.forEach((r) => r.el.remove()); state.micRings = []; }
  }
  function spawnMicRing() {
    const el = document.createElementNS(NS, "ellipse");
    el.setAttribute("cx", MIC_HEAD.x);
    el.setAttribute("cy", MIC_HEAD.y);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "#55a0ff");
    micRingsG.appendChild(el);
    state.micRings.push({ el, t: 0 });
  }
  function stepMicRings(dt) {
    for (const r of state.micRings) {
      r.t += dt;
      const a = Math.min(1, r.t / RING_LIFE);
      const k = 1 - a; // vlna se stahuje k mikrofonu
      const op = a < 0.3 ? (a / 0.3) * 0.65 : 0.65 * (1 - (a - 0.3) / 0.7);
      r.el.setAttribute("rx", (72 + 140 * k).toFixed(1));
      r.el.setAttribute("ry", (72 + 70 * k).toFixed(1));
      r.el.setAttribute("stroke-width", (6 + 6 * k).toFixed(1));
      r.el.setAttribute("opacity", Math.max(0, op).toFixed(3));
    }
    state.micRings = state.micRings.filter((r) => {
      if (r.t >= RING_LIFE) { r.el.remove(); return false; }
      return true;
    });
  }

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

  /* ---------- Smyčka ---------- */
  let lastT = 0;
  function frame(tMs) {
    const t = tMs / 1000;
    const dt = Math.min(0.05, lastT ? t - lastT : 0);
    lastT = t;
    let target = 0.5;
    let level = 0;

    if (state.rec) {
      const r = state.rec;
      const sec = (performance.now() - r.t0) / 1000;
      $("recText").textContent = `Zastavit (${fmt(Math.min(MAX_REC, sec))} s)`;
      timeLabel.textContent = `nahrávám… max. ${MAX_REC} s`;
      if (r.an) {
        r.an.getFloatTimeDomainData(r.buf);
        let lo = 0; let hi = 0;
        for (let i = 0; i < r.buf.length; i += 2) { const v = r.buf[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        const col = Math.min(COLS - 1, Math.floor((sec / MAX_REC) * COLS));
        const prev = r.live[col];
        r.live[col] = prev ? [Math.min(prev[0], lo), Math.max(prev[1], hi)] : [lo, hi];
        for (let c2 = 0; c2 < col; c2 += 1) if (!r.live[c2]) r.live[c2] = [0, 0];
        waveBase.setAttribute("d", peaksPath(r.live, 1.6));
        const lv = (hi - lo) / 2;
        if (lv > 0.08 && t - state.lastRing > 0.18) { spawnMicRing(); state.lastRing = t; }
      }
      if (sec >= MAX_REC) stopRec();
    } else if (state.play && actx) {
      const p = state.play;
      const el = Math.max(0, actx.currentTime - p.t0);
      const frac = Math.min(1, el / p.dur);
      // poloha v původní nahrávce
      const pos = p.dir > 0 ? frac : 1 - frac;
      const x = SX0 + pos * (SX1 - SX0);
      setPlayhead(x, p.dir);
      setPlayed(frac, p.dir);
      timeLabel.textContent = `${p.dir > 0 ? "▶" : "◀"} ${fmt(el > p.dur ? p.dur : el)} s / ${fmt(p.dur)} s`;
      // blána kmitá podle zvuku v místě přehrávání
      const buf = state.buffer;
      const data = buf.getChannelData(0);
      const i = Math.floor(pos * (data.length - 1));
      const w = Math.floor(buf.sampleRate * 0.02);
      let pk = 0;
      for (let k = Math.max(0, i - w); k < Math.min(data.length, i + w); k += 4) pk = Math.max(pk, Math.abs(data[k]));
      level = pk * (state.gain || 1);
      target = 0.5 + 0.5 * Math.min(1, level) * Math.sin(t * 90);
    } else if (state.buffer) {
      timeLabel.textContent = `délka: ${fmt(state.buffer.duration)} s`;
    }

    // vlny při hlasitém zvuku
    if (level > 0.35 && t - state.lastRing > 0.16 && level > state.level * 1.05) {
      spawnRing();
      state.lastRing = t;
    }
    state.level = level;
    state.m += (target - state.m) * Math.min(1, dt * 30);
    dome.setAttribute("transform", `translate(0 ${(DOME_TRAVEL * (1 - state.m)).toFixed(2)})`);
    stepRings(dt);
    stepMicRings(dt);
    requestAnimationFrame(frame);
  }

  setPlayButtons();
  drawWave();
  requestAnimationFrame(frame);

  window.__rev = { state, setBuffer, synth };
})();
