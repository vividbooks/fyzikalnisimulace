const STAGE_WIDTH = 922;
const FLOOR_VIEW_HEIGHT = 210;
const STAGE_HEIGHT = 548;
const FLOOR_Y_OFFSET = STAGE_HEIGHT - FLOOR_VIEW_HEIGHT;
const BOX_UNIT = 89.43819;
const BOX_DEPTH_X = 30.56175;
const BOX_DEPTH_Y = -30.5618;
const BOX_PAD = 1.5;
const TILE_FRONT_Y = 116.987;
const TILE_FRONT_WIDTH = 88.98881;
const TILE_FRONT_LEFT = [
  3.62109, 90.6211, 179.121, 267.621, 356.121,
];
const TILE_CORNERS = [
  {
    bl: [34.1829, 86.4248],
    br: [124.071, 86.4248],
    fr: [92.6099, 116.987],
    fl: [3.62109, 116.987],
  },
  {
    bl: [121.183, 86.4248],
    br: [211.071, 86.4248],
    fr: [179.61, 116.987],
    fl: [90.6211, 116.987],
  },
  {
    bl: [209.683, 86.4248],
    br: [299.571, 86.4248],
    fr: [268.11, 116.987],
    fl: [179.121, 116.987],
  },
  {
    bl: [298.183, 86.4248],
    br: [388.071, 86.4248],
    fr: [356.61, 116.987],
    fl: [267.621, 116.987],
  },
  {
    bl: [386.683, 86.4248],
    br: [476.571, 86.4248],
    fr: [445.11, 116.987],
    fl: [356.121, 116.987],
  },
];
const TILE_CY = 101.706 + FLOOR_Y_OFFSET;
const SNAP_RADIUS = 58;
const INITIAL_TILE_ID = 0;
const MIN_SIZE_UNITS = 1;
const MAX_WIDTH_UNITS = 5;
const MAX_HEIGHT_UNITS = 4;
const WEIGHT_PER_CUBE = 1000;
const MASS_PER_CUBE_KG = 100;
const TILE_AREA_M2 = 1;
const WEIGHT_DISPLAY_WIDTH = 120;
const WEIGHT_DISPLAY_HEIGHT = 150;
const WEIGHT_ARROW_SHAFT_TOP = 91.4248;
const WEIGHT_ARROW_SHAFT_BOTTOM = 147.925;
const WEIGHT_ARROW_HEAD_TIP = 148.632;
const WEIGHT_ARROW_SHAFT_X = 45.4326;
const WEIGHT_ARROW_SHAFT_HALF = 1.8;
const WEIGHT_ARROW_HEAD_SCALE = 1.35;
const WEIGHT_MARKER_SCALE = 1.12;
const WEIGHT_ARROW_BASE_LENGTH =
  WEIGHT_ARROW_HEAD_TIP - WEIGHT_ARROW_SHAFT_TOP;
const TILE_SPACING_STAGE = TILE_FRONT_WIDTH;
const LAYER_OFFSET_X = 150;
const LAYER_OFFSET_Y = -150;
const STAGE_FIT_PADDING = 16;
const SCENE_SHIFT_UP = 0.03;
const SPRING_BASE_Y = 84.9248;
const SPRING_COIL_TOP = 34.5;
const SPRING_COIL_BOTTOM = 124.5;
const SPRING_REST_LENGTH = SPRING_COIL_BOTTOM - SPRING_COIL_TOP;
const MAX_FORCE_PER_TILE = WEIGHT_PER_CUBE * MAX_HEIGHT_UNITS;
const MAX_SPRING_COMPRESSION = 0.55;

const FLOOR_TILES = [
  { id: 0, cx: 63.621, cy: TILE_CY },
  { id: 1, cx: 150.621, cy: TILE_CY },
  { id: 2, cx: 239.121, cy: TILE_CY },
  { id: 3, cx: 327.621, cy: TILE_CY },
  { id: 4, cx: 416.121, cy: TILE_CY },
];

const stage = document.getElementById("stage");
const floor = document.getElementById("floor");
const floorFront = document.getElementById("floorFront");
const cubeLayer = document.getElementById("cubeLayer");
const weightLabelLayer = document.getElementById("weightLabelLayer");
const sceneWorkspace = document.querySelector(".scene-workspace");
const hintEl = document.getElementById("hintEl");
const labModeBtn = document.getElementById("labModeBtn");
const pressureCalcToggleBtn = document.getElementById("pressureCalcToggleBtn");
const weightCalcToggleBtn = document.getElementById("weightCalcToggleBtn");
const areaCalcToggleBtn = document.getElementById("areaCalcToggleBtn");
const totalWeightDisplay = document.getElementById("totalWeightDisplay");
const totalWeightValue = document.getElementById("totalWeightValue");
const areaDisplayEl = document.getElementById("areaDisplay");
const totalAreaValue = document.getElementById("totalAreaValue");
const totalPressureValue = document.getElementById("totalPressureValue");
const pressureDisplayEl = document.getElementById("pressureDisplay");
const pressureCalcEl = document.getElementById("pressureCalc");
const pressureInputEl = document.getElementById("pressureInput");
const pressureFeedbackEl = document.getElementById("pressureFeedback");
const weightCalcEl = document.getElementById("weightCalc");
const weightInputEl = document.getElementById("weightInput");
const weightFeedbackEl = document.getElementById("weightFeedback");
const areaCalcEl = document.getElementById("areaCalc");
const areaInputEl = document.getElementById("areaInput");
const areaFeedbackEl = document.getElementById("areaFeedback");
const weightStatItem = document.getElementById("weightStatItem");
const areaStatItem = document.getElementById("areaStatItem");
const pressureStatItem = document.getElementById("pressureStatItem");
const tableKeypadOverlay = document.getElementById("tableKeypadOverlay");
const tableKeypadTitle = document.getElementById("tableKeypadTitle");
const tableKeypadDisplay = document.getElementById("tableKeypadDisplay");
const tableKeypadError = document.getElementById("tableKeypadError");
const tableKeypadConfirm = document.getElementById("tableKeypadConfirm");
const tableKeypadCancel = document.getElementById("tableKeypadCancel");
const tableMathKeypad = document.getElementById("tableMathKeypad");
const modeButtons = [
  labModeBtn,
  pressureCalcToggleBtn,
  weightCalcToggleBtn,
  areaCalcToggleBtn,
];

if (
  !stage ||
  !floor ||
  !floorFront ||
  !cubeLayer ||
  !weightLabelLayer ||
  !sceneWorkspace ||
  !labModeBtn ||
  !pressureCalcToggleBtn ||
  !weightCalcToggleBtn ||
  !areaCalcToggleBtn ||
  !totalWeightDisplay ||
  !totalWeightValue ||
  !areaDisplayEl ||
  !totalAreaValue ||
  !totalPressureValue ||
  !pressureDisplayEl ||
  !pressureCalcEl ||
  !pressureInputEl ||
  !pressureFeedbackEl ||
  !weightCalcEl ||
  !weightInputEl ||
  !weightFeedbackEl ||
  !areaCalcEl ||
  !areaInputEl ||
  !areaFeedbackEl ||
  !weightStatItem ||
  !areaStatItem ||
  !pressureStatItem ||
  !tableKeypadOverlay ||
  !tableKeypadTitle ||
  !tableKeypadDisplay ||
  !tableKeypadError ||
  !tableKeypadConfirm ||
  !tableKeypadCancel ||
  !tableMathKeypad
) {
  throw new Error("Missing required elements.");
}

let keypadTarget = null;
let keypadDraft = "";

const cubes = [];
const occupiedTiles = new Map();
let floorSvg = null;
let floorFrontSvg = null;
let floorHighlightLayer = null;
let drag = null;
let nextCubeId = 0;
let showWeight = true;
let hintDismissed = false;
let appMode = "lab";
let weightDisplayTemplate = "";

function isChallengeMode() {
  return appMode === "pressure" || appMode === "weight" || appMode === "area";
}

function isPrimaryPointerDown(event) {
  return event.pointerType !== "mouse" || event.button === 0;
}

function clientToStage(clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * STAGE_WIDTH,
    y: ((clientY - rect.top) / rect.height) * STAGE_HEIGHT,
  };
}

function setCubePosition(cube, x, y) {
  cube.x = x;
  cube.y = y;
  cube.el.style.left = `${(x / STAGE_WIDTH) * 100}%`;
  cube.el.style.top = `${(y / STAGE_HEIGHT) * 100}%`;
}

function getBoxGeometry(widthUnits, heightUnits) {
  const frontW = BOX_UNIT * widthUnits;
  const frontH = BOX_UNIT * heightUnits;
  const fbl = {
    x: BOX_PAD,
    y: BOX_PAD + frontH - BOX_DEPTH_Y,
  };
  const fbr = { x: fbl.x + frontW, y: fbl.y };
  const ftl = { x: fbl.x, y: fbl.y - frontH };
  const ftr = { x: fbl.x + frontW, y: fbl.y - frontH };
  const btl = { x: ftl.x + BOX_DEPTH_X, y: ftl.y + BOX_DEPTH_Y };
  const btr = { x: ftr.x + BOX_DEPTH_X, y: ftr.y + BOX_DEPTH_Y };
  const bbr = { x: fbr.x + BOX_DEPTH_X, y: fbr.y + BOX_DEPTH_Y };
  const vbW = fbr.x + BOX_DEPTH_X + BOX_PAD;
  const vbH = fbl.y + BOX_PAD;

  return { frontW, frontH, fbl, fbr, ftl, ftr, btl, btr, bbr, vbW, vbH };
}

function buildBoxSvgMarkup(widthUnits, heightUnits) {
  const g = getBoxGeometry(widthUnits, heightUnits);
  const round = (value) => Math.round(value * 1000) / 1000;
  const p = (point) => `${round(point.x)} ${round(point.y)}`;

  const outline = [
    `M${p(g.fbr)}`,
    `H${round(g.fbl.x)}`,
    `L${p(g.ftl)}`,
    `L${p(g.btl)}`,
    `H${round(g.btr.x)}`,
    `V${round(g.bbr.y)}`,
    `L${p(g.fbr)}`,
    "Z",
  ].join("");

  const edges = [
    `M${p(g.fbr)}V${round(g.ftr.y)}`,
    `M${p(g.btr)}L${p(g.ftr)}`,
    `M${p(g.ftl)}H${round(g.ftr.x)}`,
  ].join("");

  // Visible bottom contact edges: front (fbl→fbr) and depth (fbr→bbr).
  const baseEdges = [
    `M${p(g.fbl)}H${round(g.fbr.x)}`,
    `M${p(g.fbr)}L${p(g.bbr)}`,
  ].join("");

  return [
    `<svg class="cube__svg" viewBox="0 0 ${round(g.vbW)} ${round(g.vbH)}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`,
    `<path d="${outline}" fill="#bfdbfe"/>`,
    `<path d="${outline}${edges}" stroke="#3b82f6" stroke-width="3"/>`,
    `<path class="cube__base-edges" d="${baseEdges}" stroke="#dc2626" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    "</svg>",
  ].join("");
}

function getCubeStageSize(widthUnits, heightUnits) {
  const geometry = getBoxGeometry(widthUnits, heightUnits);
  const width = (TILE_FRONT_WIDTH * widthUnits * geometry.vbW) / geometry.frontW;
  const height = width * (geometry.vbH / geometry.vbW);
  return { width, height, geometry };
}

function unitCubeStageHeight() {
  return getCubeStageSize(1, 1).height;
}

function getWeightMarkerStageSize(heightUnits) {
  const unitSize = getCubeStageSize(1, heightUnits);
  const width = unitSize.width * WEIGHT_MARKER_SCALE;
  const scale = width / WEIGHT_DISPLAY_WIDTH;
  const arrowViewHeight =
    WEIGHT_ARROW_BASE_LENGTH * heightUnits +
    (WEIGHT_DISPLAY_HEIGHT - WEIGHT_ARROW_HEAD_TIP);
  return {
    width,
    height: arrowViewHeight * scale,
  };
}

function getMaxSceneContentBounds() {
  const tallCube = snappedTopLeft(
    FLOOR_TILES[0],
    MAX_WIDTH_UNITS,
    MAX_HEIGHT_UNITS,
  );
  const { width: cubeWidth, height: cubeHeight } = getCubeStageSize(
    MAX_WIDTH_UNITS,
    MAX_HEIGHT_UNITS,
  );
  const marker = getWeightMarkerStageSize(MAX_HEIGHT_UNITS);
  const firstTile = FLOOR_TILES[0];
  const lastTile = FLOOR_TILES[FLOOR_TILES.length - 1];
  const markerLeft =
    firstTile.cx - (WEIGHT_ARROW_SHAFT_X / WEIGHT_DISPLAY_WIDTH) * marker.width;
  const floorRight = TILE_CORNERS[TILE_CORNERS.length - 1].br[0];

  const left =
    Math.min(0, tallCube.x, markerLeft) + LAYER_OFFSET_X;
  const right =
    Math.max(floorRight, tallCube.x + cubeWidth, lastTile.cx + marker.width) +
    LAYER_OFFSET_X;
  const top = tallCube.y + LAYER_OFFSET_Y;
  const maxSpringDrop = SPRING_REST_LENGTH * MAX_SPRING_COMPRESSION;
  const springBottom = FLOOR_Y_OFFSET + 209.5 + LAYER_OFFSET_Y;
  const arrowBottom =
    TILE_CY + maxSpringDrop + marker.height + 40 + LAYER_OFFSET_Y;
  const bottom = Math.max(arrowBottom, springBottom);

  return { left, right, top, bottom };
}

function fitStageToWorkspace() {
  if (!stage || !sceneWorkspace) return;

  const availW = Math.max(
    0,
    sceneWorkspace.clientWidth - STAGE_FIT_PADDING * 2,
  );
  const availH = Math.max(
    0,
    sceneWorkspace.clientHeight - STAGE_FIT_PADDING * 2,
  );
  if (availW < 48 || availH < 48) return;

  const bounds = getMaxSceneContentBounds();
  const contentW = Math.max(1, bounds.right - bounds.left);
  const contentH = Math.max(1, bounds.bottom - bounds.top);

  const widthFromWidth = (availW * STAGE_WIDTH) / contentW;
  const widthFromHeight = (availH * STAGE_WIDTH) / contentH;
  const displayW = Math.min(widthFromWidth, widthFromHeight);
  const displayH = (displayW * STAGE_HEIGHT) / STAGE_WIDTH;

  const contentCenterX = (bounds.left + bounds.right) / 2;
  const contentCenterY = (bounds.top + bounds.bottom) / 2;
  const shiftX =
    ((STAGE_WIDTH / 2 - contentCenterX) / STAGE_WIDTH) * displayW;
  const shiftY =
    ((STAGE_HEIGHT / 2 - contentCenterY) / STAGE_HEIGHT) * displayH -
    displayH * SCENE_SHIFT_UP;

  stage.style.width = `${displayW}px`;
  stage.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
}

function getForceOnTile(tileId) {
  const cube = getOccupiedCube(tileId);
  if (!cube || cube.widthUnits <= 0) return 0;

  // While resizing height, keep spring force at the pre-drag value until release.
  if (
    drag?.type === "resize" &&
    drag.axis === "height" &&
    drag.cube === cube
  ) {
    return (
      (WEIGHT_PER_CUBE * drag.startWidth * drag.startHeight) / cube.widthUnits
    );
  }

  return cube.weightN / cube.widthUnits;
}

function getSpringStateForForce(forceN) {
  if (forceN <= 0) {
    return { scale: 1, drop: 0 };
  }

  const t = Math.min(1, forceN / MAX_FORCE_PER_TILE);
  const compression = t * MAX_SPRING_COMPRESSION;
  return {
    scale: 1 - compression,
    drop: SPRING_REST_LENGTH * compression,
  };
}

function getTileDrop(tileId) {
  return getSpringStateForForce(getForceOnTile(tileId)).drop;
}

function remapSpringPathY(pathData, scale) {
  if (Math.abs(scale - 1) < 1e-6) return pathData;

  const mapY = (y) =>
    SPRING_COIL_BOTTOM - (SPRING_COIL_BOTTOM - y) * scale;
  const format = (value) => {
    const rounded = Math.round(value * 10000) / 10000;
    return String(rounded);
  };

  let command = "";
  let expectingY = false;

  return pathData.replace(
    /([MmCcLlHhVvZz])|([-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/g,
    (match, cmd, num) => {
      if (cmd) {
        command = cmd;
        expectingY = cmd === "V" || cmd === "v";
        return cmd;
      }

      const value = Number(num);
      if (command === "H" || command === "h") return num;
      if (command === "V" || command === "v") return format(mapY(value));

      if (!expectingY) {
        expectingY = true;
        return num;
      }

      expectingY = false;
      return format(mapY(value));
    },
  );
}

function updateFloorSprings() {
  for (const tile of FLOOR_TILES) {
    const tileEl = getTileElement(tile.id);
    if (!tileEl) continue;

    const spring = tileEl.querySelector(".floor-tile__spring");
    const plate = tileEl.querySelector(".floor-tile__plate");
    const { scale, drop } = getSpringStateForForce(getForceOnTile(tile.id));
    const baseX = spring?.dataset.baseX ?? "0";

    if (spring) {
      spring.removeAttribute("transform");
      spring.style.transform = `translate(${baseX}px, ${SPRING_BASE_Y}px)`;

      for (const coil of spring.querySelectorAll(".floor-tile__spring-coil")) {
        if (!coil.dataset.restD) {
          coil.dataset.restD = coil.getAttribute("d") ?? "";
        }
        coil.setAttribute("d", remapSpringPathY(coil.dataset.restD, scale));
      }
    }

    if (plate) {
      plate.style.transform = `translateY(${drop}px)`;
    }

    tileEl.classList.toggle("is-compressed", drop > 0);
  }
}

function snappedTopLeft(tile, widthUnits, heightUnits, drop = getTileDrop(tile.id)) {
  const { width, height, geometry } = getCubeStageSize(widthUnits, heightUnits);
  const frontLeft = TILE_FRONT_LEFT[tile.id];

  return {
    x: frontLeft - width * (geometry.fbl.x / geometry.vbW),
    y:
      FLOOR_Y_OFFSET +
      TILE_FRONT_Y +
      drop -
      height * (geometry.fbl.y / geometry.vbH),
  };
}

function cubeSnapPoint(cube) {
  const { width, geometry } = getCubeStageSize(cube.widthUnits, cube.heightUnits);
  return {
    x: cube.x + width * ((geometry.fbl.x + BOX_UNIT / 2) / geometry.vbW),
    y: TILE_CY,
  };
}

function maxWidthForTile(tileId) {
  return Math.min(MAX_WIDTH_UNITS, FLOOR_TILES.length - tileId);
}

function clampSize(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getOccupiedCube(tileId) {
  return occupiedTiles.get(tileId) ?? null;
}

function getSnappedCubes() {
  const seen = new Set();
  const result = [];

  for (const cube of occupiedTiles.values()) {
    if (seen.has(cube.id)) continue;
    seen.add(cube.id);
    result.push(cube);
  }

  return result;
}

function getTotalWeight() {
  return getSnappedCubes().reduce((sum, cube) => sum + cube.weightN, 0);
}

function formatPressure(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatWeightLabel(weightN) {
  return `${weightN.toLocaleString("cs-CZ")} N`;
}

function formatMassLabel(massKg) {
  return `${massKg.toLocaleString("cs-CZ")} kg`;
}

function getCubeVolumeUnits(cube) {
  return cube.widthUnits * cube.heightUnits;
}

function updateCubeMass(cube) {
  const volume = getCubeVolumeUnits(cube);
  cube.massKg = MASS_PER_CUBE_KG * volume;
  cube.weightN = WEIGHT_PER_CUBE * volume;
}

function getTotalArea() {
  return occupiedTiles.size * TILE_AREA_M2;
}

function getCorrectPressure() {
  const totalWeight = getTotalWeight();
  const totalArea = getTotalArea();
  return totalArea > 0 ? totalWeight / totalArea : 0;
}

function parseNumberInput(value) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function clearPressureFeedback() {
  pressureFeedbackEl.hidden = true;
  pressureFeedbackEl.textContent = "";
  pressureFeedbackEl.classList.remove("is-success", "is-error");
  pressureStatItem?.classList.remove("is-success", "is-error");
}

function clearWeightFeedback() {
  weightFeedbackEl.hidden = true;
  weightFeedbackEl.textContent = "";
  weightFeedbackEl.classList.remove("is-success", "is-error");
  weightStatItem?.classList.remove("is-success", "is-error");
}

function clearAreaFeedback() {
  areaFeedbackEl.hidden = true;
  areaFeedbackEl.textContent = "";
  areaFeedbackEl.classList.remove("is-success", "is-error");
  areaStatItem?.classList.remove("is-success", "is-error");
}

function showPressureFeedback(message, kind) {
  pressureFeedbackEl.hidden = false;
  pressureFeedbackEl.textContent = message;
  pressureFeedbackEl.classList.toggle("is-success", kind === "success");
  pressureFeedbackEl.classList.toggle("is-error", kind === "error");
  pressureStatItem?.classList.toggle("is-success", kind === "success");
  pressureStatItem?.classList.toggle("is-error", kind === "error");
}

function showWeightFeedback(message, kind) {
  weightFeedbackEl.hidden = false;
  weightFeedbackEl.textContent = message;
  weightFeedbackEl.classList.toggle("is-success", kind === "success");
  weightFeedbackEl.classList.toggle("is-error", kind === "error");
  weightStatItem?.classList.toggle("is-success", kind === "success");
  weightStatItem?.classList.toggle("is-error", kind === "error");
}

function showAreaFeedback(message, kind) {
  areaFeedbackEl.hidden = false;
  areaFeedbackEl.textContent = message;
  areaFeedbackEl.classList.toggle("is-success", kind === "success");
  areaFeedbackEl.classList.toggle("is-error", kind === "error");
  areaStatItem?.classList.toggle("is-success", kind === "success");
  areaStatItem?.classList.toggle("is-error", kind === "error");
}

const CONFETTI_COLORS = [
  "#059669",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#047857",
  "#a7f3d0",
];
let celebrationTimer = 0;

function clearCelebration() {
  if (celebrationTimer) {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = 0;
  }
  sceneWorkspace?.classList.remove("is-celebrating");
  sceneWorkspace?.querySelector(".quiz-celebration")?.remove();
}

function celebrateCorrectAnswer() {
  if (!sceneWorkspace) return;

  clearCelebration();

  const layer = document.createElement("div");
  layer.className = "quiz-celebration";
  layer.setAttribute("aria-hidden", "true");

  const burst = document.createElement("div");
  burst.className = "quiz-confetti-burst";
  layer.append(burst);

  for (let i = 0; i < 80; i += 1) {
    const piece = document.createElement("span");
    piece.className = "quiz-confetti";
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280;
    piece.style.setProperty("--burst-x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--burst-y", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--rotation", `${Math.random() * 720 - 360}deg`);
    piece.style.setProperty("--size", `${6 + Math.random() * 10}px`);
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    burst.append(piece);
  }

  sceneWorkspace.append(layer);
  sceneWorkspace.classList.add("is-celebrating");

  celebrationTimer = window.setTimeout(() => {
    clearCelebration();
  }, 1800);
}

function updatePressureDisplay() {
  if (appMode === "pressure") return;

  totalPressureValue.textContent = formatPressure(getCorrectPressure());
}

function verifyPressureInput() {
  const value = parseNumberInput(pressureInputEl.value);
  if (value === null) {
    showPressureFeedback("Zadej číslo.", "error");
    return;
  }

  const roundedInput = Math.round(value * 10) / 10;
  const roundedCorrect = Math.round(getCorrectPressure() * 10) / 10;
  if (Math.abs(roundedInput - roundedCorrect) < 0.05) {
    setWeightVisible(true);
    showPressureFeedback("Správně!", "success");
    celebrateCorrectAnswer();
    return;
  }

  showPressureFeedback("To není správně. Zkus to znovu.", "error");
}

function verifyWeightInput() {
  const value = parseNumberInput(weightInputEl.value);
  if (value === null) {
    showWeightFeedback("Zadej číslo.", "error");
    return;
  }

  const roundedInput = Math.round(value * 10) / 10;
  const roundedCorrect = Math.round(getTotalWeight() * 10) / 10;
  if (Math.abs(roundedInput - roundedCorrect) < 0.05) {
    setWeightVisible(true);
    showWeightFeedback("Správně!", "success");
    celebrateCorrectAnswer();
    return;
  }

  showWeightFeedback("To není správně. Zkus to znovu.", "error");
}

function verifyAreaInput() {
  const value = parseNumberInput(areaInputEl.value);
  if (value === null) {
    showAreaFeedback("Zadej číslo.", "error");
    return;
  }

  const roundedInput = Math.round(value * 10) / 10;
  const roundedCorrect = Math.round(getTotalArea() * 10) / 10;
  if (Math.abs(roundedInput - roundedCorrect) < 0.05) {
    setWeightVisible(true);
    showAreaFeedback("Správně!", "success");
    celebrateCorrectAnswer();
    return;
  }

  showAreaFeedback("To není správně. Zkus to znovu.", "error");
}

function setAppMode(mode) {
  appMode = mode;
  const isLab = mode === "lab";
  const isPressure = mode === "pressure";
  const isWeight = mode === "weight";
  const isArea = mode === "area";

  for (const btn of modeButtons) {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.setAttribute("aria-selected", String(active));
  }

  document.body.classList.toggle("mode-hide-mass", isWeight);
  document.body.classList.toggle("mode-hide-floor", isArea);
  document.body.classList.toggle("mode-object-locked", !isLab);
  hideMathKeypad();
  clearCelebration();

  totalWeightDisplay.hidden = isWeight;
  weightCalcEl.hidden = !isWeight;
  areaDisplayEl.hidden = isArea;
  areaCalcEl.hidden = !isArea;
  pressureDisplayEl.hidden = isPressure;
  pressureCalcEl.hidden = !isPressure;

  clearPressureFeedback();
  clearWeightFeedback();
  clearAreaFeedback();
  pressureInputEl.value = "";
  weightInputEl.value = "";
  areaInputEl.value = "";

  if (isLab) {
    setWeightVisible(true);
    removeAllCubes();
    placeInitialCube();
    updatePressureDisplay();
    return;
  }

  setWeightVisible(false);
  placeRandomCube();
}

function updateTotalWeight() {
  const totalWeight = getTotalWeight();
  const totalArea = getTotalArea();

  totalWeightValue.textContent = totalWeight.toLocaleString("cs-CZ");
  totalAreaValue.textContent = String(totalArea);
  updatePressureDisplay();
}

function removeWeightMarkers() {
  for (const marker of cubeLayer.querySelectorAll(".weight-marker")) {
    marker.remove();
  }
  weightLabelLayer.replaceChildren();
}

function getWeightArrowExtension(heightUnits) {
  return WEIGHT_ARROW_BASE_LENGTH * Math.max(0, heightUnits - 1);
}

function buildWeightArrowShaftPath(extension) {
  const shaftBottom = WEIGHT_ARROW_SHAFT_BOTTOM + extension;
  const left = WEIGHT_ARROW_SHAFT_X - WEIGHT_ARROW_SHAFT_HALF;
  const right = WEIGHT_ARROW_SHAFT_X + WEIGHT_ARROW_SHAFT_HALF;
  const topCap = WEIGHT_ARROW_SHAFT_TOP - 1;

  return [
    `M${right} ${WEIGHT_ARROW_SHAFT_TOP}V${topCap}H${left}V${WEIGHT_ARROW_SHAFT_TOP}H${WEIGHT_ARROW_SHAFT_X}H${right}`,
    `M${WEIGHT_ARROW_SHAFT_X} ${WEIGHT_ARROW_SHAFT_TOP}H${left}V${shaftBottom}H${WEIGHT_ARROW_SHAFT_X}H${right}V${WEIGHT_ARROW_SHAFT_TOP}H${WEIGHT_ARROW_SHAFT_X}`,
  ].join("Z") + "Z";
}

function applyWeightArrowGeometry(svg, heightUnits) {
  const extension = getWeightArrowExtension(heightUnits);
  const shaft = svg.querySelector(".weight-display__arrow-shaft");
  const head = svg.querySelector(".weight-display__arrow-head");

  if (shaft) {
    shaft.setAttribute("d", buildWeightArrowShaftPath(extension));
  }

  if (head) {
    const cx = WEIGHT_ARROW_SHAFT_X;
    const cy = WEIGHT_ARROW_HEAD_TIP;
    const scale = `translate(${cx} ${cy}) scale(${WEIGHT_ARROW_HEAD_SCALE}) translate(${-cx} ${-cy})`;
    head.setAttribute(
      "transform",
      extension > 0 ? `translate(0 ${extension}) ${scale}` : scale
    );
  }

  // Include a little room below the tip so the label stays inside the viewBox.
  const arrowViewHeight =
    WEIGHT_ARROW_BASE_LENGTH * heightUnits + (WEIGHT_DISPLAY_HEIGHT - WEIGHT_ARROW_HEAD_TIP);
  svg.setAttribute(
    "viewBox",
    `0 ${WEIGHT_ARROW_SHAFT_TOP} ${WEIGHT_DISPLAY_WIDTH} ${arrowViewHeight}`,
  );
  svg.removeAttribute("height");
  svg.removeAttribute("width");

  return { extension, arrowViewHeight };
}

function createWeightMarker(heightUnits, left, top, width, height) {
  const marker = document.createElement("div");
  marker.className = "weight-marker";
  marker.style.left = `${left}%`;
  marker.style.top = `${top}%`;
  marker.style.width = `${width}%`;
  marker.style.height = `${height}%`;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = weightDisplayTemplate.trim();
  const svg = wrapper.firstElementChild;
  if (!svg) return marker;

  svg.setAttribute("aria-hidden", "true");
  applyWeightArrowGeometry(svg, heightUnits);

  const leftoverLabel = svg.querySelector(".weight-display__label");
  leftoverLabel?.remove();

  marker.appendChild(svg);
  return marker;
}

function createWeightLabel(weight, leftPct, topPct, fontPx) {
  const label = document.createElement("div");
  label.className = "weight-label";
  label.textContent = formatWeightLabel(weight);
  label.style.left = `${leftPct}%`;
  label.style.top = `${topPct}%`;
  label.style.fontSize = `${fontPx}px`;
  return label;
}

function updateWeightArrows() {
  updateTotalWeight();
  removeWeightMarkers();

  if (!showWeight || !weightDisplayTemplate) return;

  requestAnimationFrame(() => {
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width === 0 || stageRect.height === 0) return;

    for (const cube of getSnappedCubes()) {
      if (cube.tileId === null) continue;

      const unitSize = getCubeStageSize(1, cube.heightUnits);
      const markerWidth =
        (unitSize.width / STAGE_WIDTH) * stageRect.width * WEIGHT_MARKER_SCALE;
      const scale = markerWidth / WEIGHT_DISPLAY_WIDTH;
      const arrowViewHeight =
        WEIGHT_ARROW_BASE_LENGTH * cube.heightUnits +
        (WEIGHT_DISPLAY_HEIGHT - WEIGHT_ARROW_HEAD_TIP);
      const markerHeight = arrowViewHeight * scale;
      const weightPerTile = cube.weightN / cube.widthUnits;

      for (let i = 0; i < cube.widthUnits; i += 1) {
        const tile = FLOOR_TILES[cube.tileId + i];
        if (!tile) continue;

        const drop = getTileDrop(tile.id);
        const tileCenterX = (tile.cx / STAGE_WIDTH) * stageRect.width;
        const tileCenterY = ((tile.cy + drop) / STAGE_HEIGHT) * stageRect.height;
        const left =
          tileCenterX - (WEIGHT_ARROW_SHAFT_X / WEIGHT_DISPLAY_WIDTH) * markerWidth;
        const top = tileCenterY;

        const marker = createWeightMarker(
          cube.heightUnits,
          (left / stageRect.width) * 100,
          (top / stageRect.height) * 100,
          (markerWidth / stageRect.width) * 100,
          (markerHeight / stageRect.height) * 100,
        );
        cube.el.insertAdjacentElement("beforebegin", marker);

        const extension = getWeightArrowExtension(cube.heightUnits);
        const tipY =
          top +
          markerHeight *
            ((WEIGHT_ARROW_HEAD_TIP + extension - WEIGHT_ARROW_SHAFT_TOP) /
              arrowViewHeight);
        const fontPx = Math.max(11, 16 * scale);
        const label = createWeightLabel(
          weightPerTile,
          (tileCenterX / stageRect.width) * 100,
          ((tipY + 2) / stageRect.height) * 100,
          fontPx,
        );
        weightLabelLayer.appendChild(label);
      }
    }
  });
}

function setWeightVisible(visible) {
  showWeight = visible;
  updateWeightArrows();
}

function getTileElement(tileId) {
  return (
    floor.querySelector(`#tile-${tileId}`) ||
    floorFront.querySelector(`#tile-${tileId}`)
  );
}

function getFrontTileThreshold() {
  let threshold = FLOOR_TILES.length;
  for (const cube of getSnappedCubes()) {
    if (cube.tileId === null) continue;
    threshold = Math.min(threshold, cube.tileId + cube.widthUnits);
  }
  return threshold;
}

function updateFloorDepthOrder() {
  if (!floorSvg || !floorFrontSvg) return;

  const threshold = getFrontTileThreshold();

  for (const tile of FLOOR_TILES) {
    const tileEl = getTileElement(tile.id);
    if (!tileEl) continue;

    const parentSvg = tile.id >= threshold ? floorFrontSvg : floorSvg;
    if (tileEl.parentNode === parentSvg) continue;

    if (parentSvg === floorSvg && floorHighlightLayer) {
      parentSvg.insertBefore(tileEl, floorHighlightLayer);
    } else {
      parentSvg.appendChild(tileEl);
    }
  }
}

function groupConsecutiveTileIds(ids) {
  if (ids.length === 0) return [];

  const sorted = [...ids].sort((a, b) => a - b);
  const groups = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }

    groups.push([start, prev]);
    start = sorted[i];
    prev = sorted[i];
  }

  groups.push([start, prev]);
  return groups;
}

function buildMergedTileHighlightPath(fromId, toId, drop = 0) {
  const left = TILE_CORNERS[fromId];
  const right = TILE_CORNERS[toId];
  if (!left || !right) return "";

  const round = (value) => Math.round(value * 1000) / 1000;
  return [
    `M${round(left.bl[0])} ${round(left.bl[1] + drop)}`,
    `H${round(right.br[0])}`,
    `L${round(right.fr[0])} ${round(right.fr[1] + drop)}`,
    `H${round(left.fl[0])}`,
    "Z",
  ].join("");
}

function refreshFloorHighlights() {
  if (!floorHighlightLayer) return;

  floorHighlightLayer.replaceChildren();

  for (const tile of FLOOR_TILES) {
    const tileEl = getTileElement(tile.id);
    tileEl?.classList.toggle("is-occupied", occupiedTiles.has(tile.id));
  }

  const groups = groupConsecutiveTileIds([...occupiedTiles.keys()]);
  for (const [fromId, toId] of groups) {
    const drop = getTileDrop(fromId);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("floor-tile__highlight");
    path.setAttribute("d", buildMergedTileHighlightPath(fromId, toId, drop));
    path.setAttribute("fill", "#dc2626");
    path.setAttribute("fill-opacity", "0.22");
    path.setAttribute("stroke", "#dc2626");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linejoin", "round");
    floorHighlightLayer.appendChild(path);
  }
}

function refreshFloorPresentation() {
  updateFloorSprings();
  updateFloorDepthOrder();
  refreshFloorHighlights();
}

function setupFloorHighlightLayer() {
  floorSvg = floor.querySelector(".floor-svg");
  if (!floorSvg) return;

  floorFrontSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  floorFrontSvg.classList.add("floor-svg");
  floorFrontSvg.setAttribute("width", "922");
  floorFrontSvg.setAttribute("height", "210");
  floorFrontSvg.setAttribute("viewBox", "0 0 922 210");
  floorFrontSvg.setAttribute("fill", "none");
  floorFrontSvg.setAttribute("aria-hidden", "true");
  floorFront.replaceChildren(floorFrontSvg);

  floorHighlightLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  floorHighlightLayer.id = "floor-highlight-layer";
  floorSvg.appendChild(floorHighlightLayer);
}

function findNearestTile(x, y, widthUnits = 1) {
  let bestTile = null;
  let bestDistance = SNAP_RADIUS;
  const maxTileId = FLOOR_TILES.length - widthUnits;

  for (const tile of FLOOR_TILES) {
    if (tile.id > maxTileId) continue;
    if (tileSpanConflicts(tile.id, widthUnits, null)) continue;

    const distance = Math.hypot(x - tile.cx, y - tile.cy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestTile = tile;
    }
  }

  return bestTile;
}

function tileSpanConflicts(startTileId, widthUnits, ignoreCubeId) {
  for (let id = startTileId; id < startTileId + widthUnits; id += 1) {
    const occupant = getOccupiedCube(id);
    if (occupant && occupant.id !== ignoreCubeId) return true;
  }
  return false;
}

function cubeDepthValue(cube) {
  if (cube.tileId !== null) {
    return cube.tileId;
  }

  return cube.x / 100;
}

function updateCubeDepthOrder() {
  const sorted = [...cubes].sort(
    (a, b) => cubeDepthValue(a) - cubeDepthValue(b),
  );

  for (const cube of sorted) {
    cubeLayer.appendChild(cube.el);
  }
}

function clearTileOccupancy(cube) {
  if (cube.tileId === null) return;

  for (let id = cube.tileId; id < cube.tileId + cube.widthUnits; id += 1) {
    if (occupiedTiles.get(id) === cube) {
      occupiedTiles.delete(id);
    }
  }

  cube.tileId = null;
  cube.el.classList.remove("is-snapped");
  refreshFloorPresentation();
  updateCubeDepthOrder();
  updateWeightArrows();
}

function applyCubeVisual(cube) {
  const { width, height, geometry } = getCubeStageSize(
    cube.widthUnits,
    cube.heightUnits,
  );

  cube.el.style.width = `${(width / STAGE_WIDTH) * 100}%`;
  cube.el.style.aspectRatio = `${geometry.vbW} / ${geometry.vbH}`;
  cube.el.querySelector(".cube__shape").innerHTML = buildBoxSvgMarkup(
    cube.widthUnits,
    cube.heightUnits,
  );

  const frontRightX = ((geometry.fbr.x / geometry.vbW) * 100).toFixed(2);
  const frontMidX = (
    (((geometry.fbl.x + geometry.fbr.x) / 2) / geometry.vbW) *
    100
  ).toFixed(2);
  const frontTopY = ((geometry.ftl.y / geometry.vbH) * 100).toFixed(2);
  const frontMidY = (
    (((geometry.ftl.y + geometry.fbl.y) / 2) / geometry.vbH) *
    100
  ).toFixed(2);

  cube.widthHandle.style.left = `${frontRightX}%`;
  cube.widthHandle.style.top = `${frontMidY}%`;
  cube.heightHandle.style.left = `${frontMidX}%`;
  cube.heightHandle.style.top = `${frontTopY}%`;

  cube.massLabel.style.left = `${frontMidX}%`;
  cube.massLabel.style.top = `${frontMidY}%`;
  cube.massLabel.textContent = formatMassLabel(cube.massKg);

  const label =
    cube.widthUnits === 1 && cube.heightUnits === 1 ? "Krychle" : "Kvádr";
  cube.el.setAttribute(
    "aria-label",
    `${label}, hmotnost ${formatMassLabel(cube.massKg)}`,
  );
}

function setCubeSize(cube, widthUnits, heightUnits, { keepBottom = true } = {}) {
  const prevHeight = getCubeStageSize(cube.widthUnits, cube.heightUnits).height;
  const nextWidth = clampSize(widthUnits, MIN_SIZE_UNITS, MAX_WIDTH_UNITS);
  const nextHeight = clampSize(heightUnits, MIN_SIZE_UNITS, MAX_HEIGHT_UNITS);
  const bottom = cube.y + prevHeight;

  cube.widthUnits = nextWidth;
  cube.heightUnits = nextHeight;
  updateCubeMass(cube);
  applyCubeVisual(cube);

  if (keepBottom) {
    const nextSize = getCubeStageSize(cube.widthUnits, cube.heightUnits);
    setCubePosition(cube, cube.x, bottom - nextSize.height);
  }
}

function snapCubeToTile(cube, tile) {
  clearTileOccupancy(cube);

  const widthUnits = clampSize(
    cube.widthUnits,
    MIN_SIZE_UNITS,
    maxWidthForTile(tile.id),
  );
  cube.widthUnits = widthUnits;
  updateCubeMass(cube);

  cube.tileId = tile.id;
  for (let id = tile.id; id < tile.id + cube.widthUnits; id += 1) {
    occupiedTiles.set(id, cube);
  }

  applyCubeVisual(cube);
  cube.el.classList.add("is-snapped");
  refreshFloorPresentation();

  const position = snappedTopLeft(tile, cube.widthUnits, cube.heightUnits);
  setCubePosition(cube, position.x, position.y);

  updateCubeDepthOrder();
  updateWeightArrows();
}

function trySnapCube(cube) {
  const point = cubeSnapPoint(cube);
  const tile = findNearestTile(point.x, point.y, cube.widthUnits);

  if (tile) {
    snapCubeToTile(cube, tile);
    return;
  }

  clearTileOccupancy(cube);
}

function createCubeElement(cube) {
  const el = document.createElement("div");
  el.className = "cube";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Krychle");
  el.innerHTML = [
    '<div class="cube__shape"></div>',
    '<span class="cube-mass" aria-hidden="true"></span>',
    '<button type="button" class="cube-handle cube-handle--width" aria-label="Změnit šířku">',
    '<svg class="cube-handle__icon" viewBox="0 0 14 14" aria-hidden="true">',
    '<path d="M2.5 7H11.5M4.5 4.5L2.5 7L4.5 9.5M9.5 4.5L11.5 7L9.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "</svg></button>",
    '<button type="button" class="cube-handle cube-handle--height" aria-label="Změnit výšku">',
    '<svg class="cube-handle__icon" viewBox="0 0 14 14" aria-hidden="true">',
    '<path d="M7 2.5V11.5M4.5 4.5L7 2.5L9.5 4.5M4.5 9.5L7 11.5L9.5 9.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "</svg></button>",
  ].join("");

  const massLabel = el.querySelector(".cube-mass");
  const widthHandle = el.querySelector(".cube-handle--width");
  const heightHandle = el.querySelector(".cube-handle--height");

  el.addEventListener("pointerdown", onCubePointerDown);
  widthHandle.addEventListener("pointerdown", (event) => {
    onResizePointerDown(event, cube, "width");
  });
  heightHandle.addEventListener("pointerdown", (event) => {
    onResizePointerDown(event, cube, "height");
  });

  cubeLayer.appendChild(el);
  return { el, massLabel, widthHandle, heightHandle };
}

function createCube(x, y) {
  const cube = {
    id: nextCubeId++,
    el: null,
    massLabel: null,
    widthHandle: null,
    heightHandle: null,
    x: 0,
    y: 0,
    tileId: null,
    widthUnits: 1,
    heightUnits: 1,
    massKg: MASS_PER_CUBE_KG,
    weightN: WEIGHT_PER_CUBE,
  };

  const elements = createCubeElement(cube);
  cube.el = elements.el;
  cube.massLabel = elements.massLabel;
  cube.widthHandle = elements.widthHandle;
  cube.heightHandle = elements.heightHandle;

  updateCubeMass(cube);
  applyCubeVisual(cube);
  setCubePosition(cube, x, y);
  cubes.push(cube);
  return cube;
}

function beginDrag(cube, pointerId, clientX, clientY) {
  const point = clientToStage(clientX, clientY);
  drag = {
    type: "move",
    cube,
    pointerId,
    offsetX: point.x - cube.x,
    offsetY: point.y - cube.y,
  };

  clearTileOccupancy(cube);
  cube.el.classList.add("is-dragging");
  cube.el.setPointerCapture(pointerId);
}

function beginResize(cube, axis, pointerId, clientX, clientY) {
  drag = {
    type: "resize",
    axis,
    cube,
    pointerId,
    startX: clientX,
    startY: clientY,
    startWidth: cube.widthUnits,
    startHeight: cube.heightUnits,
    startTileId: cube.tileId,
  };

  cube.el.classList.add("is-resizing");
  cube.el.setPointerCapture(pointerId);
}

function moveDrag(clientX, clientY) {
  if (!drag) return;

  if (drag.type === "move") {
    const point = clientToStage(clientX, clientY);
    setCubePosition(
      drag.cube,
      point.x - drag.offsetX,
      point.y - drag.offsetY,
    );
    updateCubeDepthOrder();
    return;
  }

  if (drag.type === "resize") {
    updateResize(clientX, clientY);
  }
}

function updateResize(clientX, clientY) {
  const cube = drag.cube;
  const dx = clientToStage(clientX, clientY).x - clientToStage(drag.startX, drag.startY).x;
  const dy = clientToStage(clientX, clientY).y - clientToStage(drag.startX, drag.startY).y;

  if (drag.axis === "width") {
    const maxWidth =
      drag.startTileId === null
        ? MAX_WIDTH_UNITS
        : maxWidthForTile(drag.startTileId);
    const nextWidth = clampSize(
      Math.round(drag.startWidth + dx / TILE_SPACING_STAGE),
      MIN_SIZE_UNITS,
      maxWidth,
    );

    if (nextWidth === cube.widthUnits) return;

    if (drag.startTileId !== null) {
      for (let id = drag.startTileId; id < drag.startTileId + cube.widthUnits; id += 1) {
        if (occupiedTiles.get(id) === cube) {
          occupiedTiles.delete(id);
        }
      }
    }

    setCubeSize(cube, nextWidth, cube.heightUnits, { keepBottom: true });

    if (drag.startTileId !== null) {
      const tile = FLOOR_TILES.find((item) => item.id === drag.startTileId);
      if (!tile) return;

      cube.tileId = tile.id;

      for (let id = tile.id; id < tile.id + cube.widthUnits; id += 1) {
        occupiedTiles.set(id, cube);
      }

      refreshFloorPresentation();
      const position = snappedTopLeft(tile, cube.widthUnits, cube.heightUnits);
      setCubePosition(cube, position.x, position.y);

      cube.el.classList.add("is-snapped");
      updateWeightArrows();
    }

    return;
  }

  const nextHeight = clampSize(
    Math.round(drag.startHeight - dy / (unitCubeStageHeight() * 0.85)),
    MIN_SIZE_UNITS,
    MAX_HEIGHT_UNITS,
  );

  if (nextHeight === cube.heightUnits) return;

  if (drag.startTileId !== null) {
    const tile = FLOOR_TILES.find((item) => item.id === drag.startTileId);
    if (!tile) return;

    // Grow/shrink against the tile without applying the new spring drop yet.
    setCubeSize(cube, cube.widthUnits, nextHeight, { keepBottom: false });
    const frozenDrop = getSpringStateForForce(
      (WEIGHT_PER_CUBE * drag.startWidth * drag.startHeight) /
        Math.max(1, cube.widthUnits),
    ).drop;
    const position = snappedTopLeft(
      tile,
      cube.widthUnits,
      cube.heightUnits,
      frozenDrop,
    );
    setCubePosition(cube, position.x, position.y);
    updateWeightArrows();
    return;
  }

  setCubeSize(cube, cube.widthUnits, nextHeight, { keepBottom: true });
}

function endDrag(pointerId) {
  if (!drag || drag.pointerId !== pointerId) return;

  const cube = drag.cube;
  const type = drag.type;
  const axis = drag.axis;
  cube.el.classList.remove("is-dragging", "is-resizing");
  releasePointerCaptureSafe(cube.el, pointerId);
  drag = null;

  if (type === "move") {
    trySnapCube(cube);
  } else if (type === "resize" && cube.tileId !== null) {
    if (axis === "height") {
      const tile = FLOOR_TILES[cube.tileId];
      refreshFloorPresentation();
      if (tile) {
        // Re-enable position transition for the spring settle after resize.
        const position = snappedTopLeft(
          tile,
          cube.widthUnits,
          cube.heightUnits,
        );
        // Force style flush so removing is-resizing can transition to the new drop.
        void cube.el.offsetWidth;
        setCubePosition(cube, position.x, position.y);
      }
    }
    updateWeightArrows();
  } else if (type === "resize") {
    updateTotalWeight();
  }
}

function releasePointerCaptureSafe(element, pointerId) {
  if (typeof element.releasePointerCapture !== "function") return;

  try {
    element.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture may already be released.
  }
}

function dismissSceneHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  hintEl?.classList.add("is-hidden");
}

function onCubePointerDown(event) {
  if (!isPrimaryPointerDown(event) || drag || isChallengeMode()) return;
  if (event.target.closest(".cube-handle")) return;

  event.preventDefault();
  const cube = cubes.find((item) => item.el === event.currentTarget);
  if (!cube) return;

  beginDrag(cube, event.pointerId, event.clientX, event.clientY);
  dismissSceneHint();
}

function onResizePointerDown(event, cube, axis) {
  if (!isPrimaryPointerDown(event) || drag || isChallengeMode()) return;

  event.preventDefault();
  event.stopPropagation();
  beginResize(cube, axis, event.pointerId, event.clientX, event.clientY);
  dismissSceneHint();
}

function onPointerMove(event) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  moveDrag(event.clientX, event.clientY);
}

function onPointerUp(event) {
  endDrag(event.pointerId);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function removeAllCubes() {
  for (const cube of [...cubes]) {
    clearTileOccupancy(cube);
    cube.el.remove();
  }
  cubes.length = 0;
  removeWeightMarkers();
}

function placeRandomCube() {
  removeAllCubes();

  const heightUnits = randomInt(MIN_SIZE_UNITS, MAX_HEIGHT_UNITS);
  const widthUnits = randomInt(MIN_SIZE_UNITS, MAX_WIDTH_UNITS);
  const startTileId = randomInt(0, FLOOR_TILES.length - widthUnits);
  const tile = FLOOR_TILES[startTileId];
  const cube = createCube(0, 0);

  cube.widthUnits = widthUnits;
  cube.heightUnits = heightUnits;
  updateCubeMass(cube);
  snapCubeToTile(cube, tile);
}

function placeInitialCube() {
  const tile = FLOOR_TILES.find((item) => item.id === INITIAL_TILE_ID);
  if (!tile) {
    throw new Error("Initial floor tile not found.");
  }

  snapCubeToTile(createCube(0, 0), tile);
}

function getActiveCalcInput() {
  if (appMode === "pressure") return pressureInputEl;
  if (appMode === "weight") return weightInputEl;
  if (appMode === "area") return areaInputEl;
  return null;
}

function keypadTitleForInput(input) {
  if (input === weightInputEl) return "Tíha";
  if (input === areaInputEl) return "Plocha";
  if (input === pressureInputEl) return "Tlak";
  return input.getAttribute("aria-label") || "Hodnota";
}

function clearKeypadError() {
  tableKeypadError.hidden = true;
  tableKeypadError.textContent = "";
  tableKeypadDisplay.classList.remove("is-invalid");
}

function showKeypadError(message) {
  tableKeypadError.hidden = false;
  tableKeypadError.textContent = message;
  tableKeypadDisplay.classList.add("is-invalid");
}

function updateKeypadDisplay() {
  tableKeypadDisplay.textContent = keypadDraft;
}

function showMathKeypad(input) {
  if (!input || !isChallengeMode()) return;

  keypadTarget = input;
  keypadDraft = input.value;
  clearKeypadError();
  tableKeypadTitle.textContent = keypadTitleForInput(input);
  updateKeypadDisplay();
  tableKeypadOverlay.hidden = false;

  try {
    input.blur();
  } catch (_error) {
    /* ignore */
  }
}

function hideMathKeypad() {
  keypadTarget = null;
  keypadDraft = "";
  clearKeypadError();
  tableKeypadOverlay.hidden = true;
  tableKeypadDisplay.textContent = "";
}

function insertIntoKeypadDraft(value) {
  if (value === "," || value === ".") {
    if (keypadDraft.includes(",") || keypadDraft.includes(".")) return;
  }

  if (keypadDraft.length >= 12) return;

  clearKeypadError();
  keypadDraft += value;
  updateKeypadDisplay();
}

function clearKeypadDraft() {
  clearKeypadError();
  keypadDraft = "";
  updateKeypadDisplay();
}

function confirmKeypadDraft() {
  if (!keypadTarget) return;

  const value = parseNumberInput(keypadDraft);
  if (value === null) {
    showKeypadError("Zadej číslo.");
    return;
  }

  keypadTarget.value = keypadDraft;
  hideMathKeypad();
  verifyActiveCalcInput();
}

function verifyActiveCalcInput() {
  if (appMode === "pressure") {
    verifyPressureInput();
    return;
  }

  if (appMode === "weight") {
    verifyWeightInput();
    return;
  }

  if (appMode === "area") {
    verifyAreaInput();
  }
}

function onMathKeypadClick(event) {
  const keyBtn = event.target.closest("[data-value], [data-action]");
  if (!keyBtn || !tableMathKeypad.contains(keyBtn)) return;

  const action = keyBtn.getAttribute("data-action");
  if (action === "clear") {
    clearKeypadDraft();
    return;
  }

  const value = keyBtn.getAttribute("data-value");
  if (value) insertIntoKeypadDraft(value);
}

function onCalcFieldActivate(event) {
  if (!isChallengeMode()) return;
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  event.preventDefault();
  showMathKeypad(input);
}

function bindEvents() {
  for (const btn of modeButtons) {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (mode) setAppMode(mode);
    });
  }

  for (const input of [pressureInputEl, weightInputEl, areaInputEl]) {
    input.addEventListener("pointerdown", onCalcFieldActivate);
  }

  tableMathKeypad.addEventListener("click", onMathKeypadClick);
  tableKeypadConfirm.addEventListener("click", confirmKeypadDraft);
  tableKeypadCancel.addEventListener("click", hideMathKeypad);
  tableKeypadOverlay.addEventListener("click", (event) => {
    if (event.target === tableKeypadOverlay) hideMathKeypad();
  });
  window.addEventListener("keydown", (event) => {
    if (tableKeypadOverlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      hideMathKeypad();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      confirmKeypadDraft();
    }
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", () => {
    fitStageToWorkspace();
    updateWeightArrows();
  });
}

async function init() {
  const [floorResponse, weightResponse] = await Promise.all([
    fetch("assets/floor.svg"),
    fetch("assets/weight-display.svg"),
  ]);

  if (!floorResponse.ok) {
    throw new Error("Failed to load floor.svg");
  }

  if (!weightResponse.ok) {
    throw new Error("Failed to load weight-display.svg");
  }

  floor.innerHTML = await floorResponse.text();
  weightDisplayTemplate = await weightResponse.text();
  setupFloorHighlightLayer();
  updateFloorSprings();
  bindEvents();
  fitStageToWorkspace();
  placeInitialCube();
}

init();
