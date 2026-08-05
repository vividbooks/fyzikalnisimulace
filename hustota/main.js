const resetBtn = document.getElementById('resetBtn');
const helpBtn = document.getElementById('helpBtn');
const helpDialog = document.getElementById('helpDialog');
const helpCloseBtn = document.getElementById('helpCloseBtn');
const fieldModeOneBtn = document.getElementById('fieldModeOne');
const fieldModeTwoBtn = document.getElementById('fieldModeTwo');
const maskBtn = document.getElementById('maskBtn');
const pauseBtn = document.getElementById('pauseBtn');
const appShell = document.querySelector('.app-shell');

const BALL_RADIUS = 4;
const SPEED = 5;
const MAX_BALLS = 90;
const MIN_ARENA_SIZE = 100;
const MIN_AREA_CM2 = 1;
const MAX_AREA_CM2_ONE_FIELD = 36;
const MAX_AREA_CM2_TWO_FIELDS = 25;
const DEFAULT_AREA_CM2 = 4;
const DEFAULT_BALL_COUNT = 4;
const START_PATTERN_COUNT = 10;
const BASE_UI_SCALE = 0.9025;
const UI_OFFSET_Y = 15;

const DEFAULT_FIELD_COUNT = 1;
const MASK_HOLE_AREA_CM2 = 1;
const MASK_BLUR_PX = 10;

const fields = [];
let activeFieldCount = DEFAULT_FIELD_COUNT;
let maskEnabled = false;
let pauseEnabled = false;

function getFieldCount() {
  return activeFieldCount;
}

function getVisibleFields() {
  return fields.slice(0, activeFieldCount);
}

function getMaxAreaCap() {
  return getFieldCount() >= 2 ? MAX_AREA_CM2_TWO_FIELDS : MAX_AREA_CM2_ONE_FIELD;
}

function getMaxSideCm() {
  return Math.sqrt(getMaxAreaCap());
}

function ballWord(count) {
  if (!Number.isInteger(count)) return 'míčku';

  const n = Math.abs(count);
  const last = n % 10;
  const lastTwo = n % 100;

  if (count === 1) return 'míček';
  if (lastTwo >= 11 && lastTwo <= 14) return 'míčků';
  if (last >= 2 && last <= 4) return 'míčky';
  return 'míčků';
}

function formatDensityText(value) {
  const rounded = Math.round(value * 100) / 100;
  const number = rounded.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  return `${number} ${ballWord(rounded)} na cm²`;
}

let activeScrubDragStop = null;

function bindChannelScrubDrag(scrubEl, getStartValue, applyDragValue) {
  let dragging = false;
  let startX = 0;
  let startV = 0;
  let activePointerId = null;

  const applyFromDrag = (clientX) => {
    const delta = Math.round((clientX - startX) / 2);
    applyDragValue(startV + delta);
  };

  const stopDragging = () => {
    if (!dragging) return;
    dragging = false;
    activePointerId = null;
    if (activeScrubDragStop === stopDragging) {
      activeScrubDragStop = null;
    }
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('pointercancel', onPointerUp, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    window.removeEventListener('blur', stopDragging);
  };

  const onPointerMove = (e) => {
    if (!dragging || e.pointerId !== activePointerId) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
      stopDragging();
      return;
    }
    applyFromDrag(e.clientX);
  };

  const onPointerUp = (e) => {
    if (!dragging || e.pointerId !== activePointerId) return;
    stopDragging();
  };

  const onMouseUp = () => stopDragging();

  scrubEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.channel-scrub-arrow')) return;

    if (activeScrubDragStop) {
      activeScrubDragStop();
    }
    activeScrubDragStop = stopDragging;

    dragging = true;
    activePointerId = e.pointerId;
    startX = e.clientX;
    startV = getStartValue();

    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('blur', stopDragging);
  });
}

function getLayoutContentSize() {
  const main = appShell?.querySelector('.main');
  if (!main) {
    return { width: 0, height: 0 };
  }

  if (activeFieldCount === 1) {
    return {
      width: main.offsetWidth,
      height: main.offsetHeight,
    };
  }

  let maxWidth = 0;
  let maxHeight = 0;
  main.querySelectorAll('.field-unit:not(.is-hidden)').forEach((unit) => {
    maxWidth += unit.offsetWidth;
    maxHeight = Math.max(maxHeight, unit.offsetHeight);
  });

  const fieldsRow = main.querySelector('.fields-row');
  const rowStyle = fieldsRow ? getComputedStyle(fieldsRow) : null;
  const gap = rowStyle ? Number.parseFloat(rowStyle.columnGap || rowStyle.gap) || 0 : 0;
  if (activeFieldCount > 1) {
    maxWidth += gap * (activeFieldCount - 1);
  }

  return { width: maxWidth, height: maxHeight };
}

function updateViewportFit() {
  if (!appShell) return;

  const globalActions = document.querySelector('.global-actions');
  const globalBarHeight = globalActions?.offsetHeight || 0;
  const shellStyle = getComputedStyle(appShell);
  const padTop = Number.parseFloat(shellStyle.paddingTop) || 0;
  const padBottom = Number.parseFloat(shellStyle.paddingBottom) || 0;
  const padLeft = Number.parseFloat(shellStyle.paddingLeft) || 0;
  const padRight = Number.parseFloat(shellStyle.paddingRight) || 0;
  const { width: contentWidth, height: contentHeight } = getLayoutContentSize();
  const availableHeight = window.innerHeight - globalBarHeight - padTop - padBottom - 8;
  const availableWidth = window.innerWidth - padLeft - padRight - 16;

  let scale = BASE_UI_SCALE;
  if (contentHeight > 0 && contentHeight * scale > availableHeight) {
    scale = Math.min(scale, availableHeight / contentHeight);
  }
  if (contentWidth > 0 && contentWidth * scale > availableWidth) {
    scale = Math.min(scale, availableWidth / contentWidth);
  }

  appShell.style.transform = `translateY(${UI_OFFSET_Y}px) scale(${scale})`;
  appShell.style.transformOrigin = 'top center';
}

class Field {
  constructor(root) {
    this.root = root;
    this.statsPanel = root.querySelector('.stats-panel');
    this.arenaComposite = root.querySelector('.arena-composite');
    this.arena = root.querySelector('.arena');
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeHint = root.querySelector('.resize-hint');
    this.arenaControlsRight = root.querySelector('.arena-controls--right');
    this.arenaControlsBottom = root.querySelector('.arena-controls--bottom');
    this.shrinkArenaBtnRight = this.arenaControlsRight.querySelector('.arena-size-btn--minus');
    this.addArenaBtnRight = this.arenaControlsRight.querySelector('.arena-size-btn--plus');
    this.shrinkArenaBtnBottom = this.arenaControlsBottom.querySelector('.arena-size-btn--minus');
    this.addArenaBtnBottom = this.arenaControlsBottom.querySelector('.arena-size-btn--plus');
    this.ballCountScrub = root.querySelector('.ball-count-scrub');
    this.ballCountValue = root.querySelector('.ball-count-value');
    this.areaScrub = root.querySelector('.area-scrub');
    this.areaScrubValue = root.querySelector('.area-scrub-value');
    this.densityValue = root.querySelector('.density-value');

    this.balls = [];
    this.ballCount = DEFAULT_BALL_COUNT;
    this.squareCount = 1;
    this.rowCount = 1;
    this.cellSize = MIN_ARENA_SIZE * Math.sqrt(DEFAULT_AREA_CM2 / MIN_AREA_CM2);
    this.dragState = null;
    this.areaCm2 = 0;
    this.width = 0;
    this.height = 0;
    this.lastStartPatternIndex = -1;
    this.currentStartPatternIndex = 0;
    this.resizeHintTimeout = null;
    this.maskHoleX = 0;
    this.maskHoleY = 0;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;

    this.bindEvents();
  }

  getBorderSumPx() {
    const s = getComputedStyle(this.arena);
    const bx = (Number.parseFloat(s.borderLeftWidth) || 0) + (Number.parseFloat(s.borderRightWidth) || 0);
    const by = (Number.parseFloat(s.borderTopWidth) || 0) + (Number.parseFloat(s.borderBottomWidth) || 0);
    return { bx, by };
  }

  getMaxAreaCm2() {
    const cap = getMaxAreaCap();
    const maxSide = getMaxSideCm();
    const maxFromWidth = (maxSide / this.squareCount) ** 2;
    const maxFromHeight = (maxSide / this.rowCount) ** 2;
    const maxFromDimensions = Math.min(maxFromWidth, maxFromHeight);
    return Math.min(cap, Math.max(MIN_AREA_CM2, Math.floor(maxFromDimensions)));
  }

  getMaxCellSize() {
    return MIN_ARENA_SIZE * Math.sqrt(this.getMaxAreaCm2() / MIN_AREA_CM2);
  }

  getTotalWidth() {
    return this.cellSize * this.squareCount;
  }

  getTotalHeight() {
    return this.cellSize * this.rowCount;
  }

  getTotalAreaCm2() {
    return this.areaCm2 * this.squareCount * this.rowCount;
  }

  getDensity() {
    const totalArea = this.getTotalAreaCm2();
    if (!totalArea) return 0;
    return this.balls.length / totalArea;
  }

  getSideLengthCm() {
    return Math.sqrt(this.areaCm2);
  }

  getCmToPx() {
    const sideCm = this.getSideLengthCm();
    return sideCm ? this.cellSize / sideCm : MIN_ARENA_SIZE;
  }

  getMaskHoleSidePx() {
    return this.getCmToPx() * Math.sqrt(MASK_HOLE_AREA_CM2);
  }

  updateMaskHolePosition() {
    const holeSide = this.getMaskHoleSidePx();
    const totalWidth = this.getTotalWidth();
    const totalHeight = this.getTotalHeight();
    this.maskHoleX = Math.max(0, (totalWidth - holeSide) / 2);
    this.maskHoleY = Math.max(0, (totalHeight - holeSide) / 2);
  }

  ensureOffscreenCanvas() {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }
    if (this.offscreenCanvas.width !== this.width || this.offscreenCanvas.height !== this.height) {
      this.offscreenCanvas.width = this.width;
      this.offscreenCanvas.height = this.height;
    }
  }

  shouldUseMask() {
    return maskEnabled;
  }

  canDuplicateHorizontally() {
    const nextSquareCount = this.squareCount * 2;
    const side = this.getSideLengthCm();
    const maxSide = getMaxSideCm();
    return side <= maxSide && nextSquareCount * side <= maxSide;
  }

  canDuplicateVertically() {
    const nextRowCount = this.rowCount * 2;
    const side = this.getSideLengthCm();
    const maxSide = getMaxSideCm();
    return side <= maxSide && nextRowCount * side <= maxSide;
  }

  canShrinkHorizontally() {
    return this.squareCount >= 2;
  }

  canShrinkVertically() {
    return this.rowCount >= 2;
  }

  updateSizeButtons() {
    const horizontalExpandAllowed = this.canDuplicateHorizontally();
    const verticalExpandAllowed = this.canDuplicateVertically();
    const horizontalShrinkAllowed = this.canShrinkHorizontally();
    const verticalShrinkAllowed = this.canShrinkVertically();
    const maxSide = getMaxSideCm();

    this.addArenaBtnRight.disabled = !horizontalExpandAllowed;
    this.addArenaBtnRight.title = horizontalExpandAllowed
      ? 'Zkopírovat plochu vpravo'
      : `Nelze zkopírovat — celková plocha by měla stranu delší než ${maxSide} cm`;

    this.shrinkArenaBtnRight.disabled = !horizontalShrinkAllowed;
    this.shrinkArenaBtnRight.title = horizontalShrinkAllowed
      ? 'Zmenšit plochu vpravo'
      : 'Nelze zmenšit — zbývá jen jeden sloupec čtverců';

    this.addArenaBtnBottom.disabled = !verticalExpandAllowed;
    this.addArenaBtnBottom.title = verticalExpandAllowed
      ? 'Zkopírovat plochu dolů'
      : `Nelze zkopírovat — celková plocha by měla stranu delší než ${maxSide} cm`;

    this.shrinkArenaBtnBottom.disabled = !verticalShrinkAllowed;
    this.shrinkArenaBtnBottom.title = verticalShrinkAllowed
      ? 'Zmenšit plochu dolů'
      : 'Nelze zmenšit — zbývá jen jeden řádek čtverců';
  }

  updateStats() {
    this.densityValue.textContent = this.getTotalAreaCm2()
      ? formatDensityText(this.getDensity())
      : '—';
    this.updateSizeButtons();
    this.updateBallCountScrubDisplay();
    this.updateAreaScrubDisplay();
  }

  getSquareCount() {
    return this.squareCount * this.rowCount;
  }

  getMinTotalBallCount() {
    return this.getSquareCount();
  }

  getMaxTotalBallCount() {
    return MAX_BALLS * this.getSquareCount();
  }

  getTotalBallCount() {
    return this.balls.length;
  }

  getMinTotalAreaCm2() {
    return MIN_AREA_CM2 * this.getSquareCount();
  }

  getMaxTotalAreaCm2() {
    return this.getMaxAreaCm2() * this.getSquareCount();
  }

  colorsForIndex(index) {
    const hue = (index * 137.508) % 360;
    return [
      `hsl(${hue} 92% 72%)`,
      `hsl(${hue} 86% 52%)`,
      `hsl(${hue} 86% 34%)`,
    ];
  }

  pickStartPatternIndex() {
    let index = Math.floor(Math.random() * START_PATTERN_COUNT);
    if (START_PATTERN_COUNT > 1) {
      while (index === this.lastStartPatternIndex) {
        index = Math.floor(Math.random() * START_PATTERN_COUNT);
      }
    }
    this.lastStartPatternIndex = index;
    this.currentStartPatternIndex = index;
    return index;
  }

  getRandomStartAngle(patternIndex, ballIndex, ballsInSquare) {
    const patternRotation = (Math.PI * 2 * patternIndex) / START_PATTERN_COUNT;
    const fanAngle = (Math.PI * 2 * ballIndex) / Math.max(ballsInSquare, 1);
    const randomAngle = Math.random() * Math.PI * 2;
    const mix = patternIndex / START_PATTERN_COUNT;
    return patternRotation + fanAngle * (1 - mix) + randomAngle * mix;
  }

  setBallMotion(ball, patternIndex, ballIndex, ballsInSquare) {
    const angle = this.getRandomStartAngle(patternIndex, ballIndex, ballsInSquare);
    ball.vx = Math.cos(angle) * SPEED;
    ball.vy = Math.sin(angle) * SPEED;
  }

  applyStartVelocities(ballList) {
    const patternIndex = this.currentStartPatternIndex;
    ballList.forEach((ball, index) => this.setBallMotion(ball, patternIndex, index, ballList.length));
  }

  applyStartVelocitiesToSquares(ballList, squareCountTotal, ballsPerSquare) {
    for (let i = 0; i < squareCountTotal; i++) {
      const squareBalls = ballList.slice(i * ballsPerSquare, (i + 1) * ballsPerSquare);
      if (squareBalls.length) {
        this.applyStartVelocities(squareBalls);
      }
    }
  }

  randomizeBallMotion(ballList = this.balls, squareCountTotal = this.squareCount * this.rowCount) {
    this.pickStartPatternIndex();
    this.applyStartVelocitiesToSquares(ballList, squareCountTotal, this.ballCount);
  }

  createBall(index) {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      colors: this.colorsForIndex(index),
    };
  }

  cloneBall(ball) {
    return {
      x: ball.x,
      y: ball.y,
      vx: ball.vx,
      vy: ball.vy,
      radius: ball.radius,
      colors: [...ball.colors],
    };
  }

  normalizeSpeed(ball) {
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = (ball.vx / speed) * SPEED;
    ball.vy = (ball.vy / speed) * SPEED;
  }

  layoutSquareBalls(squareCol, squareRow) {
    const margin = BALL_RADIUS * 3;
    const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(this.ballCount))));
    const gridRows = Math.ceil(this.ballCount / cols);
    const offsetX = squareCol * this.cellSize;
    const offsetY = squareRow * this.cellSize;
    const newBalls = [];

    for (let i = 0; i < this.ballCount; i++) {
      const ballCol = i % cols;
      const ballRow = Math.floor(i / cols);
      const ball = this.createBall(i);
      ball.x = offsetX + margin + ballCol * (this.cellSize - 2 * margin) / Math.max(cols - 1, 1);
      ball.y = offsetY + margin + ballRow * (this.cellSize - 2 * margin) / Math.max(gridRows - 1, 1);
      newBalls.push(ball);
    }

    return newBalls;
  }

  relayoutAllSquareBalls() {
    this.balls = [];
    for (let row = 0; row < this.rowCount; row++) {
      for (let col = 0; col < this.squareCount; col++) {
        this.balls.push(...this.layoutSquareBalls(col, row));
      }
    }
  }

  layoutAllSquares() {
    this.relayoutAllSquareBalls();
    this.randomizeBallMotion();
  }

  clampBalls() {
    const totalWidth = this.getTotalWidth();
    const totalHeight = this.getTotalHeight();
    const r = BALL_RADIUS;

    this.balls.forEach((ball) => {
      ball.x = Math.max(r, Math.min(totalWidth - r, ball.x));
      ball.y = Math.max(r, Math.min(totalHeight - r, ball.y));
    });
  }

  updateArenaBorder() {
    this.arena.classList.toggle('arena--max-size', this.areaCm2 >= this.getMaxAreaCm2());
  }

  syncCanvas() {
    this.updateArenaBorder();
    const { bx, by } = this.getBorderSumPx();
    const contentWidth = this.getTotalWidth();
    const contentHeight = this.getTotalHeight();
    this.arena.style.width = `${contentWidth + bx}px`;
    this.arena.style.height = `${contentHeight + by}px`;
    this.width = this.canvas.width = this.arena.clientWidth;
    this.height = this.canvas.height = this.arena.clientHeight;
    this.clampBalls();
    this.updateStats();
    if (this.shouldUseMask()) {
      this.updateMaskHolePosition();
    }
    updateViewportFit();
  }

  setCellSize(size) {
    const maxArea = this.getMaxAreaCm2();
    const clampedPx = Math.max(MIN_ARENA_SIZE, Math.min(this.getMaxCellSize(), size));
    const rawArea = (clampedPx / MIN_ARENA_SIZE) ** 2 * MIN_AREA_CM2;
    const snappedArea = Math.max(MIN_AREA_CM2, Math.min(maxArea, Math.round(rawArea)));
    this.areaCm2 = snappedArea;
    this.cellSize = MIN_ARENA_SIZE * Math.sqrt(snappedArea / MIN_AREA_CM2);
    this.syncCanvas();
  }

  duplicateHorizontally() {
    if (!this.canDuplicateHorizontally()) return;

    const oldCellSize = this.cellSize;
    const oldSquareCount = this.squareCount;
    const snapshots = this.balls.map((ball) => ({
      localX: ball.x,
      localY: ball.y,
      data: this.cloneBall(ball),
    }));

    this.squareCount *= 2;
    this.setCellSize(this.cellSize);

    const scale = oldCellSize ? this.cellSize / oldCellSize : 1;
    this.balls.forEach((ball) => {
      ball.x *= scale;
      ball.y *= scale;
    });

    const offsetX = oldSquareCount * this.cellSize;
    const newBalls = [];
    snapshots.forEach(({ localX, localY, data }) => {
      newBalls.push({
        ...data,
        x: localX * scale + offsetX,
        y: localY * scale,
      });
    });
    this.balls.push(...newBalls);
    this.randomizeBallMotion(newBalls, oldSquareCount * this.rowCount);

    this.clampBalls();
    this.updateStats();
  }

  duplicateVertically() {
    if (!this.canDuplicateVertically()) return;

    const oldCellSize = this.cellSize;
    const oldRowCount = this.rowCount;
    const snapshots = this.balls.map((ball) => ({
      localX: ball.x,
      localY: ball.y,
      data: this.cloneBall(ball),
    }));

    this.rowCount *= 2;
    this.setCellSize(this.cellSize);

    const scale = oldCellSize ? this.cellSize / oldCellSize : 1;
    this.balls.forEach((ball) => {
      ball.x *= scale;
      ball.y *= scale;
    });

    const offsetY = oldRowCount * this.cellSize;
    const newBalls = [];
    snapshots.forEach(({ localX, localY, data }) => {
      newBalls.push({
        ...data,
        x: localX * scale,
        y: localY * scale + offsetY,
      });
    });
    this.balls.push(...newBalls);
    this.randomizeBallMotion(newBalls, this.squareCount * oldRowCount);

    this.clampBalls();
    this.updateStats();
  }

  removeHalfOfBalls() {
    this.balls = this.balls.slice(0, Math.floor(this.balls.length / 2));
  }

  shrinkHorizontally() {
    if (!this.canShrinkHorizontally()) return;

    const oldCellSize = this.cellSize;
    this.removeHalfOfBalls();

    this.squareCount /= 2;
    this.setCellSize(this.cellSize);

    const scale = oldCellSize ? this.cellSize / oldCellSize : 1;
    if (scale !== 1) {
      this.balls.forEach((ball) => {
        ball.x *= scale;
        ball.y *= scale;
      });
    }

    this.clampBalls();
    this.updateStats();
  }

  shrinkVertically() {
    if (!this.canShrinkVertically()) return;

    const oldCellSize = this.cellSize;
    this.removeHalfOfBalls();

    this.rowCount /= 2;
    this.setCellSize(this.cellSize);

    const scale = oldCellSize ? this.cellSize / oldCellSize : 1;
    if (scale !== 1) {
      this.balls.forEach((ball) => {
        ball.x *= scale;
        ball.y *= scale;
      });
    }

    this.clampBalls();
    this.updateStats();
  }

  resizeDelta(edge, dx, dy) {
    if (edge === 'e') return dx;
    if (edge === 'w') return -dx;
    if (edge === 's') return dy;
    if (edge === 'n') return -dy;
    return 0;
  }

  dismissResizeHint() {
    this.arenaComposite.classList.remove('show-resize-hint');
    this.resizeHint.classList.add('is-hidden');
    if (this.resizeHintTimeout) {
      clearTimeout(this.resizeHintTimeout);
      this.resizeHintTimeout = null;
    }
  }

  showResizeHint() {
    this.arenaComposite.classList.add('show-resize-hint');
    this.resizeHint.classList.remove('is-hidden');
    if (this.resizeHintTimeout) {
      clearTimeout(this.resizeHintTimeout);
    }
    this.resizeHintTimeout = window.setTimeout(() => this.dismissResizeHint(), 7000);
  }

  startResize(e, handle) {
    this.dismissResizeHint();
    e.preventDefault();
    try {
      handle.setPointerCapture(e.pointerId);
    } catch (_) {}
    this.dragState = {
      edge: handle.dataset.edge,
      startX: e.clientX,
      startY: e.clientY,
      startSize: this.cellSize,
      handle,
      pointerId: e.pointerId,
    };
    handle.classList.add('active');
  }

  moveResize(e) {
    if (!this.dragState) return;
    if (e.pointerId !== this.dragState.pointerId) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) {
      this.stopResize(e);
      return;
    }
    const delta = this.resizeDelta(
      this.dragState.edge,
      e.clientX - this.dragState.startX,
      e.clientY - this.dragState.startY
    );
    this.setCellSize(this.dragState.startSize + delta);
  }

  stopResize(e) {
    if (!this.dragState) return;
    if (e?.pointerId != null) {
      try {
        if (this.dragState.handle.hasPointerCapture(e.pointerId)) {
          this.dragState.handle.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }
    this.dragState.handle.classList.remove('active');
    this.dragState = null;
  }

  drawBall(ball, ctx = this.ctx) {
    const { x, y, radius, colors } = ball;
    const gradient = ctx.createRadialGradient(
      x - radius * 0.35, y - radius * 0.35, radius * 0.1,
      x, y, radius
    );
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawSquareDividers(ctx = this.ctx) {
    const totalWidth = this.getTotalWidth();
    const totalHeight = this.getTotalHeight();
    if (this.squareCount <= 1 && this.rowCount <= 1) return;

    ctx.strokeStyle = 'rgba(88, 166, 255, 0.35)';
    ctx.lineWidth = 2;

    for (let i = 1; i < this.squareCount; i++) {
      const x = i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    for (let i = 1; i < this.rowCount; i++) {
      const y = i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(totalWidth, y);
      ctx.stroke();
    }
  }

  drawScene(ctx = this.ctx) {
    this.drawSquareDividers(ctx);
    this.drawBalls(ctx);
  }

  drawBalls(ctx = this.ctx) {
    this.balls.forEach((ball) => this.drawBall(ball, ctx));
  }

  drawMaskHoleBorder() {
    const holeSide = this.getMaskHoleSidePx();
    const { maskHoleX: x, maskHoleY: y } = this;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.strokeRect(x + 0.5, y + 0.5, holeSide - 1, holeSide - 1);
    this.ctx.restore();
  }

  drawWithMask() {
    this.ensureOffscreenCanvas();
    this.offscreenCtx.clearRect(0, 0, this.width, this.height);
    this.drawScene(this.offscreenCtx);

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.filter = `blur(${MASK_BLUR_PX}px)`;
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.ctx.restore();

    const holeSide = this.getMaskHoleSidePx();
    const { maskHoleX: x, maskHoleY: y } = this;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, holeSide, holeSide);
    this.ctx.clip();
    this.drawBalls(this.ctx);
    this.ctx.restore();
    this.drawMaskHoleBorder();
  }

  updateWalls(ball) {
    ball.x += ball.vx;
    ball.y += ball.vy;

    const r = ball.radius;
    const totalWidth = this.getTotalWidth();
    const totalHeight = this.getTotalHeight();

    if (ball.x - r < 0) {
      ball.x = r;
      ball.vx = -ball.vx;
    } else if (ball.x + r > totalWidth) {
      ball.x = totalWidth - r;
      ball.vx = -ball.vx;
    }

    if (ball.y - r < 0) {
      ball.y = r;
      ball.vy = -ball.vy;
    } else if (ball.y + r > totalHeight) {
      ball.y = totalHeight - r;
      ball.vy = -ball.vy;
    }
  }

  resolveCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;

        if (dist === 0) {
          dx = 1;
          dy = 0;
          dist = 1;
        }

        if (dist >= minDist) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const velAlongNormal = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;

        if (velAlongNormal > 0) {
          a.vx -= velAlongNormal * nx;
          a.vy -= velAlongNormal * ny;
          b.vx += velAlongNormal * nx;
          b.vy += velAlongNormal * ny;
        }

        const overlap = minDist - dist;
        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;
      }
    }
  }

  update() {
    this.balls.forEach((ball) => this.updateWalls(ball));
    for (let pass = 0; pass < 3; pass++) {
      this.resolveCollisions();
    }
    this.balls.forEach((ball) => this.normalizeSpeed(ball));
  }

  draw() {
    if (this.shouldUseMask()) {
      this.drawWithMask();
      return;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawScene();
  }

  findNearestBall(x, y) {
    if (this.balls.length === 0) return null;
    return this.balls.reduce((nearest, ball) => {
      const dist = Math.hypot(ball.x - x, ball.y - y);
      return dist < nearest.dist ? { ball, dist } : nearest;
    }, { ball: this.balls[0], dist: Infinity }).ball;
  }

  adjustBallsForCountChange(oldCount) {
    const expectedOldTotal = this.squareCount * this.rowCount * oldCount;
    if (this.balls.length !== expectedOldTotal) {
      this.relayoutAllSquareBalls();
      return;
    }

    const totalSquares = this.squareCount * this.rowCount;
    const updated = [];

    for (let sq = 0; sq < totalSquares; sq++) {
      const col = sq % this.squareCount;
      const row = Math.floor(sq / this.squareCount);
      const squareStart = sq * oldCount;
      const existing = this.balls.slice(squareStart, squareStart + oldCount);

      if (this.ballCount > oldCount) {
        updated.push(...existing);
        updated.push(...this.layoutSquareBalls(col, row).slice(oldCount));
      } else {
        updated.push(...existing.slice(0, this.ballCount));
      }
    }

    this.balls = updated;
  }

  updateBallCountScrubDisplay() {
    const total = this.getTotalBallCount();
    this.ballCountValue.textContent = String(total);
    this.ballCountScrub.setAttribute('aria-valuenow', String(total));
    this.ballCountScrub.setAttribute('aria-valuemin', String(this.getMinTotalBallCount()));
    this.ballCountScrub.setAttribute('aria-valuemax', String(this.getMaxTotalBallCount()));
  }

  setBallCount(count) {
    const nextCount = Math.max(1, Math.min(MAX_BALLS, Math.floor(count)));
    if (nextCount === this.ballCount) {
      this.updateBallCountScrubDisplay();
      return;
    }

    const oldCount = this.ballCount;
    this.ballCount = nextCount;
    this.adjustBallsForCountChange(oldCount);
    this.randomizeBallMotion();
    this.clampBalls();
    this.updateStats();
  }

  setTotalBallCount(targetTotal) {
    const numSquares = this.getSquareCount();
    const currentTotal = this.getTotalBallCount();
    const clamped = Math.max(
      numSquares,
      Math.min(this.getMaxTotalBallCount(), Math.floor(targetTotal))
    );
    if (currentTotal === clamped) return;

    let perSquare = clamped > currentTotal
      ? Math.ceil(clamped / numSquares)
      : Math.floor(clamped / numSquares);
    perSquare = Math.max(1, Math.min(MAX_BALLS, perSquare));

    if (perSquare === this.ballCount) {
      if (clamped > currentTotal && this.ballCount < MAX_BALLS) {
        this.setBallCount(this.ballCount + 1);
      } else if (clamped < currentTotal && this.ballCount > 1) {
        this.setBallCount(this.ballCount - 1);
      }
      return;
    }

    this.setBallCount(perSquare);
  }

  applyTotalBallCountValue(nextTotal) {
    const clamped = Math.max(
      this.getMinTotalBallCount(),
      Math.min(this.getMaxTotalBallCount(), Math.floor(nextTotal))
    );
    if (clamped !== this.getTotalBallCount()) {
      this.setTotalBallCount(clamped);
      return;
    }
    this.updateBallCountScrubDisplay();
  }

  updateAreaScrubDisplay() {
    const total = this.getTotalAreaCm2();
    this.areaScrubValue.textContent = total ? `${total} cm²` : '—';
    if (!total) return;
    this.areaScrub.setAttribute('aria-valuenow', String(total));
    this.areaScrub.setAttribute('aria-valuemin', String(this.getMinTotalAreaCm2()));
    this.areaScrub.setAttribute('aria-valuemax', String(this.getMaxTotalAreaCm2()));
  }

  setAreaCm2(area) {
    const maxArea = this.getMaxAreaCm2();
    const nextArea = Math.max(MIN_AREA_CM2, Math.min(maxArea, Math.round(area)));
    if (nextArea === this.areaCm2) {
      this.updateAreaScrubDisplay();
      return;
    }

    const oldCellSize = this.cellSize;
    const px = MIN_ARENA_SIZE * Math.sqrt(nextArea / MIN_AREA_CM2);
    this.setCellSize(px);

    const scale = oldCellSize ? this.cellSize / oldCellSize : 1;
    if (scale !== 1) {
      this.balls.forEach((ball) => {
        ball.x *= scale;
        ball.y *= scale;
      });
      this.clampBalls();
      this.updateStats();
    }
  }

  setTotalAreaCm2(targetTotal) {
    const numSquares = this.getSquareCount();
    const currentTotal = this.getTotalAreaCm2();
    const maxPerCell = this.getMaxAreaCm2();
    const clamped = Math.max(
      this.getMinTotalAreaCm2(),
      Math.min(this.getMaxTotalAreaCm2(), Math.floor(targetTotal))
    );
    if (currentTotal === clamped) return;

    let perCell = clamped > currentTotal
      ? Math.ceil(clamped / numSquares)
      : Math.floor(clamped / numSquares);
    perCell = Math.max(MIN_AREA_CM2, Math.min(maxPerCell, perCell));

    if (perCell === this.areaCm2) {
      if (clamped > currentTotal && this.areaCm2 < maxPerCell) {
        this.setAreaCm2(this.areaCm2 + 1);
      } else if (clamped < currentTotal && this.areaCm2 > MIN_AREA_CM2) {
        this.setAreaCm2(this.areaCm2 - 1);
      }
      return;
    }

    this.setAreaCm2(perCell);
  }

  applyTotalAreaCm2Value(nextTotal) {
    const clamped = Math.max(
      this.getMinTotalAreaCm2(),
      Math.min(this.getMaxTotalAreaCm2(), Math.floor(nextTotal))
    );
    if (clamped !== this.getTotalAreaCm2()) {
      this.setTotalAreaCm2(clamped);
      return;
    }
    this.updateAreaScrubDisplay();
  }

  bindAreaScrub() {
    bindChannelScrubDrag(
      this.areaScrub,
      () => this.getTotalAreaCm2(),
      (value) => this.applyTotalAreaCm2Value(value)
    );

    const bindScrubArrow = (el, delta) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setTotalAreaCm2(this.getTotalAreaCm2() + delta);
      });
    };

    bindScrubArrow(this.areaScrub.querySelector('.channel-scrub-arrow-dec'), -1);
    bindScrubArrow(this.areaScrub.querySelector('.channel-scrub-arrow-inc'), 1);

    this.areaScrub.addEventListener('keydown', (e) => {
      let next = this.getTotalAreaCm2();
      const maxTotal = this.getMaxTotalAreaCm2();
      const minTotal = this.getMinTotalAreaCm2();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(maxTotal, next + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(minTotal, next - 1);
      else if (e.key === 'PageUp') next = Math.min(maxTotal, next + 10);
      else if (e.key === 'PageDown') next = Math.max(minTotal, next - 10);
      else if (e.key === 'Home') next = minTotal;
      else if (e.key === 'End') next = maxTotal;
      else return;
      e.preventDefault();
      this.applyTotalAreaCm2Value(next);
    });

    this.areaScrub.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dir = e.deltaY > 0 ? -step : step;
        this.applyTotalAreaCm2Value(this.getTotalAreaCm2() + dir);
      },
      { passive: false }
    );
  }

  bindBallCountScrub() {
    bindChannelScrubDrag(
      this.ballCountScrub,
      () => this.getTotalBallCount(),
      (value) => this.applyTotalBallCountValue(value)
    );

    const bindScrubArrow = (el, delta) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
      });
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setTotalBallCount(this.getTotalBallCount() + delta);
      });
    };

    bindScrubArrow(this.ballCountScrub.querySelector('.channel-scrub-arrow-dec'), -1);
    bindScrubArrow(this.ballCountScrub.querySelector('.channel-scrub-arrow-inc'), 1);

    this.ballCountScrub.addEventListener('keydown', (e) => {
      let next = this.getTotalBallCount();
      const maxTotal = this.getMaxTotalBallCount();
      const minTotal = this.getMinTotalBallCount();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(maxTotal, next + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(minTotal, next - 1);
      else if (e.key === 'PageUp') next = Math.min(maxTotal, next + 10);
      else if (e.key === 'PageDown') next = Math.max(minTotal, next - 10);
      else if (e.key === 'Home') next = minTotal;
      else if (e.key === 'End') next = maxTotal;
      else return;
      e.preventDefault();
      this.applyTotalBallCountValue(next);
    });

    this.ballCountScrub.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dir = e.deltaY > 0 ? -step : step;
        this.applyTotalBallCountValue(this.getTotalBallCount() + dir);
      },
      { passive: false }
    );
  }

  resetToInitial() {
    this.squareCount = 1;
    this.rowCount = 1;
    this.ballCount = DEFAULT_BALL_COUNT;
    this.cellSize = MIN_ARENA_SIZE * Math.sqrt(DEFAULT_AREA_CM2 / MIN_AREA_CM2);
    this.setCellSize(this.cellSize);
    this.layoutAllSquares();
    this.updateStats();
    this.showResizeHint();
  }

  bindEvents() {
    this.arenaComposite.querySelectorAll('.resize-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => this.startResize(e, handle));
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const ball = this.findNearestBall(clickX, clickY);
      if (!ball) return;

      const dx = clickX - ball.x;
      const dy = clickY - ball.y;
      const dist = Math.hypot(dx, dy) || 1;
      ball.vx = (dx / dist) * SPEED;
      ball.vy = (dy / dist) * SPEED;
    });

    this.shrinkArenaBtnRight.addEventListener('click', () => this.shrinkHorizontally());
    this.addArenaBtnRight.addEventListener('click', () => this.duplicateHorizontally());
    this.shrinkArenaBtnBottom.addEventListener('click', () => this.shrinkVertically());
    this.addArenaBtnBottom.addEventListener('click', () => this.duplicateVertically());

    this.bindBallCountScrub();
    this.bindAreaScrub();
  }
}

function initFields() {
  document.querySelectorAll('.field-unit').forEach((root) => {
    fields.push(new Field(root));
  });
}

function updateFieldModeButtons() {
  fieldModeOneBtn.setAttribute('aria-pressed', activeFieldCount === 1 ? 'true' : 'false');
  fieldModeTwoBtn.setAttribute('aria-pressed', activeFieldCount === 2 ? 'true' : 'false');
}

function mountSoloStatsPanel() {
  const field = fields[0];
  if (!field?.statsPanel) return;

  field.statsPanel.classList.add('stats-panel--fixed');
  if (field.statsPanel.parentElement !== document.body) {
    document.body.insertBefore(field.statsPanel, appShell);
  }
}

function unmountSoloStatsPanel() {
  const field = fields[0];
  if (!field?.statsPanel) return;

  field.statsPanel.classList.remove('stats-panel--fixed');
  if (field.statsPanel.parentElement !== field.root) {
    field.root.insertBefore(field.statsPanel, field.root.firstChild);
  }
}

function updateMaskButton() {
  if (!maskBtn) return;
  maskBtn.setAttribute('aria-pressed', maskEnabled ? 'true' : 'false');
  maskBtn.title = maskEnabled
    ? 'Vypnout masku — zobrazit celou plochu'
    : 'Zapnout masku — rozmaže plochu kromě okna 1 cm²';
}

function updatePauseButton() {
  if (!pauseBtn) return;
  pauseBtn.setAttribute('aria-pressed', pauseEnabled ? 'true' : 'false');
  pauseBtn.title = pauseEnabled
    ? 'Spustit pohyb míčků'
    : 'Zastavit pohyb míčků';
}

function setPauseEnabled(enabled) {
  pauseEnabled = enabled;
  updatePauseButton();
}

function setMaskEnabled(enabled) {
  maskEnabled = enabled;
  updateMaskButton();
  if (maskEnabled) {
    getVisibleFields().forEach((field) => field.updateMaskHolePosition());
  }
}

function setActiveFieldCount(count) {
  activeFieldCount = count;
  document.body.classList.toggle('fields-mode--one', count === 1);
  document.body.classList.toggle('fields-mode--two', count === 2);

  if (count === 1) {
    mountSoloStatsPanel();
  } else {
    unmountSoloStatsPanel();
  }

  fields.forEach((field, index) => {
    field.root.classList.toggle('is-hidden', index >= count);
    if (index >= count && field.dragState) {
      field.stopResize();
    }
  });
  fields.forEach((field) => field.setCellSize(field.cellSize));
  fields.forEach((field) => field.updateStats());
  updateFieldModeButtons();
  updateViewportFit();
}

function resetAllFields() {
  setActiveFieldCount(activeFieldCount);
  fields.forEach((field) => field.resetToInitial());
}

function loop() {
  getVisibleFields().forEach((field) => {
    if (!pauseEnabled) {
      field.update();
    }
    field.draw();
  });
  requestAnimationFrame(loop);
}

initFields();
setActiveFieldCount(DEFAULT_FIELD_COUNT);
updateMaskButton();
updatePauseButton();

fields.forEach((field) => {
  field.setCellSize(field.cellSize);
  field.layoutAllSquares();
  field.updateStats();
  field.showResizeHint();
});

resetBtn.addEventListener('click', resetAllFields);

fieldModeOneBtn.addEventListener('click', () => {
  if (activeFieldCount !== 1) setActiveFieldCount(1);
});

fieldModeTwoBtn.addEventListener('click', () => {
  if (activeFieldCount !== 2) {
    setActiveFieldCount(2);
    fields.forEach((field) => field.resetToInitial());
  }
});

maskBtn?.addEventListener('click', () => {
  setMaskEnabled(!maskEnabled);
});

pauseBtn?.addEventListener('click', () => {
  setPauseEnabled(!pauseEnabled);
});

helpBtn.addEventListener('click', () => {
  helpDialog.showModal();
});

helpCloseBtn.addEventListener('click', () => {
  helpDialog.close();
});

helpDialog.addEventListener('click', (e) => {
  const rect = helpDialog.getBoundingClientRect();
  const clickedBackdrop =
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom;
  if (clickedBackdrop) {
    helpDialog.close();
  }
});

window.addEventListener('resize', () => {
  fields.forEach((field) => field.setCellSize(field.cellSize));
});

window.addEventListener('pointermove', (e) => {
  fields.forEach((field) => field.moveResize(e));
});

window.addEventListener('pointerup', (e) => {
  fields.forEach((field) => field.stopResize(e));
});

window.addEventListener('pointercancel', (e) => {
  fields.forEach((field) => field.stopResize(e));
});

document.addEventListener('mouseup', () => {
  fields.forEach((field) => field.stopResize());
});

window.addEventListener('blur', () => {
  fields.forEach((field) => field.stopResize());
  if (activeScrubDragStop) {
    activeScrubDragStop();
  }
});

appShell.addEventListener('touchmove', (e) => {
  if (e.cancelable) {
    e.preventDefault();
  }
}, { passive: false });

loop();
