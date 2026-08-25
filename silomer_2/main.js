const silomerEl = document.getElementById('silomer');
const stageEl = document.querySelector('.stage');
const stageAnchorEl = document.getElementById('stage-anchor');
const playSurfaceEl = document.getElementById('play-surface');
const sceneEl = document.querySelector('.scene');
const forceReadoutEl = document.getElementById('force-readout');
const weightsLayerEl = document.getElementById('weights-layer');
const gravitySwitchEl = document.getElementById('gravity-switch');
const resetBtnEl = document.getElementById('silomer-reset');
const cutBtnEl = document.getElementById('silomer-cut');
const dogPanelsEl = document.getElementById('dog-panels');
const dogWeightLabelEl = document.getElementById('dog-weight-label');
const dogWeightInputEl = document.getElementById('dog-weight-input');
const dogWeightFeedbackEl = document.getElementById('dog-weight-feedback');
const dogMassLabelEl = document.getElementById('dog-mass-label');
const dogMassInputEl = document.getElementById('dog-mass-input');
const dogMassFeedbackEl = document.getElementById('dog-mass-feedback');
const tableKeypadOverlayEl = document.getElementById('tableKeypadOverlay');
const tableKeypadTitleEl = document.getElementById('tableKeypadTitle');
const tableKeypadDisplayEl = document.getElementById('tableKeypadDisplay');
const tableKeypadErrorEl = document.getElementById('tableKeypadError');
const tableKeypadConfirmEl = document.getElementById('tableKeypadConfirm');
const tableKeypadCancelEl = document.getElementById('tableKeypadCancel');
const tableMathKeypadEl = document.getElementById('tableMathKeypad');
const tableMathKeypadKeys = tableMathKeypadEl
  ? tableMathKeypadEl.querySelectorAll('.table-math-keypad__key')
  : [];
const tableKeypadUnitKeys = tableMathKeypadEl
  ? tableMathKeypadEl.querySelectorAll('.table-keypad-units__key')
  : [];
const quizConfettiCanvasEl = document.getElementById('quiz-confetti');
const hintEl = document.getElementById('hintEl');
const workspaceEl = document.getElementById('scene-workspace');

let hintDismissed = false;

function dismissSceneHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  hintEl?.classList.add('is-hidden');
}

const REFERENCE_MASS_KG = 2;
const EARTH_N_PER_KG = 10;
const MAX_FORCE_N = REFERENCE_MASS_KG * EARTH_N_PER_KG;
const ANIM_MS = 900;
const RESET_RISE_MS = 800;
const LOADED_ASPECT = 1175 / 149;
const VIEW_BOX = '0 0 149 1175';
const VIEW_BOX_WIDTH = 149;
const VIEW_BOX_HEIGHT = 1175;
const MAX_STAGE_WIDTH = 168;
const VIEWPORT_PADDING = 28;
const WORKSPACE_GAP = 20;
const LEFT_DOCK_GAP = 120;
const DOCK_COL_GAP = 16;
const DOCK_ROW_GAP = 20;
const DOCK_TOP_NEWTONS = 3.5;
const DOCK_OFFSET_Y = -40;
const DISK_SIZE_MULTIPLIER = 1.4;
const OBJECT_SIZE_MULTIPLIER = 1.85;

const DOCK_LAYOUT_LEFT = [
  [
    { id: 'bottle-1', column: 0 },
    { id: 'car-0.8', column: 1 },
  ],
  [
    { id: 'dog-1.5', column: 0 },
    { id: 'handbag-1.25', column: 1 },
  ],
];

const DOCK_LAYOUT_RIGHT = [
  [
    { id: 'disk-0.1', column: 0 },
    { id: 'disk-0.5', column: 1 },
  ],
  [
    { id: 'disk-1', column: 0 },
    { id: 'disk-1.6', column: 1 },
  ],
  [{ id: 'disk-2', column: 'center' }],
];

const SPRING_ORIGIN_Y = 81.6455;
const SPRING_SCALE_MIN = 0.22;
const CARRIAGE_OFFSET_Y = -389;

const WEIGHT_VIEW_BOX = '0 0 149 162';
const WEIGHT_VIEW_BOX_WIDTH = 149;
const WEIGHT_VIEW_BOX_HEIGHT = 162;
const WEIGHT_HOOK_VB_X = 74;
const WEIGHT_HOOK_VB_Y = 6;
const HOOK_LOADED_VB_Y = 1013.31;
const HOOK_VB_X = 74;
const READOUT_ANCHOR_VB_Y = 590.198;
const SNAP_RADIUS_PX = 80;
const SNAP_ATTACH_OFFSET_Y = 10;

const QUIZ_WEIGHT_VARIANTS = new Set(['dog', 'bottle', 'car', 'handbag']);

const QUIZ_MASS_PANEL_LABELS = {
  dog: {
    earth: 'Hmotnost pejska na Zemi je',
    moon: 'Hmotnost pejska na Měsíci je',
    space: 'Hmotnost pejska v kosmickém prostoru je',
  },
  bottle: {
    earth: 'Hmotnost lahve na Zemi je',
    moon: 'Hmotnost lahve na Měsíci je',
    space: 'Hmotnost lahve v kosmickém prostoru je',
  },
  car: {
    earth: 'Hmotnost autíčka na Zemi je',
    moon: 'Hmotnost autíčka na Měsíci je',
    space: 'Hmotnost autíčka v kosmickém prostoru je',
  },
  handbag: {
    earth: 'Hmotnost kabelky na Zemi je',
    moon: 'Hmotnost kabelky na Měsíci je',
    space: 'Hmotnost kabelky v kosmickém prostoru je',
  },
};

const QUIZ_WEIGHT_PANEL_LABELS = {
  dog: {
    earth: 'Tíha pejska na Zemi je',
    moon: 'Tíha pejska na Měsíci je',
    space: 'Tíha pejska v kosmickém prostoru je',
  },
  bottle: {
    earth: 'Tíha lahve na Zemi je',
    moon: 'Tíha lahve na Měsíci je',
    space: 'Tíha lahve v kosmickém prostoru je',
  },
  car: {
    earth: 'Tíha autíčka na Zemi je',
    moon: 'Tíha autíčka na Měsíci je',
    space: 'Tíha autíčka v kosmickém prostoru je',
  },
  handbag: {
    earth: 'Tíha kabelky na Zemi je',
    moon: 'Tíha kabelky na Měsíci je',
    space: 'Tíha kabelky v kosmickém prostoru je',
  },
};

const QUIZ_MASS_INPUT_LABELS = {
  dog: 'Hmotnost pejska v kilogramech',
  bottle: 'Hmotnost lahve v kilogramech',
  car: 'Hmotnost autíčka v kilogramech',
  handbag: 'Hmotnost kabelky v kilogramech',
};

const QUIZ_FORCE_INPUT_LABELS = {
  dog: 'Tíha pejska v newtonech',
  bottle: 'Tíha lahve v newtonech',
  car: 'Tíha autíčka v newtonech',
  handbag: 'Tíha kabelky v newtonech',
};

const WEIGHT_SPECS = [
  { id: 'disk-0.1', massKg: 0.1 },
  { id: 'disk-0.5', massKg: 0.5 },
  { id: 'car-0.8', massKg: 0.8, variant: 'car' },
  { id: 'bottle-1', massKg: 1, variant: 'bottle' },
  { id: 'disk-1', massKg: 1 },
  { id: 'handbag-1.25', massKg: 1.25, variant: 'handbag' },
  { id: 'dog-1.5', massKg: 1.5, variant: 'dog' },
  { id: 'disk-1.6', massKg: 1.6 },
  { id: 'disk-2', massKg: 2 },
];

const DISK_WEIGHT_GRAPHIC = {
  viewBox: WEIGHT_VIEW_BOX,
  width: WEIGHT_VIEW_BOX_WIDTH,
  height: WEIGHT_VIEW_BOX_HEIGHT,
  hookX: WEIGHT_HOOK_VB_X,
  hookY: WEIGHT_HOOK_VB_Y,
};

const DOG_WEIGHT_GRAPHIC = {
  viewBox: '0 0 91 96',
  width: 91,
  height: 96,
  hookX: 46,
  hookY: 2,
};

const BOTTLE_WEIGHT_GRAPHIC = {
  viewBox: '0 0 87 147',
  width: 87,
  height: 147,
  hookX: 44,
  hookY: 0,
};

const CAR_WEIGHT_GRAPHIC = {
  viewBox: '0 0 163 58',
  width: 163,
  height: 58,
  hookX: 82,
  hookY: 0,
};

const HANDBAG_WEIGHT_GRAPHIC = {
  viewBox: '0 0 154 131',
  width: 154,
  height: 131,
  hookX: 77,
  hookY: 1,
};

const GRAVITY_ENVIRONMENTS = {
  earth: { label: 'Země', nPerKg: 10 },
  moon: { label: 'Měsíc', nPerKg: 1.6 },
  space: { label: 'Kosmický prostor', nPerKg: 0 },
};

let gravityEnvironment = 'earth';

let progress = 0;
let targetProgress = 0;
let animating = false;
let rafId = null;
let onAnimationComplete = null;
let springGroup = null;
let movableGroup = null;
let weightGroup = null;
let topHookGroup = null;
let ceilingGroup = null;
let fallingBodyGroup = null;
let stringPath = null;

let stageWidthPx = 0;
let weights = [];
let draggingWeight = null;
let weightDiskSvgText = '';
let weightDogSvgText = '';
let weightBottleSvgText = '';
let weightCarSvgText = '';
let weightHandbagSvgText = '';

let isCordCut = false;
let isFallComplete = false;
let fallOffsetY = 0;
let fallVelocityPx = 0;
let fallRafId = null;
let lastFallTime = 0;
let resetRafId = null;
let isResetting = false;
let stageAnchorRestore = null;

const FALL_GRAVITY_EARTH_PX = 1800;

function isStringPath(path) {
  const d = path.getAttribute('d') || '';
  return path.getAttribute('stroke') === 'black' && d.includes('32.6455V77');
}

function isScissorsPath(path) {
  return path.getAttribute('fill') === '#DE006E';
}

function isOrangeRingPath(path) {
  const d = path.getAttribute('d') || '';
  return path.getAttribute('stroke') === '#F19100' && d.includes('18.3616');
}

function isCeilingMountPath(path) {
  return isScissorsPath(path) || isOrangeRingPath(path);
}

function getFallGravityPx() {
  return FALL_GRAVITY_EARTH_PX * (getGravityNPerKg() / EARTH_N_PER_KG);
}

function pxToStageVbY(px) {
  const stageHeight = stageEl?.offsetHeight || 1;
  return (px / stageHeight) * VIEW_BOX_HEIGHT;
}

function updateFallLayer() {
  document.body.classList.toggle('is-silomer-falling', isCordCut && fallOffsetY > 0);
  syncFallStacking();
}

function isStageAnchorPortaled() {
  return stageAnchorEl?.parentElement === document.body;
}

function getStageAnchorScreenPosition(stageHeight) {
  const surfaceRect = playSurfaceEl.getBoundingClientRect();
  const surfaceWidth = playSurfaceEl.clientWidth;
  const stageLeft = getStageLeft(surfaceWidth);

  return {
    left: surfaceRect.left + stageLeft,
    top: surfaceRect.top,
    width: stageWidthPx,
    height: stageHeight,
  };
}

function syncFallStacking() {
  if (!stageAnchorEl || !stageEl || !playSurfaceEl) return;

  const falling = isCordCut && fallOffsetY > 0;
  const portaled = isStageAnchorPortaled();

  if (!falling) {
    if (portaled && stageAnchorRestore) {
      const { parent, nextSibling } = stageAnchorRestore;
      if (nextSibling) {
        parent.insertBefore(stageAnchorEl, nextSibling);
      } else {
        parent.appendChild(stageAnchorEl);
      }
      stageAnchorRestore = null;
    }

    stageAnchorEl.classList.remove('is-falling-front');
    stageAnchorEl.style.position = 'absolute';
    stageAnchorEl.style.zIndex = '';

    if (stageEl.offsetHeight) {
      layoutStageAnchor(stageEl.offsetHeight);
    }
    return;
  }

  const screenPos = getStageAnchorScreenPosition(stageEl.offsetHeight);

  if (!portaled) {
    stageAnchorRestore = {
      parent: stageAnchorEl.parentElement,
      nextSibling: stageAnchorEl.nextSibling,
    };
    document.body.appendChild(stageAnchorEl);
  }

  stageAnchorEl.classList.add('is-falling-front');
  stageAnchorEl.style.position = 'fixed';
  stageAnchorEl.style.zIndex = '5';
  stageAnchorEl.style.left = `${screenPos.left}px`;
  stageAnchorEl.style.top = `${screenPos.top}px`;
  stageAnchorEl.style.width = `${screenPos.width}px`;
  stageAnchorEl.style.height = `${screenPos.height}px`;
}

function applyFallTransform() {
  if (!fallingBodyGroup) return;

  const fallVbY = pxToStageVbY(fallOffsetY);
  fallingBodyGroup.setAttribute(
    'transform',
    fallVbY > 0 ? `translate(0 ${fallVbY})` : '',
  );
  updateFallLayer();
  updateLayers();
}

function stopFallAnimation() {
  if (fallRafId) {
    cancelAnimationFrame(fallRafId);
    fallRafId = null;
  }
  lastFallTime = 0;
}

function getFallExitDistancePx() {
  return (stageEl?.offsetHeight ?? 0) + 48;
}

function fallTick(now) {
  if (!lastFallTime) lastFallTime = now;
  const dt = Math.min(0.032, (now - lastFallTime) / 1000);
  lastFallTime = now;

  const gravity = getFallGravityPx();
  if (gravity <= 0) {
    stopFallAnimation();
    return;
  }

  fallVelocityPx += gravity * dt;
  fallOffsetY += fallVelocityPx * dt;

  const exitDistance = getFallExitDistancePx();
  if (fallOffsetY >= exitDistance) {
    fallOffsetY = exitDistance;
    fallVelocityPx = 0;
    isFallComplete = true;
    applyFallTransform();
    stopFallAnimation();
    updateResetUi();
    return;
  }

  applyFallTransform();
  fallRafId = requestAnimationFrame(fallTick);
}

function cutCord() {
  if (isCordCut) return;
  isCordCut = true;

  if (stringPath) {
    stringPath.style.display = 'none';
  }

  ceilingGroup?.querySelectorAll('.silomer-scissors, .silomer-scissors-hit').forEach((el) => {
    el.classList.add('is-disabled');
  });

  if (progress > 0.001) {
    animateTo(0);
  }

  const gravity = getFallGravityPx();
  if (gravity <= 0) {
    isFallComplete = true;
    updateResetUi();
    return;
  }

  isFallComplete = false;
  fallVelocityPx = 0;
  stopFallAnimation();
  fallRafId = requestAnimationFrame(fallTick);
  updateResetUi();
}

function updateResetUi() {
  if (cutBtnEl) {
    cutBtnEl.disabled = isCordCut || isResetting;
  }
  if (resetBtnEl) {
    resetBtnEl.disabled = isResetting || animating;
  }
}

function releaseDraggingWeight() {
  if (!draggingWeight) return;

  const weight = draggingWeight;
  weight.el.classList.remove('is-dragging', 'is-snapped');
  weight.dragFromMounted = false;
  weight.snappedToHook = false;
  draggingWeight = null;
}

function resetAllWeights() {
  releaseDraggingWeight();

  weights.forEach((weight) => {
    weight.state = 'docked';
    weight.snappedToHook = false;
    weight.dragFromMounted = false;
    weight.el.classList.remove('is-dragging', 'is-snapped');
  });

  layoutAllDockedWeights();
}

function finishSilomerReset() {
  isCordCut = false;
  isFallComplete = false;
  isResetting = false;
  fallOffsetY = 0;
  fallVelocityPx = 0;

  if (stringPath) {
    stringPath.style.display = '';
  }

  ceilingGroup?.querySelectorAll('.silomer-scissors, .silomer-scissors-hit').forEach((el) => {
    el.classList.remove('is-disabled');
  });

  applyFallTransform();
  updateResetUi();
  updateLayers();
  updateUi();
}

function resetSilomer() {
  if (isResetting) return;

  isResetting = true;
  stopFallAnimation();
  if (resetRafId) cancelAnimationFrame(resetRafId);
  resetRafId = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  animating = false;
  onAnimationComplete = null;

  clearDogQuizInputs();
  resetAllWeights();
  updateResetUi();

  const finishReset = () => {
    targetProgress = 0;

    if (progress > 0.001) {
      animateTo(0);
      onAnimationComplete = () => {
        onAnimationComplete = null;
        finishSilomerReset();
      };
      return;
    }

    progress = 0;
    finishSilomerReset();
  };

  if (isCordCut && fallOffsetY > 0) {
    if (stringPath) {
      stringPath.style.display = '';
    }

    const startFall = fallOffsetY;
    const startTime = performance.now();

    function riseTick(now) {
      const t = Math.min(1, (now - startTime) / RESET_RISE_MS);
      fallOffsetY = startFall * (1 - easeOut(t));
      applyFallTransform();

      if (t < 1) {
        resetRafId = requestAnimationFrame(riseTick);
        return;
      }

      resetRafId = null;
      finishReset();
    }

    resetRafId = requestAnimationFrame(riseTick);
    return;
  }

  finishReset();
}

function setupTopHookInteraction(svg) {
  ceilingGroup = svg.querySelector('#silomer-ceiling');
  topHookGroup = svg.querySelector('#silomer-top-hook');
  if (!ceilingGroup) return;

  ceilingGroup.querySelectorAll('path').forEach((path) => {
    if (!isScissorsPath(path)) return;

    path.classList.add('silomer-scissors');
    path.addEventListener('click', (event) => {
      event.stopPropagation();
      cutCord();
    });
  });

  topHookGroup?.querySelectorAll('path').forEach((path) => {
    if (!isStringPath(path)) return;
    stringPath = path;
    path.classList.add('silomer-cord');
  });

  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  hit.setAttribute('class', 'silomer-scissors-hit');
  hit.setAttribute('x', '56');
  hit.setAttribute('y', '12');
  hit.setAttribute('width', '42');
  hit.setAttribute('height', '52');
  hit.setAttribute('fill', 'transparent');
  hit.addEventListener('click', (event) => {
    event.stopPropagation();
    cutCord();
  });
  ceilingGroup.appendChild(hit);
}

function isHousingBackground(path) {
  const d = path.getAttribute('d') || '';
  return d.startsWith('M73.4024 79.1774') || d.startsWith('M54.1834 79.1774');
}

function isWeightPath(d) {
  return (
    d.includes('1100.79') ||
    d.includes('1113.89') ||
    d.includes('1085.39') ||
    d.includes('1090.79') ||
    d.includes('1031.73') ||
    d.includes('1036.02') ||
    d.includes('1107.02') ||
    d.startsWith('M84.2611 1020')
  );
}

const LAYER_ORDER = [
  'ellipses',
  'movable',
  'frame-mid',
  'top-hook',
  'spring',
  'frame-low',
  'scale-ticks',
  'rails',
  'scale-numbers',
  'weight',
];

function getPathLayer(path) {
  const d = path.getAttribute('d') || '';
  const fill = path.getAttribute('fill') || '';
  const stroke = path.getAttribute('stroke') || '';

  if (isWeightPath(d)) return 'weight';
  if (isHousingBackground(path)) return 'housing';

  if (stroke === '#9C9B9B') return 'ellipses';

  if (
    d.includes('585.074V10') ||
    d.includes('196.074V622') ||
    d.startsWith('M74.0705 10') ||
    d.includes('624.31') ||
    d.includes('590.198') ||
    (d.includes('201.198') && (fill === '#EF3A50' || stroke === '#813A50')) ||
    d.includes('201.2Z') ||
    d.includes('590.2Z')
  ) {
    return 'movable';
  }

  if (
    (stroke === '#1D1D1B' && d.includes('595.948') && !d.includes('608.279')) ||
    (stroke === '#1D1D1B' && d.includes('V591.948'))
  ) {
    return 'frame-mid';
  }

  if (
    fill === '#DE006E' ||
    (stroke === 'black' && d.includes('32.6455V77')) ||
    (stroke === '#F19100' && d.includes('18.3616'))
  ) {
    return 'top-hook';
  }

  if (
    d.startsWith('M34.7273') ||
    d.startsWith('M15.5085') ||
    d.startsWith('M114.718 137')
  ) {
    return 'spring';
  }

  if (stroke === '#1D1D1B' && (d.startsWith('M24.5117 92') || d.startsWith('M5.29272 92'))) {
    return 'frame-low';
  }

  if (stroke === '#FF8158') return 'scale-ticks';

  if (
    stroke === '#1D1D1B' &&
    (d.startsWith('M24.5098 92.5278V') || d.startsWith('M5.29102 92.5278V'))
  ) {
    return 'rails';
  }

  if (fill === '#FF8158') return 'scale-numbers';

  return 'frame-mid';
}

function massToScale(massKg) {
  return Math.pow(massKg / REFERENCE_MASS_KG, 1 / 3);
}

function getVariantSizeBoost(variant) {
  return variant && variant !== 'disk' ? OBJECT_SIZE_MULTIPLIER : DISK_SIZE_MULTIPLIER;
}

function getGravityNPerKg() {
  return GRAVITY_ENVIRONMENTS[gravityEnvironment].nPerKg;
}

function getTargetProgress(massKg) {
  return (massKg * getGravityNPerKg()) / MAX_FORCE_N;
}

function formatMassLabel(massKg) {
  return `${massKg.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} kg`;
}

function formatForce(value) {
  const force = value * MAX_FORCE_N;
  if (force < 0.05) return '0 N';
  return `${force.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} N`;
}

function easeOut(t) {
  return t * (2 - t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getMountedWeight() {
  return weights.find((weight) => weight.state === 'mounted') ?? null;
}

function vbToScreen(vx, vy) {
  const rect = stageEl.getBoundingClientRect();
  return {
    x: rect.left + (vx / VIEW_BOX_WIDTH) * rect.width,
    y: rect.top + (vy / VIEW_BOX_HEIGHT) * rect.height,
  };
}

function getRenderedHookVbY() {
  const carriageY = lerp(CARRIAGE_OFFSET_Y, 0, progress);
  return HOOK_LOADED_VB_Y + carriageY;
}

function getIndicatorVbY() {
  const carriageY = lerp(CARRIAGE_OFFSET_Y, 0, progress);
  return READOUT_ANCHOR_VB_Y + carriageY;
}

function layoutForceReadout() {
  if (!forceReadoutEl || !stageEl) return;

  const stageHeight = stageEl.offsetHeight;
  const indicatorY = (getIndicatorVbY() / VIEW_BOX_HEIGHT) * stageHeight;
  forceReadoutEl.style.top = `${indicatorY}px`;
  forceReadoutEl.style.transform =
    isCordCut && fallOffsetY > 0
      ? `translateY(calc(${fallOffsetY}px - 50%))`
      : 'translateY(-50%)';
}

function layoutDogPanels() {
  if (!dogPanelsEl || !stageEl) return;

  const stageHeight = stageEl.offsetHeight;
  const hookY = (getRenderedHookVbY() / VIEW_BOX_HEIGHT) * stageHeight;
  dogPanelsEl.style.top = `${hookY}px`;
  dogPanelsEl.style.transform =
    isCordCut && fallOffsetY > 0
      ? `translateY(calc(${fallOffsetY}px - 50%))`
      : 'translateY(-50%)';
}

function normalizeQuizUnit(unit) {
  if (!unit) return '';
  const normalized = String(unit).trim();
  if (normalized === 'N' || normalized === 'n') return 'N';
  if (normalized.toLowerCase() === 'kg') return 'kg';
  if (normalized.toLowerCase() === 'g') return 'g';
  return '';
}

function parseQuizAnswer(text) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { numericText: '', value: null, unit: '' };

  const match = trimmed.match(/^([+-]?\d+(?:[.,]\d+)?)\s*(N|kg|g)?$/i);
  if (!match) return { numericText: trimmed, value: null, unit: '' };

  const numericText = match[1].replace('.', ',');
  const value = Number.parseFloat(match[1].replace(',', '.'));
  return {
    numericText,
    value: Number.isFinite(value) ? value : null,
    unit: normalizeQuizUnit(match[2]),
  };
}

function getExpectedQuizUnit(field) {
  return field === 'mass' ? 'kg' : 'N';
}

function convertQuizMassToKg(value, unit) {
  if (!Number.isFinite(value)) return null;
  if (unit === 'kg') return value;
  if (unit === 'g') return value / 1000;
  return null;
}

function stripQuizNumericDraft(text) {
  return parseQuizAnswer(text).numericText;
}

function formatQuizAnswerWithUnit(numericText, unit) {
  const draft = stripQuizNumericDraft(numericText);
  const selectedUnit = normalizeQuizUnit(unit);
  if (!draft) return '';
  return selectedUnit ? `${draft} ${selectedUnit}` : draft;
}

function formatQuizKeypadDisplay(numericText, unit) {
  return formatQuizAnswerWithUnit(numericText, unit);
}

const QUIZ_KEYPAD_MAX_LENGTH = 12;

let quizKeypadEdit = null;
let quizConfettiRaf = null;

function launchGreenConfetti(originEl) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = quizConfettiCanvasEl;
  if (!canvas) return;

  if (quizConfettiRaf) {
    cancelAnimationFrame(quizConfettiRaf);
    quizConfettiRaf = null;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w <= 0 || h <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let cx = w / 2;
  let cy = h * 0.42;
  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }
  }

  const colors = ['#1f7a3f', '#2ecc71', '#27ae60', '#58d68d', '#abebc6', '#145a32', '#82e0aa'];
  const particles = Array.from({ length: 130 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7.5;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      w: 4 + Math.random() * 7,
      h: 3 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.36,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: 0.01 + Math.random() * 0.012,
    };
  });

  const start = performance.now();
  const duration = 2600;

  function frame(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.vy += 0.14;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive && elapsed < duration) {
      quizConfettiRaf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
      quizConfettiRaf = null;
    }
  }

  quizConfettiRaf = requestAnimationFrame(frame);
}

function prefersAppNumericKeypad() {
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
    if (
      typeof navigator.maxTouchPoints === 'number' &&
      navigator.maxTouchPoints > 0 &&
      window.matchMedia('(hover: none)').matches
    ) {
      return true;
    }
  } catch (_err) {
    /* ignore */
  }
  return false;
}

const useAppNumericKeypad = prefersAppNumericKeypad();

function applyQuizNumericKeypadMode(input) {
  if (!input) return;
  input.classList.add('app-numeric-input');
  if (useAppNumericKeypad) {
    input.readOnly = true;
    input.setAttribute('inputmode', 'none');
  } else {
    input.readOnly = false;
    input.setAttribute('inputmode', 'decimal');
  }
}

function getQuizKeypadTitle(field) {
  return field === 'mass' ? 'Hmotnost' : 'Tíha';
}

function clearQuizKeypadError() {
  if (tableKeypadErrorEl) {
    tableKeypadErrorEl.hidden = true;
    tableKeypadErrorEl.textContent = '';
  }
  if (tableKeypadDisplayEl) {
    tableKeypadDisplayEl.classList.remove('is-invalid');
  }
}

function showQuizKeypadError(message) {
  if (tableKeypadErrorEl) {
    tableKeypadErrorEl.hidden = false;
    tableKeypadErrorEl.textContent = message;
  }
  if (tableKeypadDisplayEl) {
    tableKeypadDisplayEl.classList.add('is-invalid');
  }
}

function validateQuizKeypadValue() {
  if (!quizKeypadEdit) return { ok: false, message: '' };

  const raw = quizKeypadEdit.value.trim();
  if (!raw || raw === ',' || raw === '.') {
    return { ok: false, message: 'Zadej platné číslo.' };
  }

  const parsed = parseQuizAnswer(raw);
  if (parsed.value === null) {
    return { ok: false, message: 'Zadej platné číslo.' };
  }

  if (!quizKeypadEdit.unit) {
    return { ok: false, message: 'Vyber jednotku.' };
  }

  return { ok: true };
}

function updateQuizKeypadUnitButtons() {
  tableKeypadUnitKeys.forEach((button) => {
    const isActive = button.dataset.unit === quizKeypadEdit?.unit;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function setQuizKeypadUnit(unit) {
  if (!quizKeypadEdit) return;
  quizKeypadEdit.unit = normalizeQuizUnit(unit);
  updateQuizKeypadDisplay();
}

function updateQuizKeypadDisplay() {
  if (!quizKeypadEdit || !tableKeypadDisplayEl) return;

  tableKeypadDisplayEl.textContent = formatQuizKeypadDisplay(
    quizKeypadEdit.value,
    quizKeypadEdit.unit,
  );
  updateQuizKeypadUnitButtons();
  clearQuizKeypadError();
}

function openQuizKeypad(field, input) {
  if (!tableKeypadOverlayEl || !input) return;

  const parsed = parseQuizAnswer(input.value);
  quizKeypadEdit = {
    field,
    input,
    value: parsed.numericText,
    unit: parsed.unit,
  };

  if (tableKeypadTitleEl) {
    tableKeypadTitleEl.textContent = getQuizKeypadTitle(field);
  }

  clearQuizKeypadError();
  tableKeypadOverlayEl.hidden = false;
  updateQuizKeypadDisplay();

  try {
    input.blur();
  } catch (_err) {
    /* ignore */
  }
}

function closeQuizKeypad() {
  quizKeypadEdit = null;
  clearQuizKeypadError();
  if (tableKeypadOverlayEl) tableKeypadOverlayEl.hidden = true;
  if (tableKeypadDisplayEl) tableKeypadDisplayEl.textContent = '';
  updateQuizKeypadUnitButtons();
}

function insertIntoQuizKeypadValue(nextChar) {
  if (!quizKeypadEdit) return;

  if (nextChar === ',' || nextChar === '.') {
    if (quizKeypadEdit.value.includes(',') || quizKeypadEdit.value.includes('.')) {
      return;
    }
    nextChar = ',';
  }

  if (quizKeypadEdit.value.length >= QUIZ_KEYPAD_MAX_LENGTH) return;
  quizKeypadEdit.value = `${quizKeypadEdit.value}${nextChar}`;
  updateQuizKeypadDisplay();
}

function clearQuizKeypadValue() {
  if (!quizKeypadEdit) return;
  quizKeypadEdit.value = '';
  updateQuizKeypadDisplay();
}

function confirmQuizKeypad() {
  if (!quizKeypadEdit) return;

  const { field, input, value, unit } = quizKeypadEdit;
  const result = validateQuizKeypadValue();
  if (!result.ok) {
    showQuizKeypadError(result.message);
    return;
  }

  input.value = formatQuizAnswerWithUnit(value.trim(), unit);
  closeQuizKeypad();

  if (field === 'mass') {
    verifyDogMassInput();
  } else {
    verifyDogWeightInput();
  }
}

function handleQuizKeypadClick(event) {
  const key = event.currentTarget;
  if (!(key instanceof HTMLButtonElement) || key.disabled) return;

  const action = key.dataset.action;
  const value = key.dataset.value;

  if (action === 'clear') {
    clearQuizKeypadValue();
    return;
  }

  if (value) {
    insertIntoQuizKeypadValue(value);
  }
}

function handleQuizUnitClick(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement) || button.disabled) return;
  setQuizKeypadUnit(button.dataset.unit);
}

function wireQuizKeypadInput(input, field) {
  if (!input) return;

  applyQuizNumericKeypadMode(input);

  input.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    openQuizKeypad(field, input);
  });

  input.addEventListener('focus', () => {
    if (useAppNumericKeypad) {
      try {
        input.blur();
      } catch (_err) {
        /* ignore */
      }
      openQuizKeypad(field, input);
    }
  });
}

function clearDogMassFeedback() {
  if (!dogMassFeedbackEl) return;
  dogMassFeedbackEl.hidden = true;
  dogMassFeedbackEl.textContent = '';
  dogMassFeedbackEl.classList.remove('is-success', 'is-error');
}

function clearDogWeightFeedback() {
  if (!dogWeightFeedbackEl) return;
  dogWeightFeedbackEl.hidden = true;
  dogWeightFeedbackEl.textContent = '';
  dogWeightFeedbackEl.classList.remove('is-success', 'is-error');
}

function clearDogQuizInputs() {
  closeQuizKeypad();
  clearDogMassFeedback();
  clearDogWeightFeedback();
  if (dogMassInputEl) dogMassInputEl.value = '';
  if (dogWeightInputEl) dogWeightInputEl.value = '';
}

function showDogMassFeedback(message, kind) {
  if (!dogMassFeedbackEl) return;
  dogMassFeedbackEl.textContent = message;
  dogMassFeedbackEl.hidden = false;
  dogMassFeedbackEl.classList.toggle('is-success', kind === 'success');
  dogMassFeedbackEl.classList.toggle('is-error', kind === 'error');
}

function showDogWeightFeedback(message, kind) {
  if (!dogWeightFeedbackEl) return;
  dogWeightFeedbackEl.textContent = message;
  dogWeightFeedbackEl.hidden = false;
  dogWeightFeedbackEl.classList.toggle('is-success', kind === 'success');
  dogWeightFeedbackEl.classList.toggle('is-error', kind === 'error');
}

function verifyDogWeightInput() {
  const quizWeight = getMountedQuizWeight();
  if (!quizWeight) return;

  const parsed = parseQuizAnswer(dogWeightInputEl?.value ?? '');
  if (parsed.value === null) {
    showDogWeightFeedback('Zadej číslo v newtonech.', 'error');
    return;
  }

  const targetWeightN = quizWeight.massKg * getGravityNPerKg();
  const unitOk = parsed.unit === getExpectedQuizUnit('weight');
  if (unitOk && Math.abs(parsed.value - targetWeightN) < 0.1) {
    if (dogWeightInputEl) {
      dogWeightInputEl.value = formatQuizAnswerWithUnit(parsed.numericText, parsed.unit);
    }
    showDogWeightFeedback('Správně!', 'success');
    launchGreenConfetti(dogWeightInputEl);
    return;
  }

  showDogWeightFeedback('To není správně. Zkus to znovu.', 'error');
}

function verifyDogMassInput() {
  const quizWeight = getMountedQuizWeight();
  if (!quizWeight) return;

  const parsed = parseQuizAnswer(dogMassInputEl?.value ?? '');
  if (parsed.value === null) {
    showDogMassFeedback('Zadej číslo v kilogramech.', 'error');
    return;
  }

  const massKg = convertQuizMassToKg(parsed.value, parsed.unit);
  if (massKg !== null && Math.abs(massKg - quizWeight.massKg) < 0.05) {
    if (dogMassInputEl) {
      dogMassInputEl.value = formatQuizAnswerWithUnit(parsed.numericText, parsed.unit);
    }
    showDogMassFeedback('Správně!', 'success');
    launchGreenConfetti(dogMassInputEl);
    return;
  }

  showDogMassFeedback('To není správně. Zkus to znovu.', 'error');
}

function getMountedQuizWeight() {
  const mounted = getMountedWeight();
  if (!mounted || !QUIZ_WEIGHT_VARIANTS.has(mounted.variant)) return null;
  return mounted;
}

function getQuizWeightPanelLabel(variant) {
  return (
    QUIZ_WEIGHT_PANEL_LABELS[variant]?.[gravityEnvironment] ??
    QUIZ_WEIGHT_PANEL_LABELS.dog.earth
  );
}

function getQuizMassPanelLabel(variant) {
  return (
    QUIZ_MASS_PANEL_LABELS[variant]?.[gravityEnvironment] ??
    QUIZ_MASS_PANEL_LABELS.dog.earth
  );
}

function updateDogPanels() {
  if (!dogPanelsEl) return;

  const quizWeight = getMountedQuizWeight();
  const show = Boolean(quizWeight);
  dogPanelsEl.hidden = !show;

  if (quizWeight) {
    if (dogWeightLabelEl) {
      dogWeightLabelEl.textContent = getQuizWeightPanelLabel(quizWeight.variant);
    }
    if (dogMassLabelEl) {
      dogMassLabelEl.textContent = getQuizMassPanelLabel(quizWeight.variant);
    }
    if (dogWeightInputEl) {
      dogWeightInputEl.setAttribute(
        'aria-label',
        QUIZ_FORCE_INPUT_LABELS[quizWeight.variant] ?? QUIZ_FORCE_INPUT_LABELS.dog,
      );
    }
    if (dogMassInputEl) {
      dogMassInputEl.setAttribute(
        'aria-label',
        QUIZ_MASS_INPUT_LABELS[quizWeight.variant] ?? QUIZ_MASS_INPUT_LABELS.dog,
      );
    }
  }

  if (!show) {
    clearDogQuizInputs();
  }
}

function getHookScreenPoint() {
  const point = vbToScreen(HOOK_VB_X, getRenderedHookVbY());
  if (isCordCut) {
    point.y += fallOffsetY;
  }
  return point;
}

function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function getWeightSpec(massKg) {
  return WEIGHT_SPECS.find((spec) => spec.massKg === massKg);
}

function getWeightSpecById(id) {
  return WEIGHT_SPECS.find((spec) => spec.id === id) ?? null;
}

function getWeightGraphicForSpec(spec) {
  if (spec?.variant === 'dog') return DOG_WEIGHT_GRAPHIC;
  if (spec?.variant === 'bottle') return BOTTLE_WEIGHT_GRAPHIC;
  if (spec?.variant === 'car') return CAR_WEIGHT_GRAPHIC;
  if (spec?.variant === 'handbag') return HANDBAG_WEIGHT_GRAPHIC;
  return DISK_WEIGHT_GRAPHIC;
}

function getWeightSvgText(variant) {
  if (variant === 'dog') return weightDogSvgText;
  if (variant === 'bottle') return weightBottleSvgText;
  if (variant === 'car') return weightCarSvgText;
  if (variant === 'handbag') return weightHandbagSvgText;
  return weightDiskSvgText;
}

function getWeightElementClass(variant) {
  if (variant === 'dog') return 'weight-piece weight-piece--dog';
  if (variant === 'bottle') return 'weight-piece weight-piece--bottle';
  if (variant === 'car') return 'weight-piece weight-piece--car';
  if (variant === 'handbag') return 'weight-piece weight-piece--handbag';
  return 'weight-piece';
}

function getWeightAriaLabel(spec) {
  const massLabel = formatMassLabel(spec.massKg);
  if (spec.variant === 'dog') {
    return `Závaží pes ${massLabel}, přetáhni na háček siloměru nebo sundej tažením pryč`;
  }
  if (spec.variant === 'bottle') {
    return `Závaží láhev ${massLabel}, přetáhni na háček siloměru nebo sundej tažením pryč`;
  }
  if (spec.variant === 'car') {
    return `Závaží autíčko ${massLabel}, přetáhni na háček siloměru nebo sundej tažením pryč`;
  }
  if (spec.variant === 'handbag') {
    return `Závaží kabelka ${massLabel}, přetáhni na háček siloměru nebo sundej tažením pryč`;
  }
  return `Závaží ${massLabel}, přetáhni na háček siloměru nebo sundej tažením pryč`;
}

function getDockColumnIds(layout, column) {
  return layout.flatMap((row) =>
    row.filter((slot) => slot.column === column).map((slot) => slot.id),
  );
}

function getWeightScale(massKg, variant) {
  return massToScale(massKg) * getVariantSizeBoost(variant);
}

function estimateWeightWidth(spec, stageWidth) {
  const graphic = getWeightGraphicForSpec(spec);
  const scale = getWeightScale(spec.massKg, spec.variant);
  return stageWidth * scale * (graphic.width / WEIGHT_VIEW_BOX_WIDTH);
}

function getWeightDimensions(massKgOrWeightOrSpec) {
  const weight =
    massKgOrWeightOrSpec?.el !== undefined && massKgOrWeightOrSpec?.graphic
      ? massKgOrWeightOrSpec
      : null;
  const spec =
    !weight && massKgOrWeightOrSpec?.id && massKgOrWeightOrSpec?.massKg !== undefined
      ? massKgOrWeightOrSpec
      : null;
  const massKg = weight?.massKg ?? spec?.massKg ?? massKgOrWeightOrSpec;
  const resolvedSpec =
    spec ?? getWeightSpec(typeof massKg === 'number' ? massKg : spec?.massKg);
  const graphic = weight?.graphic ?? getWeightGraphicForSpec(resolvedSpec);
  const variant = weight?.variant ?? resolvedSpec?.variant;
  const scale = getWeightScale(massKg, variant);
  const widthPx = stageWidthPx * scale * (graphic.width / WEIGHT_VIEW_BOX_WIDTH);
  const heightPx = widthPx * (graphic.height / graphic.width);
  return { widthPx, heightPx, scale, graphic };
}

function applyWeightSize(weight) {
  const { widthPx, heightPx, scale } = getWeightDimensions(weight);
  weight.widthPx = widthPx;
  weight.heightPx = heightPx;
  weight.el.style.width = `${widthPx}px`;
  weight.el.style.height = `${heightPx}px`;
  if (weight.labelEl) {
    weight.labelEl.style.fontSize = `${Math.max(0.42, 0.88 * scale)}rem`;
  }
}

function getWeightHookOffset(weight) {
  const { graphic, widthPx, heightPx } = getWeightDimensions(weight);
  return {
    x: (graphic.hookX / graphic.width) * widthPx,
    y: (graphic.hookY / graphic.height) * heightPx,
  };
}

function getSnappedWeightPosition(weight) {
  const hook = getHookScreenPoint();
  const offset = getWeightHookOffset(weight);
  return {
    x: hook.x - offset.x,
    y: hook.y - offset.y + SNAP_ATTACH_OFFSET_Y,
  };
}

function isWeightNearHook(weight, x, y) {
  const snapped = getSnappedWeightPosition(weight);
  const snapRadius = Math.max(SNAP_RADIUS_PX, weight.widthPx * 0.45);
  return distance(x, y, snapped.x, snapped.y) <= snapRadius;
}

function canSnapWeight(weight) {
  const mounted = getMountedWeight();
  if (mounted && mounted !== weight) return false;
  if (progress > 0.001 && (!mounted || mounted !== weight)) return false;
  return true;
}

function fitStage() {
  if (!stageEl || !playSurfaceEl || !sceneEl) return;

  const workspaceEl = playSurfaceEl.parentElement;
  const workspaceStyle = workspaceEl ? getComputedStyle(workspaceEl) : null;
  const workspacePaddingY = workspaceEl
    ? parseFloat(workspaceStyle.paddingTop) + parseFloat(workspaceStyle.paddingBottom)
    : 0;
  const workspacePaddingX = workspaceEl
    ? parseFloat(workspaceStyle.paddingLeft) + parseFloat(workspaceStyle.paddingRight)
    : 0;

  const sceneStyle = getComputedStyle(sceneEl);
  const scenePaddingY =
    parseFloat(sceneStyle.paddingTop) + parseFloat(sceneStyle.paddingBottom);
  const scenePaddingX =
    parseFloat(sceneStyle.paddingLeft) + parseFloat(sceneStyle.paddingRight);
  const sceneGap = parseFloat(sceneStyle.columnGap || sceneStyle.gap || '0');
  const setupPanelEl = sceneEl.querySelector('.setup-panel');
  const panelWidth = setupPanelEl?.offsetWidth ?? 0;

  const availableHeight =
    (workspaceEl?.clientHeight ?? window.innerHeight) - workspacePaddingY - VIEWPORT_PADDING;
  const availableWidth =
    window.innerWidth -
    scenePaddingX -
    panelWidth -
    sceneGap -
    workspacePaddingX -
    VIEWPORT_PADDING;

  const widthFromHeight = availableHeight / LOADED_ASPECT;
  const stageWidthCandidate = Math.min(MAX_STAGE_WIDTH, availableWidth, widthFromHeight);
  const docks = getContentGroupMetrics(stageWidthCandidate);
  const maxStageFromWidth = availableWidth - docks.left - docks.right - LEFT_DOCK_GAP - WORKSPACE_GAP;
  stageWidthPx = Math.min(stageWidthCandidate, Math.max(48, maxStageFromWidth));
  const stageHeight = stageWidthPx * LOADED_ASPECT;

  stageEl.style.width = `${stageWidthPx}px`;
  stageEl.style.height = `${stageHeight}px`;

  weights.forEach(applyWeightSize);
  layoutStageAnchor(stageHeight);

  weights.forEach((weight) => {
    if (weight.state === 'docked') return;
    if (weight.state === 'mounted') {
      weight.pos = getSnappedWeightPosition(weight);
    } else {
      clampWeightPosition(weight);
    }
    applyWeightPosition(weight);
  });

  layoutAllDockedWeights();
  layoutGroundSurfaces();
  syncFallStacking();
}

function layoutSceneHint() {
  if (!hintEl || !stageAnchorEl) return;

  const stageRect = stageAnchorEl.getBoundingClientRect();
  const hook = getHookScreenPoint();
  hintEl.style.left = `${stageRect.left + stageRect.width / 2}px`;
  hintEl.style.top = `${hook.y + 56}px`;
}

function layoutGroundSurfaces() {
  if (!stageAnchorEl || !playSurfaceEl) return;

  const workspace = playSurfaceEl.parentElement;
  if (!workspace) return;

  const stageRect = stageAnchorEl.getBoundingClientRect();
  const workspaceRect = workspace.getBoundingClientRect();
  const centerX = stageRect.left + stageRect.width / 2 - workspaceRect.left;
  document.documentElement.style.setProperty('--ground-surface-center-x', `${centerX}px`);
  document.documentElement.style.setProperty('--ground-surface-bottom', '0px');
  layoutSceneHint();
}

function scaleNewtonsToScreenY(newtons) {
  const SCALE_TOP_VB_Y = 210;
  const SCALE_BOTTOM_VB_Y = 598;
  const stageRect = stageEl.getBoundingClientRect();
  const t = newtons / MAX_FORCE_N;
  const vbY = lerp(SCALE_TOP_VB_Y, SCALE_BOTTOM_VB_Y, t);
  return stageRect.top + (vbY / VIEW_BOX_HEIGHT) * stageRect.height;
}

function getWeightById(id) {
  return weights.find((weight) => weight.id === id) ?? null;
}

function getDockSlotX(slot, weight, metrics) {
  const { dockX, gridWidth } = metrics;

  if (slot.column === 1) return dockX + gridWidth - weight.widthPx;
  if (slot.column === 'center') return dockX + (gridWidth - weight.widthPx) / 2;
  return dockX;
}

function getLiveWeightWidth(id) {
  return getWeightDimensions(getWeightSpecById(id)).widthPx;
}

function getEstimatedWeightWidth(stageWidth) {
  return (id) => estimateWeightWidth(getWeightSpecById(id), stageWidth);
}

function getDockSideMetrics(layout, getWidth) {
  const leftIds = getDockColumnIds(layout, 0);
  const rightIds = getDockColumnIds(layout, 1);
  const widthOf = (ids) => (ids.length ? Math.max(...ids.map(getWidth)) : 0);
  const leftColWidth = widthOf(leftIds);
  const rightColWidth = widthOf(rightIds);
  const gridWidth =
    leftIds.length && rightIds.length
      ? leftColWidth + DOCK_COL_GAP + rightColWidth
      : Math.max(leftColWidth, rightColWidth);

  return { leftColWidth, rightColWidth, gridWidth };
}

function getContentGroupMetrics(stageWidth = stageWidthPx) {
  const getWidth = getEstimatedWeightWidth(stageWidth);
  const left = getDockSideMetrics(DOCK_LAYOUT_LEFT, getWidth).gridWidth;
  const right = getDockSideMetrics(DOCK_LAYOUT_RIGHT, getWidth).gridWidth;
  const groupWidth = left + LEFT_DOCK_GAP + stageWidth + WORKSPACE_GAP + right;
  return { left, right, groupWidth };
}

function getStageLeft(surfaceWidth, stageWidth = stageWidthPx) {
  const { left, groupWidth } = getContentGroupMetrics(stageWidth);
  const groupLeft = Math.max(0, (surfaceWidth - groupWidth) / 2);
  return groupLeft + left + LEFT_DOCK_GAP;
}

function layoutDockedSide(layout, dockX, startRowTop) {
  const metrics = {
    dockX,
    ...getDockSideMetrics(layout, getLiveWeightWidth),
  };
  let rowTop = startRowTop;

  layout.forEach((row) => {
    const rowHeight = Math.max(
      ...row.map((slot) => getWeightDimensions(getWeightSpecById(slot.id)).heightPx),
    );

    row.forEach((slot) => {
      const weight = getWeightById(slot.id);
      if (!weight || weight.state !== 'docked') return;

      weight.pos = {
        x: getDockSlotX(slot, weight, metrics),
        y: rowTop + (rowHeight - weight.heightPx) / 2,
      };
      applyWeightPosition(weight);
    });

    rowTop += rowHeight + DOCK_ROW_GAP;
  });
}

function layoutAllDockedWeights() {
  const anchorRect = stageAnchorEl.getBoundingClientRect();
  const firstRowHeight = Math.max(
    ...DOCK_LAYOUT_LEFT[0].map((slot) => getWeightDimensions(getWeightSpecById(slot.id)).heightPx),
    ...DOCK_LAYOUT_RIGHT[0].map((slot) => getWeightDimensions(getWeightSpecById(slot.id)).heightPx),
  );
  const rowTop = scaleNewtonsToScreenY(DOCK_TOP_NEWTONS) - firstRowHeight / 2 + DOCK_OFFSET_Y;
  const leftMetrics = getDockSideMetrics(DOCK_LAYOUT_LEFT, getLiveWeightWidth);

  layoutDockedSide(DOCK_LAYOUT_LEFT, anchorRect.left - LEFT_DOCK_GAP - leftMetrics.gridWidth, rowTop);
  layoutDockedSide(DOCK_LAYOUT_RIGHT, anchorRect.left + stageWidthPx + WORKSPACE_GAP, rowTop);
}

function layoutStageAnchor(stageHeight) {
  const surfaceWidth = playSurfaceEl.clientWidth;
  const stageLeft = getStageLeft(surfaceWidth);

  if (!isStageAnchorPortaled()) {
    stageAnchorEl.style.width = `${stageWidthPx}px`;
    stageAnchorEl.style.height = `${stageHeight}px`;
    stageAnchorEl.style.left = `${stageLeft}px`;
    stageAnchorEl.style.top = '0';
  }

  const workspaceEl = playSurfaceEl.parentElement;
  if (!workspaceEl) {
    playSurfaceEl.style.height = `${stageHeight}px`;
    return;
  }

  const workspaceStyle = getComputedStyle(workspaceEl);
  const workspacePaddingY =
    parseFloat(workspaceStyle.paddingTop) + parseFloat(workspaceStyle.paddingBottom);
  const surfaceHeight = Math.max(stageHeight, workspaceEl.clientHeight - workspacePaddingY);
  playSurfaceEl.style.height = `${surfaceHeight}px`;

  if (isStageAnchorPortaled()) {
    syncFallStacking();
  }
}

function applyWeightPosition(weight) {
  weight.el.style.left = `${weight.pos.x}px`;
  weight.el.style.top = `${weight.pos.y}px`;
}

function clampWeightPosition(weight) {
  const maxX = Math.max(0, window.innerWidth - weight.widthPx);
  const maxY = Math.max(0, window.innerHeight - weight.heightPx);

  weight.pos.x = Math.min(Math.max(0, weight.pos.x), maxX);
  weight.pos.y = Math.min(Math.max(0, weight.pos.y), maxY);
}

function updateLayers() {
  if (!springGroup || !movableGroup || !weightGroup) return;

  const springScale = lerp(SPRING_SCALE_MIN, 1, progress);
  const carriageY = lerp(CARRIAGE_OFFSET_Y, 0, progress);

  springGroup.setAttribute(
    'transform',
    `translate(0 ${SPRING_ORIGIN_Y}) scale(1 ${springScale}) translate(0 ${-SPRING_ORIGIN_Y})`,
  );
  movableGroup.setAttribute('transform', `translate(0 ${carriageY})`);
  weightGroup.setAttribute('transform', `translate(0 ${carriageY})`);
  weightGroup.style.opacity = '0';
  weightGroup.style.visibility = 'hidden';
  weightGroup.style.display = 'none';

  weights.forEach((weight) => {
    const mounting = weight.state === 'animating';
    const mounted = weight.state === 'mounted';
    if (mounting || mounted || (weight.state === 'dragging' && weight.snappedToHook)) {
      weight.pos = getSnappedWeightPosition(weight);
      applyWeightPosition(weight);
    }
  });

  layoutForceReadout();
  layoutDogPanels();
}

function isWeightVisible(weight) {
  return (
    weight.state === 'docked' ||
    weight.state === 'free' ||
    weight.state === 'dragging' ||
    weight.state === 'mounted' ||
    weight.state === 'animating'
  );
}

function updateUi() {
  const mountedWeight = getMountedWeight();
  forceReadoutEl.textContent = formatForce(progress);

  weights.forEach((weight) => {
    const show = isWeightVisible(weight);
    weight.el.classList.toggle('is-hidden', !show);
    weight.el.setAttribute('aria-hidden', String(!show));
  });

  playSurfaceEl.classList.toggle('is-mounted', Boolean(mountedWeight));
  updateDogPanels();
  updateGravityUi();
  updateResetUi();
}

function updateGravityUi() {
  if (!gravitySwitchEl) return;

  gravitySwitchEl.querySelectorAll('[data-env]').forEach((button) => {
    const isActive = button.dataset.env === gravityEnvironment;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('is-active', isActive);
    button.disabled = animating;
  });

  updateSpaceTheme();
}

function updateSpaceTheme() {
  const isMoon = gravityEnvironment === 'moon';
  const isSpaceTheme = isMoon || gravityEnvironment === 'space';
  document.body.classList.toggle('is-space-theme', isSpaceTheme);
  document.body.classList.toggle('is-moon-theme', isMoon);
}

function restoreSilomerOnCord() {
  if (!isCordCut) return false;

  stopFallAnimation();
  if (resetRafId) {
    cancelAnimationFrame(resetRafId);
    resetRafId = null;
  }
  isResetting = false;
  finishSilomerReset();
  return true;
}

function setGravityEnvironment(nextEnv) {
  if (!GRAVITY_ENVIRONMENTS[nextEnv] || gravityEnvironment === nextEnv) return;

  gravityEnvironment = nextEnv;
  clearDogQuizInputs();

  if (restoreSilomerOnCord()) return;

  updateGravityUi();

  const mounted = getMountedWeight();
  if (mounted) {
    animateTo(getTargetProgress(mounted.massKg));
    return;
  }

  if (progress > 0.001) {
    animateTo(0);
    return;
  }

  updateUi();
}

function tick(now, startTime, from, to) {
  const t = Math.min(1, (now - startTime) / ANIM_MS);
  progress = from + (to - from) * easeOut(t);
  updateLayers();
  updateUi();

  if (t < 1) {
    rafId = requestAnimationFrame((frameNow) => tick(frameNow, startTime, from, to));
    return;
  }

  progress = to;
  targetProgress = to;
  animating = false;
  updateLayers();
  updateUi();
  rafId = null;

  if (onAnimationComplete) {
    const callback = onAnimationComplete;
    onAnimationComplete = null;
    callback();
  }
}

function animateTo(nextTarget) {
  if (animating && targetProgress === nextTarget) return;
  if (!animating && Math.abs(progress - nextTarget) < 0.001) {
    if (onAnimationComplete) {
      const callback = onAnimationComplete;
      onAnimationComplete = null;
      callback();
    }
    return;
  }

  if (rafId) cancelAnimationFrame(rafId);

  const from = progress;
  targetProgress = nextTarget;
  animating = true;
  updateUi();
  rafId = requestAnimationFrame((now) => tick(now, now, from, nextTarget));
}

function createWeightElement(spec) {
  const variant = spec.variant ?? 'disk';
  const graphic = getWeightGraphicForSpec(spec);
  const weight = {
    id: spec.id,
    massKg: spec.massKg,
    variant,
    graphic,
    el: null,
    labelEl: null,
    state: 'docked',
    pos: { x: 0, y: 0 },
    widthPx: 0,
    heightPx: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
    snappedToHook: false,
    dragFromMounted: false,
  };

  const el = document.createElement('div');
  el.className = getWeightElementClass(variant);
  el.tabIndex = 0;
  el.role = 'button';
  el.dataset.massKg = String(spec.massKg);
  el.dataset.weightId = spec.id;
  el.setAttribute('aria-label', getWeightAriaLabel(spec));

  const graphicEl = document.createElement('div');
  graphicEl.className = 'weight-piece-graphic';
  graphicEl.innerHTML = getWeightSvgText(variant).trim();

  const svg = graphicEl.querySelector('svg');
  if (svg) {
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('viewBox', graphic.viewBox);
    svg.setAttribute('aria-hidden', 'true');
  }

  if (variant === 'disk') {
    const labelEl = document.createElement('span');
    labelEl.className = 'weight-label';
    labelEl.textContent = formatMassLabel(spec.massKg);
    el.append(labelEl);
    weight.labelEl = labelEl;
  }

  el.prepend(graphicEl);
  el.addEventListener('pointerdown', (event) => onPointerDown(event, weight));
  weightsLayerEl.appendChild(el);

  weight.el = el;
  return weight;
}

function leaveWeightAt(weight, clientX, clientY) {
  weight.pos.x = clientX - weight.dragOffsetX;
  weight.pos.y = clientY - weight.dragOffsetY;
  clampWeightPosition(weight);
  applyWeightPosition(weight);
  weight.state = 'free';
  weight.el.classList.remove('is-dragging');
  draggingWeight = null;
  updateUi();
}

function mountWeightOnHook(weight) {
  weight.state = 'animating';
  weight.el.classList.remove('is-dragging');
  draggingWeight = null;
  updateUi();
  updateLayers();

  onAnimationComplete = () => {
    weight.state = 'mounted';
    weight.pos = getSnappedWeightPosition(weight);
    applyWeightPosition(weight);
    updateLayers();
    updateUi();
  };

  animateTo(getTargetProgress(weight.massKg));
}

function unmountByDrag(weight, clientX, clientY) {
  leaveWeightAt(weight, clientX, clientY);
  updateLayers();
  updateUi();
  animateTo(0);
}

function canStartDrag(weight) {
  if (animating) return false;

  if (weight.state === 'mounted') {
    return Math.abs(progress - getTargetProgress(weight.massKg)) < 0.02;
  }

  const mounted = getMountedWeight();
  if (mounted) {
    return weight.state === 'free' || weight.state === 'docked';
  }

  return (weight.state === 'docked' || weight.state === 'free') && progress < 0.001;
}

function onPointerDown(event, weight) {
  if (!canStartDrag(weight)) return;
  if (event.button !== undefined && event.button !== 0) return;

  dismissSceneHint();
  event.preventDefault();
  const rect = weight.el.getBoundingClientRect();
  weight.dragOffsetX = event.clientX - rect.left;
  weight.dragOffsetY = event.clientY - rect.top;

  weight.dragFromMounted = weight.state === 'mounted';
  weight.state = 'dragging';
  weight.snappedToHook =
    weight.dragFromMounted || isWeightNearHook(weight, weight.pos.x, weight.pos.y);
  weight.el.classList.add('is-dragging');
  weight.el.setPointerCapture(event.pointerId);
  draggingWeight = weight;

  moveDraggedWeight(weight, event.clientX, event.clientY);
  updateUi();
}

function moveDraggedWeight(weight, clientX, clientY) {
  let x = clientX - weight.dragOffsetX;
  let y = clientY - weight.dragOffsetY;

  weight.snappedToHook =
    canSnapWeight(weight) && isWeightNearHook(weight, x, y);

  if (weight.snappedToHook) {
    const snapped = getSnappedWeightPosition(weight);
    x = snapped.x;
    y = snapped.y;
  } else {
    weight.pos = { x, y };
    clampWeightPosition(weight);
    x = weight.pos.x;
    y = weight.pos.y;
  }

  weight.pos = { x, y };
  applyWeightPosition(weight);
  weight.el.classList.toggle('is-snapped', weight.snappedToHook);
}

function onPointerMove(event) {
  if (!draggingWeight) return;
  moveDraggedWeight(draggingWeight, event.clientX, event.clientY);
}

function onPointerUp(event) {
  if (!draggingWeight) return;

  const weight = draggingWeight;

  if (weight.el.hasPointerCapture(event.pointerId)) {
    weight.el.releasePointerCapture(event.pointerId);
  }

  moveDraggedWeight(weight, event.clientX, event.clientY);

  const snapped = weight.snappedToHook;
  const fromMounted = weight.dragFromMounted;
  weight.dragFromMounted = false;
  weight.snappedToHook = false;
  weight.el.classList.remove('is-snapped');

  if (snapped && fromMounted) {
    weight.state = 'mounted';
    weight.pos = getSnappedWeightPosition(weight);
    applyWeightPosition(weight);
    weight.el.classList.remove('is-dragging');
    draggingWeight = null;
    updateLayers();
    updateUi();
    return;
  }

  if (snapped) {
    mountWeightOnHook(weight);
    return;
  }

  if (fromMounted) {
    unmountByDrag(weight, event.clientX, event.clientY);
    return;
  }

  leaveWeightAt(weight, event.clientX, event.clientY);
}

function onPointerCancel(event) {
  if (!draggingWeight) return;

  const weight = draggingWeight;

  if (weight.el.hasPointerCapture(event.pointerId)) {
    weight.el.releasePointerCapture(event.pointerId);
  }

  const fromMounted = weight.dragFromMounted;
  weight.dragFromMounted = false;
  weight.snappedToHook = false;
  weight.el.classList.remove('is-snapped');

  if (fromMounted) {
    weight.state = 'mounted';
    weight.pos = getSnappedWeightPosition(weight);
    applyWeightPosition(weight);
    weight.el.classList.remove('is-dragging');
    draggingWeight = null;
    updateLayers();
    updateUi();
    return;
  }

  leaveWeightAt(weight, event.clientX, event.clientY);
}

function mountAnimatedSvg(svgText) {
  const wrap = document.createElement('div');
  wrap.className = 'silomer-layer';
  wrap.innerHTML = svgText.trim();

  const svg = wrap.querySelector('svg');
  if (!svg) return wrap;

  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('viewBox', VIEW_BOX);
  svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');

  const layerGroups = Object.fromEntries(
    LAYER_ORDER.map((name) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('id', `silomer-${name}`);
      return [name, group];
    }),
  );

  ceilingGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  ceilingGroup.setAttribute('id', 'silomer-ceiling');

  fallingBodyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  fallingBodyGroup.setAttribute('id', 'silomer-falling');

  const paths = [...svg.querySelectorAll('path')];
  paths.forEach((path) => {
    const layer = getPathLayer(path);
    if (layer === 'housing') {
      path.remove();
      return;
    }

    if (isCeilingMountPath(path)) {
      ceilingGroup.appendChild(path);
      return;
    }

    layerGroups[layer].appendChild(path);
    if (layer === 'spring') {
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      const strokeWidth = Number.parseFloat(path.getAttribute('stroke-width'));
      if (Number.isFinite(strokeWidth)) {
        path.setAttribute('stroke-width', String(strokeWidth * 0.5));
      }
    }
  });

  LAYER_ORDER.forEach((name) => {
    fallingBodyGroup.appendChild(layerGroups[name]);
  });

  svg.appendChild(ceilingGroup);
  svg.appendChild(fallingBodyGroup);

  springGroup = layerGroups.spring;
  movableGroup = layerGroups.movable;
  weightGroup = layerGroups.weight;

  setupTopHookInteraction(svg);

  return wrap;
}

async function init() {
  const [loadedText, diskText, dogText, bottleText, carText, handbagText] = await Promise.all([
    fetch('assets/silomer-loaded.svg').then((r) => r.text()),
    fetch('assets/weight-disk.svg').then((r) => r.text()),
    fetch('assets/weight-dog.svg').then((r) => r.text()),
    fetch('assets/weight-bottle.svg').then((r) => r.text()),
    fetch('assets/weight-car.svg').then((r) => r.text()),
    fetch('assets/weight-handbag.svg').then((r) => r.text()),
  ]);

  weightDiskSvgText = diskText;
  weightDogSvgText = dogText;
  weightBottleSvgText = bottleText;
  weightCarSvgText = carText;
  weightHandbagSvgText = handbagText;

  const layer = mountAnimatedSvg(loadedText);
  silomerEl.appendChild(layer);

  weights = WEIGHT_SPECS.map((spec) => createWeightElement(spec));

  fitStage();
  updateLayers();
  updateUi();
}

function handleResize() {
  fitStage();
  updateLayers();
}

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerCancel);
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

if (gravitySwitchEl) {
  gravitySwitchEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-env]');
    if (!button || button.disabled) return;
    dismissSceneHint();
    setGravityEnvironment(button.dataset.env);
  });
}

if (cutBtnEl) {
  cutBtnEl.addEventListener('click', () => {
    dismissSceneHint();
    cutCord();
  });
}

if (resetBtnEl) {
  resetBtnEl.addEventListener('click', () => {
    dismissSceneHint();
    resetSilomer();
  });
}

workspaceEl?.addEventListener('pointerdown', dismissSceneHint);
weightsLayerEl?.addEventListener('pointerdown', dismissSceneHint);

if (dogWeightInputEl) {
  wireQuizKeypadInput(dogWeightInputEl, 'weight');
  dogWeightInputEl.addEventListener('input', clearDogWeightFeedback);
  dogWeightInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const parsed = parseQuizAnswer(dogWeightInputEl.value);
      if (parsed.numericText) {
        dogWeightInputEl.value = formatQuizAnswerWithUnit(parsed.numericText, parsed.unit);
      }
      verifyDogWeightInput();
    }
  });
}

if (dogMassInputEl) {
  wireQuizKeypadInput(dogMassInputEl, 'mass');
  dogMassInputEl.addEventListener('input', clearDogMassFeedback);
  dogMassInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const parsed = parseQuizAnswer(dogMassInputEl.value);
      if (parsed.numericText) {
        dogMassInputEl.value = formatQuizAnswerWithUnit(parsed.numericText, parsed.unit);
      }
      verifyDogMassInput();
    }
  });
}

if (tableKeypadConfirmEl) {
  tableKeypadConfirmEl.addEventListener('click', confirmQuizKeypad);
}

if (tableKeypadCancelEl) {
  tableKeypadCancelEl.addEventListener('click', closeQuizKeypad);
}

if (tableKeypadOverlayEl) {
  tableKeypadOverlayEl.addEventListener('click', (event) => {
    if (event.target === tableKeypadOverlayEl) closeQuizKeypad();
  });
}

tableMathKeypadKeys.forEach((key) => {
  key.addEventListener('click', handleQuizKeypadClick);
});

tableKeypadUnitKeys.forEach((button) => {
  button.addEventListener('click', handleQuizUnitClick);
});

document.addEventListener('keydown', (event) => {
  if (!quizKeypadEdit) return;

  if (event.key === 'Enter') {
    event.preventDefault();
    confirmQuizKeypad();
  } else if (event.key === 'Escape') {
    closeQuizKeypad();
  }
});

init().catch((err) => {
  console.error(err);
  silomerEl.innerHTML =
    '<p style="color:#b91c1c;font-size:0.9rem">Nepodařilo se načíst SVG. Spusť projekt přes <code>npm start</code>.</p>';
});
