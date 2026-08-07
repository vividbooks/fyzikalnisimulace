const FRAMES = {
  FALL1_START: 0,
  FALL1_END: 236,
  FLIP_START: 238,
  FLIP_END: 274,
  FALL2_START: 274,
  FALL2_END: 509,
};

const FLIP_SPEED = 3.375;

const SAND_ORIGINAL = {
  primary: [1, 0.506, 0.345, 1],
  accent: [0.941, 0.231, 0.314, 1],
};

const SAND_PALETTES = {
  xlarge: {
    primary: [0.29, 0.56, 0.86, 1],
    accent: [0.18, 0.42, 0.74, 1],
  },
  small: {
    primary: [0.58, 0.76, 0.28, 1],
    accent: [0.42, 0.62, 0.16, 1],
  },
};

function colorsMatch(a, b) {
  return a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 0.001);
}

function replaceSandColorsInLayer(layer, primary, accent) {
  if (!layer.nm || !/^sand/i.test(layer.nm)) return;

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if ((obj.ty === 'fl' || obj.ty === 'st') && obj.c?.a === 0 && Array.isArray(obj.c.k)) {
      if (colorsMatch(obj.c.k, SAND_ORIGINAL.primary)) obj.c.k = [...primary];
      else if (colorsMatch(obj.c.k, SAND_ORIGINAL.accent)) obj.c.k = [...accent];
    }
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  }

  walk(layer);
}

function cloneWithSandPalette(animationData, palette) {
  const data = structuredClone(animationData);
  for (const asset of data.assets) {
    for (const layer of asset.layers) {
      replaceSandColorsInLayer(layer, palette.primary, palette.accent);
    }
  }
  return data;
}

function createHourglass(unitEl, { fallSpeed, flipSpeed, sandPalette, onStateChange }) {
  const lottieEl = unitEl.querySelector('.lottie');
  let mode = 'idle';
  let playSecondFall = false;
  let anim = null;

  function notifyStateChange() {
    onStateChange?.();
  }

  function setReady(ready) {
    lottieEl.classList.toggle('lottie--ready', ready);
    lottieEl.setAttribute('aria-disabled', ready ? 'false' : 'true');
    notifyStateChange();
  }

  function playSegment(from, to, speed = 1) {
    return new Promise((resolve) => {
      const onFrame = () => {
        if (anim.currentFrame >= to - 0.5) {
          anim.removeEventListener('enterFrame', onFrame);
          anim.pause();
          anim.setSpeed(1);
          anim.goToAndStop(to, true);
          resolve();
        }
      };
      anim.setSpeed(speed);
      anim.goToAndPlay(from, true);
      anim.addEventListener('enterFrame', onFrame);
    });
  }

  async function runFall() {
    mode = 'animating';
    setReady(false);
    const fallFrames = playSecondFall
      ? [FRAMES.FALL2_START, FRAMES.FALL2_END]
      : [FRAMES.FALL1_START, FRAMES.FALL1_END];
    await playSegment(fallFrames[0], fallFrames[1], fallSpeed);
    mode = 'idle';
    setReady(true);
  }

  async function onFlip() {
    if (mode === 'animating') return;

    mode = 'animating';
    setReady(false);
    notifyStateChange();

    await playSegment(FRAMES.FLIP_START, FRAMES.FLIP_END, flipSpeed);
    playSecondFall = !playSecondFall;
    await runFall();
  }

  function init(animationData) {
    const data = sandPalette ? cloneWithSandPalette(animationData, sandPalette) : animationData;

    anim = lottie.loadAnimation({
      container: lottieEl,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: data,
    });

    lottieEl.addEventListener('click', onFlip);
    lottieEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onFlip();
      }
    });

    anim.addEventListener('DOMLoaded', () => {
      anim.goToAndStop(FRAMES.FALL1_END, true);
      setReady(true);
    });
  }

  return { init, flip: onFlip, isIdle: () => mode === 'idle' };
}

function parseDecimalInput(raw) {
  const trimmed = String(raw || '').trim().replace(',', '.');
  if (trimmed === '') return NaN;
  return Number(trimmed);
}

function formatDecimalDraft(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const n = parseDecimalInput(trimmed);
  if (!Number.isFinite(n)) return trimmed;
  return String(n).replace('.', ',');
}

const PERIOD_ANSWERS = {
  pendulum: 2.4,
  heart: 0.85,
};

const PERIOD_TOLERANCE = 0.1;

const CONFETTI_COLORS = [
  '#059669',
  '#10b981',
  '#34d399',
  '#6ee7b7',
  '#047857',
  '#a7f3d0',
];

let celebrationTimer = 0;

function clearCelebration() {
  if (celebrationTimer) {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = 0;
  }
  const boardStage = document.querySelector('.board-stage');
  boardStage?.classList.remove('is-celebrating');
  boardStage?.querySelector('.quiz-celebration')?.remove();
}

function launchGreenConfetti(originEl) {
  const boardStage = document.querySelector('.board-stage');
  if (!boardStage || !originEl) return;

  clearCelebration();

  const stageRect = boardStage.getBoundingClientRect();
  const originRect = originEl.getBoundingClientRect();
  const left = originRect.left + originRect.width / 2 - stageRect.left;
  const top = originRect.top + originRect.height / 2 - stageRect.top;

  const layer = document.createElement('div');
  layer.className = 'quiz-celebration';
  layer.setAttribute('aria-hidden', 'true');

  const burst = document.createElement('div');
  burst.className = 'quiz-confetti-burst';
  burst.style.left = `${left}px`;
  burst.style.top = `${top}px`;
  layer.append(burst);

  for (let i = 0; i < 80; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'quiz-confetti';
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280;
    piece.style.setProperty('--burst-x', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--burst-y', `${Math.sin(angle) * distance}px`);
    piece.style.setProperty('--rotation', `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty('--size', `${6 + Math.random() * 10}px`);
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    burst.append(piece);
  }

  boardStage.append(layer);
  boardStage.classList.add('is-celebrating');

  celebrationTimer = window.setTimeout(() => {
    clearCelebration();
  }, 1800);
}

function clearPeriodFeedback(answerRow, feedbackEl) {
  answerRow?.classList.remove('is-correct', 'is-wrong');
  if (!feedbackEl) return;
  feedbackEl.textContent = '';
  feedbackEl.classList.remove('is-correct', 'is-wrong');
}

function verifyPeriodAnswer(input, answerRow, feedbackEl) {
  const key = input?.dataset.periodKey;
  const correctValue = PERIOD_ANSWERS[key];
  if (!Number.isFinite(correctValue)) return null;

  clearPeriodFeedback(answerRow, feedbackEl);

  const raw = parseDecimalInput(input.value);
  if (!Number.isFinite(raw)) {
    answerRow?.classList.add('is-wrong');
    feedbackEl.classList.add('is-wrong');
    feedbackEl.textContent = 'Zadej číslo.';
    return 'wrong';
  }

  if (Math.abs(raw - correctValue) <= PERIOD_TOLERANCE + 1e-10) {
    answerRow?.classList.add('is-correct');
    feedbackEl.classList.add('is-correct');
    feedbackEl.textContent = 'Správně! ± 0,1 s';
    launchGreenConfetti(answerRow);
    return 'correct';
  }

  answerRow?.classList.add('is-wrong');
  feedbackEl.classList.add('is-wrong');
  feedbackEl.textContent = 'To není správně. Zkus to znovu.';
  return 'wrong';
}

let periodAnswerPairs = [];

function initPeriodAnswers() {
  periodAnswerPairs = [
    {
      input: document.getElementById('pendulum-answer'),
      row: document.getElementById('pendulum-answer-row'),
      feedback: document.getElementById('pendulum-feedback'),
    },
    {
      input: document.getElementById('heart-answer'),
      row: document.getElementById('heart-answer-row'),
      feedback: document.getElementById('heart-feedback'),
    },
  ].filter((pair) => pair.input && pair.row && pair.feedback);
}

function getPeriodPair(input) {
  return periodAnswerPairs.find((pair) => pair.input === input);
}

function initNumericKeypad() {
  const overlay = document.getElementById('tableKeypadOverlay');
  const titleEl = document.getElementById('tableKeypadTitle');
  const displayValueEl = document.getElementById('tableKeypadDisplayValue');
  const displayUnitEl = document.getElementById('tableKeypadDisplayUnit');
  const displayEl = document.getElementById('tableKeypadDisplay');
  const errorEl = document.getElementById('tableKeypadError');
  const confirmBtn = document.getElementById('tableKeypadConfirm');
  const cancelBtn = document.getElementById('tableKeypadCancel');
  const keypadEl = document.getElementById('tableMathKeypad');
  const keys = keypadEl ? keypadEl.querySelectorAll('.table-math-keypad__key') : [];

  let targetInput = null;
  let draft = '';

  function isPeriodInput(el) {
    return el instanceof HTMLInputElement && el.hasAttribute('data-period-key');
  }

  function syncConfirmFeedback(result) {
    confirmBtn?.classList.remove('is-correct', 'is-wrong');
    if (result === 'correct') confirmBtn?.classList.add('is-correct');
    if (result === 'wrong') confirmBtn?.classList.add('is-wrong');
  }

  function clearError() {
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
    displayEl?.classList.remove('is-invalid');
  }

  function showError(message) {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    displayEl?.classList.add('is-invalid');
  }

  function validateDraft() {
    const raw = draft.trim();
    if (raw === '') return { ok: false, message: 'Zadej číslo.' };
    const n = parseDecimalInput(raw);
    if (!Number.isFinite(n)) return { ok: false, message: 'Zadej platné číslo.' };
    if (n < 0) return { ok: false, message: 'Hodnota nemůže být záporná.' };
    return { ok: true };
  }

  function renderDraft() {
    if (displayValueEl) displayValueEl.textContent = draft;
    clearError();
  }

  function keypadTitle(input) {
    const readout = input.closest('.indicator-readout');
    const label = readout?.querySelector('.indicator-readout__label');
    if (label?.textContent) return label.textContent.trim();
    return input.getAttribute('aria-label') || 'Hodnota';
  }

  function hideKeypad() {
    targetInput = null;
    draft = '';
    clearError();
    syncConfirmFeedback(null);
    if (overlay) overlay.hidden = true;
    if (displayValueEl) displayValueEl.textContent = '';
  }

  function showKeypad(input) {
    if (!overlay || !input) return;
    targetInput = input;
    draft = input.value;
    syncConfirmFeedback(null);
    const pair = getPeriodPair(input);
    if (pair) clearPeriodFeedback(pair.row, pair.feedback);
    if (titleEl) titleEl.textContent = keypadTitle(input);
    if (displayUnitEl) displayUnitEl.textContent = 's';
    renderDraft();
    overlay.hidden = false;
    input.blur();
  }

  function insertIntoDraft(value) {
    if (value === ',' || value === '.') {
      if (draft.includes(',') || draft.includes('.')) return;
    }
    if (draft.length >= 12) return;
    draft += value;
    renderDraft();
  }

  function confirmKeypad() {
    if (!targetInput) return;
    const result = validateDraft();
    if (!result.ok) {
      showError(result.message);
      return;
    }

    targetInput.value = formatDecimalDraft(draft);
    const pair = getPeriodPair(targetInput);
    const verifyResult = pair
      ? verifyPeriodAnswer(targetInput, pair.row, pair.feedback)
      : null;

    syncConfirmFeedback(verifyResult);
    hideKeypad();
  }

  function handleKeyClick(event) {
    const key = event.currentTarget;
    if (!(key instanceof HTMLButtonElement) || key.disabled) return;

    const action = key.getAttribute('data-action');
    const value = key.getAttribute('data-value');

    if (action === 'clear') {
      draft = '';
      renderDraft();
      return;
    }

    if (value) insertIntoDraft(value);
  }

  function openFromEvent(ev) {
    const input = ev.target;
    if (!isPeriodInput(input)) return false;
    ev.preventDefault();
    showKeypad(input);
    return true;
  }

  document.querySelectorAll('[data-period-key]').forEach((input) => {
    input.readOnly = true;
    input.setAttribute('inputmode', 'none');
    input.classList.add('app-numeric-input');
  });

  const stopwatchStage = document.querySelector('.stage--stopwatch');
  stopwatchStage?.addEventListener('pointerdown', openFromEvent);

  confirmBtn?.addEventListener('click', confirmKeypad);
  cancelBtn?.addEventListener('click', hideKeypad);
  overlay?.addEventListener('click', (ev) => {
    if (ev.target === overlay) hideKeypad();
  });

  keys.forEach((keyBtn) => {
    keyBtn.addEventListener('mousedown', (ev) => ev.preventDefault());
    keyBtn.addEventListener('click', handleKeyClick);
  });

  document.addEventListener('keydown', (ev) => {
    if (overlay?.hidden) return;
    if (ev.key === 'Escape') hideKeypad();
    if (ev.key === 'Enter') confirmKeypad();
  });
}

function formatStopwatchTime(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const pad2 = (n) => String(n).padStart(2, '0');
  return `${pad2(minutes)} : ${pad2(seconds)},${pad2(centiseconds)}`;
}

function createStopwatch({
  visualEl,
  timeEl,
  lapsListEl,
  lapsPanelEl,
  pendulumReadoutEl,
  heartReadoutEl,
  pendulumAnswerEl,
  heartAnswerEl,
  pendulumAnswerRowEl,
  heartAnswerRowEl,
  pendulumFeedbackEl,
  heartFeedbackEl,
  btnStart,
  btnLap,
  btnReset,
  indicatorControlEl,
  indicatorBtns,
}) {
  let running = false;
  let elapsedMs = 0;
  let startedAt = 0;
  let rafId = null;
  const laps = [];

  function currentElapsed() {
    return running ? elapsedMs + (performance.now() - startedAt) : elapsedMs;
  }

  function renderLaps() {
    lapsListEl.replaceChildren();
    lapsPanelEl.hidden = laps.length === 0;

    laps.slice().reverse().forEach((lap, index) => {
      const row = document.createElement('div');
      row.className = 'stopwatch-lap';
      row.textContent = `${laps.length - index}. ${lap}`;
      lapsListEl.appendChild(row);
    });
  }

  function renderTimes() {
    const formatted = formatStopwatchTime(currentElapsed());
    timeEl.textContent = formatted;
    timeEl.setAttribute('datetime', `PT${Math.floor(currentElapsed() / 1000)}S`);
  }

  function tick() {
    renderTimes();
    if (running) rafId = requestAnimationFrame(tick);
  }

  function updateControls() {
    btnStart.textContent = running ? 'Zastavit' : 'Spustit';
    btnStart.classList.toggle('is-running', running);
  }

  function setRunning(next) {
    if (running && !next) {
      elapsedMs += performance.now() - startedAt;
    }

    running = next;
    updateControls();

    if (running) {
      startedAt = performance.now();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
      renderTimes();
    }
  }

  function setIndicator(mode) {
    visualEl.classList.toggle('stopwatch-visual--heart', mode === 'heart');
    visualEl.classList.toggle('stopwatch-visual--pendulum', mode === 'pendulum');
    pendulumReadoutEl.classList.toggle('hidden', mode !== 'pendulum');
    heartReadoutEl.classList.toggle('hidden', mode !== 'heart');
    indicatorBtns.forEach((btn) => {
      const active = btn.dataset.indicator === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function onIndicatorClick(e) {
    const btn = e.target.closest('[data-indicator]');
    if (btn) setIndicator(btn.dataset.indicator);
  }

  function onStart() {
    setRunning(!running);
  }

  function onLap() {
    laps.push(formatStopwatchTime(currentElapsed()));
    renderLaps();
  }

  function onReset() {
    if (running) setRunning(false);
    elapsedMs = 0;
    laps.length = 0;
    if (pendulumAnswerEl) pendulumAnswerEl.value = '';
    if (heartAnswerEl) heartAnswerEl.value = '';
    clearPeriodFeedback(pendulumAnswerRowEl, pendulumFeedbackEl);
    clearPeriodFeedback(heartAnswerRowEl, heartFeedbackEl);
    renderLaps();
    renderTimes();
  }

  btnStart.addEventListener('click', onStart);
  btnLap.addEventListener('click', onLap);
  btnReset.addEventListener('click', onReset);
  indicatorControlEl.addEventListener('click', onIndicatorClick);

  setIndicator('pendulum');
  updateControls();
  renderTimes();
}

function initModeSwitch() {
  const appRoot = document.querySelector('.app-root');
  const hourglassStage = document.querySelector('.stage--hourglass');
  const stopwatchStage = document.querySelector('.stage--stopwatch');
  const buttons = document.querySelectorAll('.mode-switch__btn');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      appRoot.dataset.appMode = mode;
      buttons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      hourglassStage.classList.toggle('hidden', mode !== 'hourglass');
      stopwatchStage.classList.toggle('hidden', mode !== 'stopwatch');
    });
  });
}

function initStopwatch() {
  const visualEl = document.getElementById('stopwatch-visual');
  const timeEl = document.getElementById('panel-time-main');
  const lapsListEl = document.getElementById('stopwatch-laps');
  const lapsPanelEl = document.getElementById('laps-panel');
  const btnStart = document.getElementById('btn-start');
  const btnLap = document.getElementById('btn-lap');
  const btnReset = document.getElementById('btn-reset');
  const pendulumReadoutEl = document.getElementById('pendulum-readout');
  const heartReadoutEl = document.getElementById('heart-readout');
  const pendulumAnswerEl = document.getElementById('pendulum-answer');
  const heartAnswerEl = document.getElementById('heart-answer');
  const pendulumAnswerRowEl = document.getElementById('pendulum-answer-row');
  const heartAnswerRowEl = document.getElementById('heart-answer-row');
  const pendulumFeedbackEl = document.getElementById('pendulum-feedback');
  const heartFeedbackEl = document.getElementById('heart-feedback');
  const indicatorControlEl = document.querySelector('.subject-control');
  const indicatorBtns = document.querySelectorAll('[data-indicator]');

  initPeriodAnswers();
  initNumericKeypad();

  fetch('./assets/stopwatch.svg')
    .then((r) => {
      if (!r.ok) throw new Error('Soubor assets/stopwatch.svg nenalezen');
      return r.text();
    })
    .then((svg) => {
      visualEl.innerHTML = svg;
      createStopwatch({
        visualEl,
        timeEl,
        lapsListEl,
        lapsPanelEl,
        pendulumReadoutEl,
        heartReadoutEl,
        pendulumAnswerEl,
        heartAnswerEl,
        pendulumAnswerRowEl,
        heartAnswerRowEl,
        pendulumFeedbackEl,
        heartFeedbackEl,
        btnStart,
        btnLap,
        btnReset,
        indicatorControlEl,
        indicatorBtns,
      });
    })
    .catch((e) => {
      console.error(e);
    });
}

initModeSwitch();
initStopwatch();

const hourglasses = [];

function updateFlipAllButton() {
  const btn = document.getElementById('flip-all-hourglasses');
  if (!btn) return;
  btn.disabled = !hourglasses.every((hg) => hg.isIdle());
}

function initFlipAllButton() {
  const btn = document.getElementById('flip-all-hourglasses');
  if (!btn) return;

  btn.addEventListener('click', () => {
    hourglasses.forEach((hg) => hg.flip());
    updateFlipAllButton();
  });
}

fetch('./assets/hourglass.json')
  .then((r) => {
    if (!r.ok) throw new Error('Soubor assets/hourglass.json nenalezen');
    return r.json();
  })
  .then((animationData) => {
    const onHourglassStateChange = () => updateFlipAllButton();

    hourglasses.push(
      createHourglass(document.querySelector('.hourglass-unit--xlarge'), {
        fallSpeed: 0.5,
        flipSpeed: FLIP_SPEED,
        sandPalette: SAND_PALETTES.xlarge,
        onStateChange: onHourglassStateChange,
      }),
      createHourglass(document.querySelector('.hourglass-unit--large'), {
        fallSpeed: 1,
        flipSpeed: FLIP_SPEED,
        onStateChange: onHourglassStateChange,
      }),
      createHourglass(document.querySelector('.hourglass-unit--small'), {
        fallSpeed: 2,
        flipSpeed: FLIP_SPEED,
        sandPalette: SAND_PALETTES.small,
        onStateChange: onHourglassStateChange,
      }),
    );

    hourglasses.forEach((hg) => hg.init(animationData));
    initFlipAllButton();
    updateFlipAllButton();
  })
  .catch((e) => {
    console.error(e);
  });
