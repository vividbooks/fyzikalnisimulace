const SVG_NS = "http://www.w3.org/2000/svg";

const DM = 99;
const CANVAS = { w: DM * 4, h: DM * 2 };
const CANVAS_POSITION_MARGIN = 8;
const CANVAS_SCALE = 1.56;
const CANVAS_MIN_DM = 1;
const CANVAS_MAX_DM_W = 4;
const CANVAS_MAX_DM_H = 4;
const CONFETTI_COLORS = [
  "#059669",
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#047857",
  "#a7f3d0",
];
const CANVAS_RIGHT_MARGIN = 40;
const CANVAS_BOTTOM_MARGIN = 35;
const MIN_INNER_WIDTH = CANVAS_POSITION_MARGIN + DM * CANVAS_MAX_DM_W + CANVAS_RIGHT_MARGIN;
const MIN_INNER_HEIGHT = CANVAS_POSITION_MARGIN + DM * CANVAS_MAX_DM_H + CANVAS_BOTTOM_MARGIN;
const FREE_ZOOM_MIN = 1;
const FREE_ZOOM_MAX = 3;
const FREE_ZOOM_STEP = 0.1;
const SNAP_THRESHOLD = 8;

const TILE_TYPES = {
  dm2: {
    w: DM,
    h: DM,
    fill: "#d6f5d6",
    stroke: "#2e9e4a",
    strokeWidth: 1,
  },
  cm2: {
    w: DM / 10,
    h: DM / 10,
    fill: "#d7e0f4",
    stroke: "#3d5a9a",
    strokeWidth: 1,
  },
  mm2: {
    w: DM / 100,
    h: DM / 100,
    fill: "#fecaca",
    stroke: "#dc2626",
    strokeWidth: 0.5,
    hitSize: 24,
  },
};

const diagram = document.getElementById("diagram");
const diagramBg = document.getElementById("diagram-bg");
const diagramWrap = document.getElementById("diagram-wrap");
const stage = document.getElementById("stage");
const appRoot = document.getElementById("app-root");
const modeRectangleBtn = document.getElementById("mode-rectangle-btn");
const modeFreeBtn = document.getElementById("mode-free-btn");
const rectanglePanel = document.getElementById("rectangle-panel");
const freePanel = document.getElementById("free-panel");
const randomCanvasBtn = document.getElementById("random-canvas-btn");
const zoomSlider = document.getElementById("zoom-slider");
const zoomOutBtn = document.getElementById("zoom-out-btn");
const zoomInBtn = document.getElementById("zoom-in-btn");
const canvasPanToggle = document.getElementById("canvas-pan-toggle");
const boardPanCatch = document.getElementById("board-pan-catch");
const canvasWidthInput = document.getElementById("canvas-width");
const canvasHeightInput = document.getElementById("canvas-height");
const areaAnswerRow = document.getElementById("area-answer-row");
const areaFeedback = document.getElementById("area-feedback");
const areaValueInput = document.getElementById("area-value");
const verifyBtn = document.getElementById("verify-btn");
const areaKeypadOverlay = document.getElementById("area-keypad-overlay");
const areaKeypadDisplay = document.getElementById("area-keypad-display");
const areaKeypadError = document.getElementById("area-keypad-error");
const areaKeypadConfirm = document.getElementById("area-keypad-confirm");
const areaKeypadCancel = document.getElementById("area-keypad-cancel");
const areaMathKeypad = document.getElementById("area-math-keypad");
const content = document.getElementById("content");
const placedTilesLayer = document.getElementById("placed-tiles");
const tileStack = document.getElementById("tile-stack");
const hintEl = document.getElementById("hintEl");
const canvasElement = document.getElementById("canvas");
const canvasGroup = document.getElementById("canvas-group");
const canvasTicks = document.getElementById("canvas-ticks");
const canvasLabels = document.getElementById("canvas-labels");
const staticLayer = document.getElementById("static-layer");

let dragState = null;
let tileCounter = 0;
let isFreeSurfaceMode = false;
let freeZoom = FREE_ZOOM_MIN;
let freePan = { x: 0, y: 0 };
let isPanMode = false;
let panDrag = null;
let canvasPosition = { x: 0, y: 0 };
let celebrationTimer = null;
let areaKeypadDraft = "";
let areaKeypadUnit = "";
let isAreaKeypadOpen = false;
let hintDismissed = false;
const AREA_UNIT_LABELS = {
  dm2: "dm²",
  cm2: "cm²",
  mm2: "mm²",
};
const areaKeypadUnitKeys = areaMathKeypad.querySelectorAll(".table-keypad-units__key");

function getCanvasBounds() {
  return {
    x: canvasPosition.x,
    y: canvasPosition.y,
    w: CANVAS.w,
    h: CANVAS.h,
  };
}

function applyCanvasPosition() {
  canvasGroup.setAttribute("transform", `translate(${canvasPosition.x}, ${canvasPosition.y})`);
}

function dismissIntroHint() {
  if (hintDismissed) {
    return;
  }
  hintDismissed = true;
  hintEl?.classList.add("is-hidden");
}

function getLocalPoint(clientX, clientY) {
  const ctm = content.getScreenCTM();
  if (!ctm) {
    return { x: 0, y: 0 };
  }

  const point = diagram.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(ctm.inverse());
}

function parseTranslate(element) {
  const transform = element.getAttribute("transform") || "";
  const match = transform.match(/translate\(([-\d.]+)[,\s]+([-\d.]+)\)/);
  if (!match) {
    return { x: 0, y: 0 };
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

function setTranslate(element, x, y) {
  element.setAttribute("transform", `translate(${x}, ${y})`);
}

function isPointerInStack(clientX, clientY) {
  const stackRect = tileStack.getBoundingClientRect();

  return (
    clientX >= stackRect.left &&
    clientX <= stackRect.right &&
    clientY >= stackRect.top &&
    clientY <= stackRect.bottom
  );
}

function getTileBounds(element) {
  const position = parseTranslate(element);
  const def = TILE_TYPES[element.dataset.type];
  return { x: position.x, y: position.y, w: def.w, h: def.h };
}

function collectSnapLines(excludeElement) {
  const xLines = [];
  const yLines = [];

  if (!isFreeSurfaceMode) {
    const bounds = getCanvasBounds();

    for (let i = 0; i <= bounds.w / DM; i += 1) {
      xLines.push(bounds.x + i * DM);
    }

    for (let i = 0; i <= bounds.h / DM; i += 1) {
      yLines.push(bounds.y + i * DM);
    }
  }

  placedTilesLayer.querySelectorAll(".placed-tile").forEach((tile) => {
    if (tile === excludeElement) {
      return;
    }

    const bounds = getTileBounds(tile);
    xLines.push(bounds.x, bounds.x + bounds.w);
    yLines.push(bounds.y, bounds.y + bounds.h);
  });

  return { xLines, yLines };
}

function snapAxis(position, size, lines) {
  const candidates = [
    { edge: position, toPosition: (line) => line },
    { edge: position + size, toPosition: (line) => line - size },
  ];

  let bestDistance = SNAP_THRESHOLD + 1;
  let bestPosition = position;

  for (const candidate of candidates) {
    for (const line of lines) {
      const distance = Math.abs(candidate.edge - line);
      if (distance <= SNAP_THRESHOLD && distance < bestDistance) {
        bestDistance = distance;
        bestPosition = candidate.toPosition(line);
      }
    }
  }

  return bestPosition;
}

function snapPosition(x, y, w, h, excludeElement) {
  const { xLines, yLines } = collectSnapLines(excludeElement);
  return {
    x: snapAxis(x, w, xLines),
    y: snapAxis(y, h, yLines),
  };
}

function placeTile(element, x, y) {
  const def = TILE_TYPES[element.dataset.type];
  const snapped = snapPosition(x, y, def.w, def.h, element);
  setTranslate(element, snapped.x, snapped.y);
  return snapped;
}

function createPlacedTile(type, x, y) {
  const def = TILE_TYPES[type];
  const group = document.createElementNS(SVG_NS, "g");
  group.classList.add("placed-tile");
  group.dataset.type = type;
  group.dataset.id = String(++tileCounter);
  setTranslate(group, x, y);

  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("width", String(def.w));
  rect.setAttribute("height", String(def.h));
  rect.setAttribute("fill", def.fill);
  rect.setAttribute("stroke", def.stroke);
  rect.setAttribute("stroke-width", String(def.strokeWidth));
  group.appendChild(rect);

  if (def.hitSize) {
    const hit = document.createElementNS(SVG_NS, "rect");
    hit.classList.add("tile-hit");
    const inset = (def.hitSize - def.w) / 2;
    hit.setAttribute("x", String(-inset));
    hit.setAttribute("y", String(-inset));
    hit.setAttribute("width", String(def.hitSize));
    hit.setAttribute("height", String(def.hitSize));
    group.appendChild(hit);
  }

  placedTilesLayer.appendChild(group);
  return group;
}

function bringToFront(element) {
  placedTilesLayer.appendChild(element);
}

function getStackVisual(targetElement) {
  return (
    targetElement.querySelector(".stack-visual-dm2, .stack-visual-cm2, .stack-visual-mm2") ||
    targetElement
  );
}

function createDragGhost(type, rect) {
  const ghost = document.createElement("div");
  ghost.className = `drag-ghost drag-ghost--${type}`;
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  document.body.append(ghost);
  return ghost;
}

function clearDragGhost() {
  if (dragState?.ghost) {
    dragState.ghost.remove();
    dragState.ghost = null;
  }
}

function isPointerInBoard(clientX, clientY) {
  const board = document.querySelector(".board-stage") || diagram;
  const rect = board.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function startDragFromStack(type, clientX, clientY, targetElement) {
  const def = TILE_TYPES[type];
  const visual = getStackVisual(targetElement);
  const rect = visual.getBoundingClientRect();
  const screenOffsetX = clientX - rect.left;
  const screenOffsetY = clientY - rect.top;
  const clickOffsetX = (screenOffsetX / Math.max(rect.width, 1)) * def.w;
  const clickOffsetY = (screenOffsetY / Math.max(rect.height, 1)) * def.h;
  const point = getLocalPoint(clientX, clientY);
  const tile = createPlacedTile(type, point.x - clickOffsetX, point.y - clickOffsetY);
  bringToFront(tile);
  tile.classList.add("is-dragging");
  tile.setAttribute("visibility", "hidden");

  dragState = {
    kind: "tile",
    element: tile,
    ghost: createDragGhost(type, rect),
    screenOffsetX,
    screenOffsetY,
    offsetX: clickOffsetX,
    offsetY: clickOffsetY,
    fromStack: true,
    pointerId: null,
  };
}

function startDragPlacedTile(element, localX, localY) {
  dismissIntroHint();
  const position = parseTranslate(element);
  bringToFront(element);
  element.classList.add("is-dragging");

  dragState = {
    kind: "tile",
    element,
    ghost: null,
    screenOffsetX: 0,
    screenOffsetY: 0,
    offsetX: localX - position.x,
    offsetY: localY - position.y,
    fromStack: false,
    pointerId: null,
  };
}

function updateDragGhost(clientX, clientY) {
  if (!dragState?.ghost) {
    return;
  }

  dragState.ghost.style.left = `${clientX - dragState.screenOffsetX}px`;
  dragState.ghost.style.top = `${clientY - dragState.screenOffsetY}px`;
}

function updateDrag(localX, localY) {
  if (!dragState) {
    return;
  }

  const x = localX - dragState.offsetX;
  const y = localY - dragState.offsetY;
  placeTile(dragState.element, x, y);
}

const dragMoveOptions = { passive: false, capture: true };
const dragEndOptions = { capture: true };

function stopDragListeners() {
  window.removeEventListener("pointermove", handleDragPointerMove, dragMoveOptions);
  window.removeEventListener("pointerup", handleDragPointerUp, dragEndOptions);
  window.removeEventListener("pointercancel", handleDragPointerUp, dragEndOptions);
}

function handleDragPointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  updateDragGhost(event.clientX, event.clientY);
  const point = getLocalPoint(event.clientX, event.clientY);
  updateDrag(point.x, point.y);
}

function handleDragPointerUp(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  stopDragListeners();
  endDrag(event.clientX, event.clientY);
}

function beginDragTracking(pointerId) {
  dragState.pointerId = pointerId;
  // Track on window only — setPointerCapture on the SVG can fire an immediate
  // pointercancel and abort the drag (especially when moving already placed tiles).
  window.addEventListener("pointermove", handleDragPointerMove, dragMoveOptions);
  window.addEventListener("pointerup", handleDragPointerUp, dragEndOptions);
  window.addEventListener("pointercancel", handleDragPointerUp, dragEndOptions);
}

function endDrag(clientX, clientY) {
  if (!dragState) {
    return;
  }

  const { element, fromStack, offsetX, offsetY } = dragState;
  const def = TILE_TYPES[element.dataset.type];
  const point = getLocalPoint(clientX, clientY);
  const x = point.x - offsetX;
  const y = point.y - offsetY;
  const snapped = snapPosition(x, y, def.w, def.h, element);

  clearDragGhost();

  const dropOnStack = isPointerInStack(clientX, clientY);
  const dropOutsideBoard = fromStack && !isPointerInBoard(clientX, clientY);

  if (dropOnStack || dropOutsideBoard) {
    element.remove();
  } else {
    element.removeAttribute("visibility");
    setTranslate(element, snapped.x, snapped.y);
  }

  element.classList.remove("is-dragging");
  dragState = null;
}

tileStack.addEventListener("pointerdown", (event) => {
  const stackTile = event.target.closest(".stack-tile");
  if (!stackTile) {
    return;
  }

  event.preventDefault();
  dismissIntroHint();
  startDragFromStack(stackTile.dataset.type, event.clientX, event.clientY, stackTile);
  beginDragTracking(event.pointerId);
});

placedTilesLayer.addEventListener("pointerdown", (event) => {
  const placedTile = event.target.closest(".placed-tile");
  if (!placedTile) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const point = getLocalPoint(event.clientX, event.clientY);
  startDragPlacedTile(placedTile, point.x, point.y);
  beginDragTracking(event.pointerId);
});

function createLine(x1, y1, x2, y2) {
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", String(x1));
  line.setAttribute("y1", String(y1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y2", String(y2));
  line.setAttribute("stroke", "#334155");
  return line;
}

function createLabel(text, x, y, anchor = "middle") {
  const label = document.createElementNS(SVG_NS, "text");
  label.textContent = text;
  label.setAttribute("x", String(x));
  label.setAttribute("y", String(y));
  label.setAttribute("text-anchor", anchor);
  label.setAttribute("fill", "#334155");
  label.setAttribute("font-size", "10");
  label.setAttribute("font-family", "Fenomen Sans, ui-sans-serif, system-ui, sans-serif");
  return label;
}

function getSceneInnerSize() {
  return {
    w: MIN_INNER_WIDTH,
    h: MIN_INNER_HEIGHT,
  };
}

function getWorkSurfaceBounds() {
  return getSceneInnerSize();
}

function getContentExtents() {
  return {
    innerWidth: MIN_INNER_WIDTH,
    innerHeight: MIN_INNER_HEIGHT,
  };
}

function getCanvasPositionForSize(widthDm, heightDm, surface = getWorkSurfaceBounds()) {
  const rectW = widthDm * DM;
  const rectH = heightDm * DM;
  let x = (surface.w - rectW) / 2;
  let y = (surface.h - rectH) / 2;

  const maxX = Math.max(CANVAS_POSITION_MARGIN, surface.w - rectW - CANVAS_RIGHT_MARGIN);
  const maxY = Math.max(CANVAS_POSITION_MARGIN, surface.h - rectH - CANVAS_BOTTOM_MARGIN);
  x = Math.min(Math.max(CANVAS_POSITION_MARGIN, x), maxX);
  y = Math.min(Math.max(CANVAS_POSITION_MARGIN, y), maxY);

  return { x, y };
}

function centerCanvasPosition(widthDm, heightDm) {
  canvasPosition = getCanvasPositionForSize(widthDm, heightDm);
  applyCanvasPosition();
}

function getAvailableDiagramSize() {
  const width = diagramWrap.clientWidth || stage.clientWidth || stage.offsetWidth;
  const height = diagramWrap.clientHeight || stage.clientHeight || stage.offsetHeight;

  return {
    width: Math.max(200, width),
    height: Math.max(200, height),
  };
}

function getMaxCanvasDm() {
  return {
    widthDm: CANVAS_MAX_DM_W,
    heightDm: CANVAS_MAX_DM_H,
  };
}

function clampCanvasSize(widthDm, heightDm) {
  return {
    widthDm: Math.max(CANVAS_MIN_DM, Math.min(widthDm, CANVAS_MAX_DM_W)),
    heightDm: Math.max(CANVAS_MIN_DM, Math.min(heightDm, CANVAS_MAX_DM_H)),
  };
}

function getCanvasSizeInDm() {
  return {
    widthDm: CANVAS.w / DM,
    heightDm: CANVAS.h / DM,
  };
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clearPlacedTiles() {
  placedTilesLayer.replaceChildren();
}

function updateToolbarModeState() {
  modeRectangleBtn.classList.toggle("is-active", !isFreeSurfaceMode);
  modeFreeBtn.classList.toggle("is-active", isFreeSurfaceMode);
  modeRectangleBtn.setAttribute("aria-selected", String(!isFreeSurfaceMode));
  modeFreeBtn.setAttribute("aria-selected", String(isFreeSurfaceMode));
  appRoot.dataset.appMode = isFreeSurfaceMode ? "free" : "rectangle";
  rectanglePanel.hidden = isFreeSurfaceMode;
  freePanel.hidden = !isFreeSurfaceMode;
}

function updateStackTileSizes(outerWidth, outerHeight, available) {
  const displayScale = Math.min(
    available.width / outerWidth,
    available.height / outerHeight,
  );
  document.documentElement.style.setProperty(
    "--canvas-display-scale",
    String(CANVAS_SCALE * displayScale),
  );
}

function getActiveZoom() {
  return isFreeSurfaceMode ? freeZoom : 1;
}

function syncZoomControls() {
  const pct = Math.round(freeZoom * 100);
  zoomSlider.value = String(pct);
  zoomSlider.setAttribute("aria-valuenow", String(pct));
  zoomSlider.setAttribute("aria-valuetext", `${pct} procent`);
  zoomOutBtn.disabled = freeZoom <= FREE_ZOOM_MIN + 1e-9;
  zoomInBtn.disabled = freeZoom >= FREE_ZOOM_MAX - 1e-9;
}

function applyBoardTransformCss() {
  diagramWrap.style.setProperty("--board-pan-x", `${freePan.x}px`);
  diagramWrap.style.setProperty("--board-pan-y", `${freePan.y}px`);
  diagramWrap.style.setProperty("--board-zoom", String(getActiveZoom()));
}

function resetBoardPan() {
  freePan = { x: 0, y: 0 };
  panDrag = null;
  boardPanCatch.classList.remove("is-dragging-pan");
  applyBoardTransformCss();
}

function setPanMode(on) {
  isPanMode = on;
  canvasPanToggle.setAttribute("aria-pressed", on ? "true" : "false");
  canvasPanToggle.classList.toggle("is-pressed", on);

  if (on) {
    boardPanCatch.removeAttribute("hidden");
    boardPanCatch.setAttribute("aria-hidden", "false");
  } else {
    boardPanCatch.setAttribute("hidden", "");
    boardPanCatch.setAttribute("aria-hidden", "true");
    boardPanCatch.classList.remove("is-dragging-pan");
    panDrag = null;
  }
}

function setFreeZoom(zoom) {
  freeZoom = Math.min(FREE_ZOOM_MAX, Math.max(FREE_ZOOM_MIN, zoom));
  syncZoomControls();
  applyBoardTransformCss();
}

function updateViewBox() {
  const { innerWidth, innerHeight } = getContentExtents();
  const outerWidth = innerWidth * CANVAS_SCALE;
  const outerHeight = innerHeight * CANVAS_SCALE;

  // Keep the full scene in the viewBox. Free-mode zoom is a CSS scale so
  // placed tiles are never cropped out of the SVG coordinate space.
  diagram.setAttribute("viewBox", `0 0 ${outerWidth} ${outerHeight}`);
  diagram.setAttribute("preserveAspectRatio", "xMidYMid meet");
  diagramBg.setAttribute("x", "0");
  diagramBg.setAttribute("y", "0");
  diagramBg.setAttribute("width", String(outerWidth));
  diagramBg.setAttribute("height", String(outerHeight));
  diagramWrap.style.width = "100%";
  diagramWrap.style.height = "100%";
  diagram.style.width = "100%";
  diagram.style.height = "100%";

  applyBoardTransformCss();
  updateStackTileSizes(outerWidth, outerHeight, getAvailableDiagramSize());
}

function setStaticLayerVisible(visible) {
  staticLayer.style.visibility = visible ? "visible" : "hidden";
}

function enterFreeSurfaceMode() {
  isFreeSurfaceMode = true;
  freeZoom = FREE_ZOOM_MIN;
  resetBoardPan();
  setPanMode(false);
  syncZoomControls();
  setStaticLayerVisible(false);
  clearPlacedTiles();
  resetAreaQuiz();
  updateToolbarModeState();
  updateViewBox();
}

function exitFreeSurfaceMode() {
  isFreeSurfaceMode = false;
  freeZoom = FREE_ZOOM_MIN;
  resetBoardPan();
  setPanMode(false);
  syncZoomControls();
  setStaticLayerVisible(true);
  updateToolbarModeState();
}

function renderCanvas() {
  canvasTicks.replaceChildren();
  canvasLabels.replaceChildren();

  canvasElement.setAttribute("width", String(CANVAS.w));
  canvasElement.setAttribute("height", String(CANVAS.h));

  const tickTop = -5.5;
  const tickBottom = 4.5;
  const tickLeft = -5.5;
  const tickRight = 4.5;

  for (let i = 1; i < CANVAS.w / DM; i += 1) {
    const x = i * DM;
    canvasTicks.appendChild(createLine(x, tickTop, x, tickBottom));
  }

  for (let i = 1; i < CANVAS.h / DM; i += 1) {
    const y = i * DM;
    canvasTicks.appendChild(createLine(tickLeft, y, tickRight, y));
  }

  const { widthDm, heightDm } = getCanvasSizeInDm();
  canvasLabels.appendChild(createLabel(`${widthDm} dm`, CANVAS.w / 2, CANVAS.h + 13));
  canvasLabels.appendChild(createLabel(`${heightDm} dm`, CANVAS.w + 13, CANVAS.h / 2, "start"));

  applyCanvasPosition();
  updateViewBox();
}

function updateCanvasSizeInputs() {
  const max = getMaxCanvasDm();
  canvasWidthInput.min = String(CANVAS_MIN_DM);
  canvasWidthInput.max = String(max.widthDm);
  canvasHeightInput.min = String(CANVAS_MIN_DM);
  canvasHeightInput.max = String(max.heightDm);

  const { widthDm, heightDm } = getCanvasSizeInDm();
  canvasWidthInput.value = String(widthDm);
  canvasHeightInput.value = String(heightDm);
  updateCanvasDimStepButtonsAll();
}

function updateCanvasDimStepButtons(input) {
  const container = input.closest(".step-input");
  if (!container) {
    return;
  }

  const min = Number(input.min);
  const max = Number(input.max);
  const current = Number(input.value);
  const value = Number.isFinite(current) ? current : min;

  container.querySelector(".step-up").disabled = value >= max;
  container.querySelector(".step-down").disabled = value <= min;
}

function updateCanvasDimStepButtonsAll() {
  updateCanvasDimStepButtons(canvasWidthInput);
  updateCanvasDimStepButtons(canvasHeightInput);
}

function stepCanvasDim(input, delta) {
  const min = Number(input.min);
  const max = Number(input.max);
  const current = Number(input.value);
  const base = Number.isFinite(current) ? current : min;
  input.value = String(Math.min(max, Math.max(min, base + delta)));
  updateCanvasDimStepButtons(input);
  applyCanvasSizeFromInputs();
}

function applyCanvasSizeFromInputs() {
  const width = Number(canvasWidthInput.value);
  const height = Number(canvasHeightInput.value);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }

  setCanvasSize(width, height);
}

function setCanvasSize(widthDm, heightDm) {
  exitFreeSurfaceMode();
  const clamped = clampCanvasSize(widthDm, heightDm);
  CANVAS.w = clamped.widthDm * DM;
  CANVAS.h = clamped.heightDm * DM;
  centerCanvasPosition(clamped.widthDm, clamped.heightDm);
  clearPlacedTiles();
  resetAreaQuiz();
  renderCanvas();
  updateCanvasSizeInputs();
}

function getCanvasAreaDm2() {
  const { widthDm, heightDm } = getCanvasSizeInDm();
  return widthDm * heightDm;
}

function convertAreaFromDm2(areaDm2, unit) {
  if (unit === "cm2") {
    return areaDm2 * 100;
  }
  if (unit === "mm2") {
    return areaDm2 * 10000;
  }
  return areaDm2;
}

function clearCelebration() {
  if (celebrationTimer) {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = null;
  }

  document.querySelector(".quiz-celebration")?.remove();
}

function getCanvasCenterClientPoint() {
  const rect = canvasElement.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function launchGreenConfetti() {
  clearCelebration();

  const center = getCanvasCenterClientPoint();
  const layer = document.createElement("div");
  layer.className = "quiz-celebration";
  layer.setAttribute("aria-hidden", "true");

  const burst = document.createElement("div");
  burst.className = "quiz-confetti-burst";
  burst.style.left = `${center.x}px`;
  burst.style.top = `${center.y}px`;
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

  document.body.append(layer);

  celebrationTimer = window.setTimeout(() => {
    clearCelebration();
  }, 1800);
}

function parseAreaInput(raw) {
  const normalized = String(raw).trim().replace(",", ".");
  if (!normalized) {
    return Number.NaN;
  }
  return Number(normalized);
}

function normalizeAreaUnit(unit) {
  if (!unit) {
    return "";
  }
  const normalized = String(unit)
    .trim()
    .toLowerCase()
    .replace("²", "2")
    .replace(/\s+/g, "");
  if (normalized === "dm2" || normalized === "cm2" || normalized === "mm2") {
    return normalized;
  }
  return "";
}

function parseAreaAnswer(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return { numericText: "", value: null, unit: "" };
  }

  const match = trimmed.match(/^([+-]?\d+(?:[.,]\d+)?)\s*(dm²|cm²|mm²|dm2|cm2|mm2)?$/i);
  if (!match) {
    return { numericText: trimmed, value: null, unit: "" };
  }

  const numericText = match[1].replace(".", ",");
  const value = Number.parseFloat(match[1].replace(",", "."));
  return {
    numericText,
    value: Number.isFinite(value) ? value : null,
    unit: normalizeAreaUnit(match[2]),
  };
}

function formatAreaDraft(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    return "";
  }
  const value = parseAreaInput(trimmed);
  if (!Number.isFinite(value)) {
    return trimmed;
  }
  return String(value).replace(".", ",");
}

function formatAreaAnswerWithUnit(numericText, unit) {
  const draft = formatAreaDraft(numericText);
  const label = AREA_UNIT_LABELS[normalizeAreaUnit(unit)];
  if (!draft) {
    return "";
  }
  return label ? `${draft} ${label}` : draft;
}

function clearAreaKeypadError() {
  areaKeypadError.hidden = true;
  areaKeypadError.textContent = "";
  areaKeypadDisplay.classList.remove("is-invalid");
}

function showAreaKeypadError(message) {
  areaKeypadError.hidden = false;
  areaKeypadError.textContent = message;
  areaKeypadDisplay.classList.add("is-invalid");
}

function validateAreaKeypadDraft() {
  const raw = areaKeypadDraft.trim();
  if (!raw || raw === "," || raw === ".") {
    return { ok: false, message: "Zadej platné číslo." };
  }
  const value = parseAreaInput(raw);
  if (!Number.isFinite(value)) {
    return { ok: false, message: "Zadej platné číslo." };
  }
  if (value < 0) {
    return { ok: false, message: "Hodnota nemůže být záporná." };
  }
  if (!areaKeypadUnit) {
    return { ok: false, message: "Vyber jednotku." };
  }
  return { ok: true };
}

function updateAreaKeypadUnitButtons() {
  areaKeypadUnitKeys.forEach((button) => {
    const isActive = button.dataset.unit === areaKeypadUnit;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setAreaKeypadUnit(unit) {
  areaKeypadUnit = normalizeAreaUnit(unit);
  updateAreaKeypadDisplay();
}

function updateAreaKeypadDisplay() {
  areaKeypadDisplay.textContent = formatAreaAnswerWithUnit(areaKeypadDraft, areaKeypadUnit);
  updateAreaKeypadUnitButtons();
  clearAreaKeypadError();
}

function showAreaKeypad() {
  dismissIntroHint();
  const parsed = parseAreaAnswer(areaValueInput.value);
  areaKeypadDraft = parsed.numericText;
  areaKeypadUnit = parsed.unit;
  clearAreaKeypadError();
  updateAreaKeypadDisplay();
  areaKeypadOverlay.hidden = false;
  isAreaKeypadOpen = true;
  areaValueInput.blur();
}

function hideAreaKeypad() {
  areaKeypadDraft = "";
  areaKeypadUnit = "";
  clearAreaKeypadError();
  areaKeypadOverlay.hidden = true;
  areaKeypadDisplay.textContent = "";
  isAreaKeypadOpen = false;
  updateAreaKeypadUnitButtons();
}

function insertIntoAreaKeypadDraft(value) {
  if (value === "," || value === ".") {
    if (areaKeypadDraft.includes(",") || areaKeypadDraft.includes(".")) {
      return;
    }
  }
  if (areaKeypadDraft.length >= 12) {
    return;
  }
  areaKeypadDraft += value;
  updateAreaKeypadDisplay();
}

function clearAreaKeypadDraft() {
  areaKeypadDraft = "";
  updateAreaKeypadDisplay();
}

function confirmAreaKeypad() {
  const result = validateAreaKeypadDraft();
  if (!result.ok) {
    showAreaKeypadError(result.message);
    return;
  }

  areaValueInput.value = formatAreaAnswerWithUnit(areaKeypadDraft, areaKeypadUnit);
  hideAreaKeypad();
  resetAreaQuizFeedback();
}

function handleAreaKeypadClick(event) {
  const key = event.currentTarget;
  const action = key.getAttribute("data-action");
  const value = key.getAttribute("data-value");

  if (action === "clear") {
    clearAreaKeypadDraft();
    return;
  }

  if (value) {
    insertIntoAreaKeypadDraft(value);
  }
}

function handleAreaUnitClick(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    return;
  }
  setAreaKeypadUnit(button.dataset.unit);
}

function resetAreaQuizFeedback() {
  areaAnswerRow.classList.remove("is-correct", "is-wrong");
  areaFeedback.textContent = "";
  areaFeedback.classList.remove("is-correct", "is-wrong");
}

function resetAreaQuiz() {
  areaValueInput.value = "";
  resetAreaQuizFeedback();
}

function verifyAreaAnswer() {
  const parsed = parseAreaAnswer(areaValueInput.value);

  resetAreaQuizFeedback();

  if (parsed.value === null) {
    areaAnswerRow.classList.add("is-wrong");
    areaFeedback.classList.add("is-wrong");
    areaFeedback.textContent = "Zadej číslo.";
    return;
  }

  if (!parsed.unit) {
    areaAnswerRow.classList.add("is-wrong");
    areaFeedback.classList.add("is-wrong");
    areaFeedback.textContent = "Vyber jednotku.";
    return;
  }

  const expected = convertAreaFromDm2(getCanvasAreaDm2(), parsed.unit);
  const isCorrect = Math.abs(parsed.value - expected) < 0.001;

  if (isCorrect) {
    areaAnswerRow.classList.add("is-correct");
    areaFeedback.classList.add("is-correct");
    areaFeedback.textContent = "Správně!";
    launchGreenConfetti();
    return;
  }

  areaAnswerRow.classList.add("is-wrong");
  areaFeedback.classList.add("is-wrong");
  areaFeedback.textContent = "To není správně. Zkus to znovu.";
}

function generateRandomCanvas() {
  const max = getMaxCanvasDm();
  const current = getCanvasSizeInDm();
  let widthDm = randomInt(CANVAS_MIN_DM, max.widthDm);
  let heightDm = randomInt(CANVAS_MIN_DM, max.heightDm);

  if (!isFreeSurfaceMode && (max.widthDm > CANVAS_MIN_DM || max.heightDm > CANVAS_MIN_DM)) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      widthDm = randomInt(CANVAS_MIN_DM, max.widthDm);
      heightDm = randomInt(CANVAS_MIN_DM, max.heightDm);
      if (widthDm !== current.widthDm || heightDm !== current.heightDm) {
        break;
      }
    }
  }

  setCanvasSize(widthDm, heightDm);
}

function handleViewportChange() {
  if (isFreeSurfaceMode) {
    updateViewBox();
    return;
  }

  const current = getCanvasSizeInDm();
  updateCanvasSizeInputs();
  centerCanvasPosition(current.widthDm, current.heightDm);
  updateViewBox();
}

function initCanvas() {
  generateRandomCanvas();
  requestAnimationFrame(updateViewBox);
}

initCanvas();
updateToolbarModeState();
updateCanvasSizeInputs();
syncZoomControls();
modeRectangleBtn.addEventListener("click", () => {
  if (isFreeSurfaceMode) {
    generateRandomCanvas();
  }
});
modeFreeBtn.addEventListener("click", enterFreeSurfaceMode);
randomCanvasBtn.addEventListener("click", generateRandomCanvas);
zoomSlider.addEventListener("input", () => {
  setFreeZoom(Number(zoomSlider.value) / 100);
});
zoomOutBtn.addEventListener("click", () => {
  setFreeZoom(freeZoom - FREE_ZOOM_STEP);
});
zoomInBtn.addEventListener("click", () => {
  setFreeZoom(freeZoom + FREE_ZOOM_STEP);
});
canvasPanToggle.addEventListener("click", () => {
  if (!isFreeSurfaceMode) {
    return;
  }
  setPanMode(!isPanMode);
});
boardPanCatch.addEventListener("pointerdown", (event) => {
  if (!isPanMode || !isFreeSurfaceMode) {
    return;
  }

  event.preventDefault();
  panDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: freePan.x,
    originY: freePan.y,
  };
  boardPanCatch.classList.add("is-dragging-pan");
  boardPanCatch.setPointerCapture(event.pointerId);
});
boardPanCatch.addEventListener("pointermove", (event) => {
  if (!panDrag || panDrag.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  freePan = {
    x: panDrag.originX + (event.clientX - panDrag.startX),
    y: panDrag.originY + (event.clientY - panDrag.startY),
  };
  applyBoardTransformCss();
});
function endBoardPanDrag(event) {
  if (!panDrag || panDrag.pointerId !== event.pointerId) {
    return;
  }

  if (boardPanCatch.hasPointerCapture(event.pointerId)) {
    boardPanCatch.releasePointerCapture(event.pointerId);
  }
  panDrag = null;
  boardPanCatch.classList.remove("is-dragging-pan");
}
boardPanCatch.addEventListener("pointerup", endBoardPanDrag);
boardPanCatch.addEventListener("pointercancel", endBoardPanDrag);
diagram.addEventListener(
  "wheel",
  (event) => {
    if (!isFreeSurfaceMode) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? -FREE_ZOOM_STEP : FREE_ZOOM_STEP;
    setFreeZoom(freeZoom + direction);
  },
  { passive: false },
);
document.querySelectorAll(".step-btn[data-dim-input]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.dimInput);
    if (!input) {
      return;
    }

    stepCanvasDim(input, button.classList.contains("step-up") ? 1 : -1);
  });
});
[canvasWidthInput, canvasHeightInput].forEach((input) => {
  input.addEventListener("input", updateCanvasDimStepButtonsAll);
  input.addEventListener("change", applyCanvasSizeFromInputs);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      applyCanvasSizeFromInputs();
    }
  });
});
areaValueInput.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  showAreaKeypad();
});
areaKeypadConfirm.addEventListener("click", confirmAreaKeypad);
areaKeypadCancel.addEventListener("click", hideAreaKeypad);
areaKeypadOverlay.addEventListener("click", (event) => {
  if (event.target === areaKeypadOverlay) {
    hideAreaKeypad();
  }
});
verifyBtn.addEventListener("click", verifyAreaAnswer);
areaKeypadUnitKeys.forEach((button) => {
  button.addEventListener("click", handleAreaUnitClick);
});
areaMathKeypad.querySelectorAll(".table-math-keypad__key").forEach((keyBtn) => {
  keyBtn.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  keyBtn.addEventListener("click", handleAreaKeypadClick);
});
document.addEventListener("keydown", (event) => {
  if (!isAreaKeypadOpen) {
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    hideAreaKeypad();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    confirmAreaKeypad();
  }
});
window.addEventListener("resize", handleViewportChange);
