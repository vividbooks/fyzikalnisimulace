const svg = document.querySelector(".scene__svg");
const tubeGroups = document.querySelectorAll(".js-tube");
const diskGroups = document.querySelectorAll(".js-disk");
const hit = document.querySelector(".tube-hit");
const openingGroup = document.querySelector(".js-opening");
const depthReadout = document.querySelector(".js-depth-readout");
const depthMarker = document.querySelector(".js-depth-marker");

const ballLayers = document.querySelectorAll(".js-balls");
const addBallBtn = document.querySelector(".ball-btn--add");
const removeBallBtn = document.querySelector(".ball-btn--remove");

const MIN_Y = -420;
const MAX_Y = 640;
const WATER_OFFSET = 0;
const DISK_FLOOR_OFFSET = 800;
const GRAVITY = 2600;
const ATTACH_EPS = 4;
const MAX_BALLS = 5;
const BALL_WEIGHT_N = 1;
const TUBE_AREA_WIDE = 0.01;
const TUBE_AREA_NARROW = 0.0049;
const LIQUIDS = {
  water: 1000,
  gasoline: 700,
  glycerol: 1300,
};
const GRAVITY_N_PER_KG = 10;
const MAX_DEPTH_M = 0.05;
const BALL_POSITIONS_WIDE = [
  [756.615, 998.533],
  [929.615, 998.533],
  [842.615, 879.533],
  [745.615, 777.533],
  [947.615, 779.533],
];
const BALL_STACK = 148.138;
const BALL_COLUMN_X = 847.076;
const BALL_SCATTER_WIDE = [
  [-210, 60],
  [220, 70],
  [35, 240],
  [-280, 200],
  [290, 210],
];
const BALL_SCATTER_NARROW = [
  [-90, 50],
  [100, 60],
  [-120, 90],
  [110, 120],
  [-80, 140],
];
const BALL_CX = 74.0688;
const BALL_CY = 74.0653;
const BALL_RADIUS = 70.54;
const BALL_GROUND_WIDE = 998.533;
const BALL_GROUND_NARROW = 1008.12;
const BALL_MIN_X_WIDE = 560;
const BALL_MAX_X_WIDE = 1130;
const BALL_MIN_X_NARROW = 740;
const BALL_MAX_X_NARROW = 960;
const BALL_GRAVITY = 2400;
const HIT_WIDE = { x: 680, y: 460, width: 500, height: 780 };
const HIT_NARROW = { x: 790, y: 460, width: 260, height: 780 };

let tubeOffset = 0;
let diskOffset = 0;
let attached = true;
let ballCount = 0;
let drag = null;
let velocity = 0;
let falling = false;
let lastTime = 0;
let raf = 0;
let ballStates = [];
let ballScattered = false;
let packing = false;
let frozenDepthOffset = 0;
let narrowTube = false;
let diskSize = "wide";
let liquid = "water";

function liquidDensity() {
  return LIQUIDS[liquid];
}

function ballPositions() {
  if (!narrowTube) return BALL_POSITIONS_WIDE;
  const ground = ballGroundY();
  return [0, 1, 2, 3, 4].map((i) => [BALL_COLUMN_X, ground - BALL_STACK * i]);
}

function ballScatter() {
  return narrowTube ? BALL_SCATTER_NARROW : BALL_SCATTER_WIDE;
}

function ballGroundY() {
  return diskSize === "narrow" ? BALL_GROUND_NARROW : BALL_GROUND_WIDE;
}

function tubeAreaM2() {
  return narrowTube ? TUBE_AREA_NARROW : TUBE_AREA_WIDE;
}

function ballMinX() {
  return narrowTube ? BALL_MIN_X_NARROW : BALL_MIN_X_WIDE;
}

function ballMaxX() {
  return narrowTube ? BALL_MAX_X_NARROW : BALL_MAX_X_WIDE;
}

function applyHitRect() {
  const box = narrowTube ? HIT_NARROW : HIT_WIDE;
  hit.setAttribute("x", String(box.x));
  hit.setAttribute("y", String(box.y));
  hit.setAttribute("width", String(box.width));
  hit.setAttribute("height", String(box.height));
}

function applyOpeningMask() {
  openingGroup.setAttribute(
    "mask",
    narrowTube ? "url(#mask-opening-narrow)" : "url(#mask1_2698_133)"
  );
}

function setSvgGroupVisible(group, visible) {
  group.setAttribute("display", visible ? "inline" : "none");
}

function applyVariantVisibility() {
  svg.querySelectorAll(".tube-wide").forEach((group) => {
    setSvgGroupVisible(group, !narrowTube);
  });
  svg.querySelectorAll(".tube-narrow").forEach((group) => {
    setSvgGroupVisible(group, narrowTube);
  });
  svg.querySelectorAll(".disk-wide").forEach((group) => {
    setSvgGroupVisible(group, diskSize === "wide");
  });
  svg.querySelectorAll(".disk-narrow").forEach((group) => {
    setSvgGroupVisible(group, diskSize === "narrow");
  });
  svg.querySelectorAll(".disk-giant").forEach((group) => {
    setSvgGroupVisible(group, diskSize === "giant");
  });
}

function svgY(event) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return event.clientY;
  return (event.clientY - ctm.f) / ctm.d;
}

function setGroupOffset(groups, y) {
  const transform = `translate(0 ${y})`;
  groups.forEach((group) => {
    group.setAttribute("transform", transform);
  });
}

function applyTubeOffset(y) {
  tubeOffset = Math.min(MAX_Y, Math.max(MIN_Y, y));
  setGroupOffset(tubeGroups, tubeOffset);
}

function formatDepthCm(cm) {
  const rounded = Math.round(cm * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return `${text} cm`;
}

function displayedDepthOffset() {
  return attached ? diskOffset : frozenDepthOffset;
}

function displayedDepthM() {
  const offset = displayedDepthOffset();
  if (offset <= WATER_OFFSET) return 0;
  return MAX_DEPTH_M * Math.min(1, (offset - WATER_OFFSET) / (MAX_Y - WATER_OFFSET));
}

function updateDepthReadout() {
  if (!depthReadout) return;
  depthReadout.textContent = formatDepthCm(displayedDepthM() * 100);
}

function updateDepthMarker() {
  if (depthMarker) {
    depthMarker.classList.toggle("is-frozen", !attached);
    depthMarker.setAttribute(
      "transform",
      `translate(0 ${Math.max(WATER_OFFSET, displayedDepthOffset())})`
    );
  }
  updateDepthReadout();
}

function applyDiskOffset(y) {
  diskOffset = Math.min(DISK_FLOOR_OFFSET, Math.max(MIN_Y, y));
  setGroupOffset(diskGroups, diskOffset);
  if (attached) {
    frozenDepthOffset = diskOffset;
  }
  updateDepthMarker();
}

function diskDepthM() {
  if (diskOffset <= WATER_OFFSET) return 0;
  return MAX_DEPTH_M * Math.min(1, (diskOffset - WATER_OFFSET) / (MAX_Y - WATER_OFFSET));
}

function hydrostaticForceN() {
  return liquidDensity() * GRAVITY_N_PER_KG * diskDepthM() * tubeAreaM2();
}

function totalWeightN() {
  return ballCount * BALL_WEIGHT_N;
}

function isHeldByHydrostatic() {
  if (!attached) return false;
  if (diskOffset <= WATER_OFFSET) return false;
  return hydrostaticForceN() + 1e-9 >= totalWeightN();
}

function canAttach() {
  if (diskOffset <= tubeOffset + ATTACH_EPS) return true;
  return (
    tubeOffset >= MAX_Y - ATTACH_EPS &&
    diskOffset >= DISK_FLOOR_OFFSET - ATTACH_EPS
  );
}

function syncBallStates() {
  while (ballStates.length < ballCount) {
    const i = ballStates.length;
    const [x, y] = ballPositions()[i];
    ballStates.push({ x, y, vx: 0, vy: 0, angle: 0 });
  }
  while (ballStates.length > ballCount) {
    ballStates.pop();
  }
}

function applyScatterImpulses() {
  ballStates.forEach((ball, i) => {
    const [sx, sy] = ballScatter()[i] || [0, 0];
    ball.vx += sx;
    ball.vy += sy;
  });
}

function packBalls() {
  packing = true;
  ballScattered = false;
  ballStates.forEach((ball) => {
    ball.vx = 0;
    ball.vy = 0;
  });
  updateBallButtons();
  ensureTick();
}

function ballsNeedTick() {
  if (packing) return true;
  return ballStates.some(
    (ball) => Math.hypot(ball.vx, ball.vy) > 12 || Math.abs(ball.angle) > 0.04
  );
}

function ensureTick() {
  if (raf) return;
  lastTime = performance.now();
  raf = requestAnimationFrame(tick);
}

function stopFall() {
  falling = false;
  velocity = 0;
}

function startFall() {
  if (isHeldByHydrostatic()) {
    stopFall();
    packBalls();
    return;
  }

  if (attached) {
    frozenDepthOffset = diskOffset;
  }
  attached = false;
  packing = false;
  updateDepthMarker();

  if (!ballScattered) {
    applyScatterImpulses();
    ballScattered = true;
    updateBallButtons();
  }

  if (diskOffset >= DISK_FLOOR_OFFSET) {
    applyDiskOffset(DISK_FLOOR_OFFSET);
    stopFall();
    ensureTick();
    return;
  }

  if (!falling) {
    falling = true;
    velocity = 0;
  }
  ensureTick();
}

function separateBalls() {
  for (let i = 0; i < ballStates.length; i += 1) {
    for (let j = i + 1; j < ballStates.length; j += 1) {
      const a = ballStates[i];
      const b = ballStates[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minDist = BALL_RADIUS * 2;
      if (dist >= minDist) continue;

      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x += nx * overlap;
      a.y += ny * overlap;
      b.x -= nx * overlap;
      b.y -= ny * overlap;

      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel > 0) continue;
      a.vx -= rel * nx;
      a.vy -= rel * ny;
      b.vx += rel * nx;
      b.vy += rel * ny;
    }
  }
}

function tickBallPhysics(dt) {
  syncBallStates();

  if (attached) {
    let done = true;
    ballStates.forEach((ball, i) => {
      const [tx, ty] = ballPositions()[i];
      ball.x += (tx - ball.x) * Math.min(1, 14 * dt);
      ball.y += (ty - ball.y) * Math.min(1, 14 * dt);
      ball.angle *= Math.max(0, 1 - 10 * dt);
      ball.vx = 0;
      ball.vy = 0;
      if (Math.hypot(ball.x - tx, ball.y - ty) > 1.5) done = false;
    });
    if (done) {
      packing = false;
      ballStates.forEach((ball, i) => {
        const [tx, ty] = ballPositions()[i];
        ball.x = tx;
        ball.y = ty;
        ball.angle = 0;
      });
    }
    renderBalls();
    return;
  }

  ballStates.forEach((ball) => {
    ball.vy += BALL_GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x < ballMinX()) {
      ball.x = ballMinX();
      ball.vx = Math.abs(ball.vx) * 0.3;
    } else if (ball.x > ballMaxX()) {
      ball.x = ballMaxX();
      ball.vx = -Math.abs(ball.vx) * 0.3;
    }

    if (ball.y > ballGroundY()) {
      ball.y = ballGroundY();
      if (ball.vy > 0) ball.vy *= -0.28;
      if (Math.abs(ball.vy) < 50) ball.vy = 0;
      ball.vx *= Math.exp(-2.8 * dt);
      if (Math.abs(ball.vx) < 12) ball.vx = 0;
    }

    ball.angle += (ball.vx / BALL_RADIUS) * dt;
  });

  separateBalls();
  ballStates.forEach((ball) => {
    if (ball.y > ballGroundY()) ball.y = ballGroundY();
  });
  renderBalls();
}

function tick(now) {
  const dt = Math.min(0.032, (now - lastTime) / 1000);
  lastTime = now;

  if (falling) {
    velocity += GRAVITY * dt;
    applyDiskOffset(diskOffset + velocity * dt);
    if (diskOffset >= DISK_FLOOR_OFFSET) {
      applyDiskOffset(DISK_FLOOR_OFFSET);
      stopFall();
    }
  }

  tickBallPhysics(dt);

  if (falling || ballsNeedTick()) {
    raf = requestAnimationFrame(tick);
    return;
  }

  raf = 0;
}

function onPointerDown(event) {
  event.preventDefault();
  stopFall();
  attached = canAttach();
  if (attached) {
    applyDiskOffset(tubeOffset);
    packBalls();
  }

  hit.setPointerCapture(event.pointerId);
  drag = {
    pointerId: event.pointerId,
    startSvgY: svgY(event),
    startOffset: tubeOffset,
  };
  svg.classList.add("is-dragging");
  if (!attached) startFall();
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;

  applyTubeOffset(drag.startOffset + (svgY(event) - drag.startSvgY));

  if (!attached && canAttach()) {
    attached = true;
    stopFall();
    packBalls();
    updateDepthMarker();
  }

  if (!attached) return;

  if (tubeOffset >= diskOffset) {
    applyDiskOffset(tubeOffset);
    return;
  }

  if (isHeldByHydrostatic()) {
    applyDiskOffset(tubeOffset);
    return;
  }

  startFall();
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag = null;
  svg.classList.remove("is-dragging");
  startFall();
}

hit.addEventListener("pointerdown", onPointerDown);
hit.addEventListener("pointermove", onPointerMove);
hit.addEventListener("pointerup", onPointerUp);
hit.addEventListener("pointercancel", onPointerUp);

function renderBalls() {
  syncBallStates();
  ballLayers.forEach((layer) => {
    layer.replaceChildren();
    for (let i = 0; i < ballCount; i += 1) {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "use");
      node.setAttribute("href", layer.classList.contains("js-balls--water") ? "#ball-underwater" : "#ball");
      const ball = ballStates[i];
      const deg = (ball.angle * 180) / Math.PI;
      node.setAttribute(
        "transform",
        `translate(${ball.x} ${ball.y}) rotate(${deg} ${BALL_CX} ${BALL_CY})`
      );
      layer.append(node);
    }
  });

  updateBallButtons();
}

function updateBallButtons() {
  const locked = ballScattered;
  const addDisabled = locked || ballCount >= MAX_BALLS;
  const removeDisabled = locked || ballCount <= 0;
  addBallBtn.classList.toggle("is-disabled", addDisabled);
  addBallBtn.disabled = addDisabled;
  removeBallBtn.classList.toggle("is-disabled", removeDisabled);
  removeBallBtn.disabled = removeDisabled;
}

function addBall() {
  if (ballScattered || ballCount >= MAX_BALLS) return;
  ballCount += 1;
  syncBallStates();
  renderBalls();
  startFall();
}

function removeBall() {
  if (ballScattered || ballCount <= 0) return;
  ballCount -= 1;
  syncBallStates();
  renderBalls();
  startFall();
}

function resetScene() {
  drag = null;
  svg.classList.remove("is-dragging");
  falling = false;
  packing = false;
  ballScattered = false;
  velocity = 0;
  attached = true;
  frozenDepthOffset = 0;
  ballCount = 0;
  ballStates = [];
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  applyTubeOffset(0);
  applyDiskOffset(0);
  renderBalls();
}

addBallBtn.addEventListener("click", (event) => {
  event.preventDefault();
  addBall();
});

removeBallBtn.addEventListener("click", (event) => {
  event.preventDefault();
  removeBall();
});

document.getElementById("resetBtn").addEventListener("click", (event) => {
  event.preventDefault();
  resetScene();
});

function setNarrowTube(next) {
  if (narrowTube === next) return;
  narrowTube = next;
  diskSize = next ? "narrow" : "wide";
  applySetup();
}

function setDiskSize(next) {
  const nextTube = next === "narrow" ? true : narrowTube;
  if (diskSize === next && narrowTube === nextTube) return;
  diskSize = next;
  narrowTube = nextTube;
  applySetup();
}

function applySetup() {
  svg.classList.toggle("is-narrow", narrowTube);
  svg.classList.toggle("is-small-disk", diskSize === "narrow");
  svg.classList.toggle("is-giant-disk", diskSize === "giant");
  svg.dataset.liquid = liquid;
  document.querySelectorAll("[data-tube]").forEach((btn) => {
    const active = btn.dataset.tube === (narrowTube ? "narrow" : "wide");
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-disk]").forEach((btn) => {
    const active = btn.dataset.disk === diskSize;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
    if (btn.dataset.disk === "narrow") btn.disabled = !narrowTube;
  });
  document.querySelectorAll("button[data-liquid]").forEach((btn) => {
    const active = btn.dataset.liquid === liquid;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  updateLiquidReadout();
  applyVariantVisibility();
  applyHitRect();
  applyOpeningMask();
  resetScene();
}

function updateLiquidReadout() {
  const value = document.getElementById("liquidDensityValue");
  if (value) value.textContent = String(LIQUIDS[liquid]);
}

function setLiquid(next) {
  if (liquid === next) return;
  liquid = next;
  svg.dataset.liquid = liquid;
  document.querySelectorAll("button[data-liquid]").forEach((btn) => {
    const active = btn.dataset.liquid === liquid;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  updateLiquidReadout();
  if (attached && diskOffset > WATER_OFFSET) startFall();
}

document.querySelectorAll("[data-tube]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    setNarrowTube(btn.dataset.tube === "narrow");
  });
});

document.querySelectorAll("[data-disk]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    setDiskSize(btn.dataset.disk);
  });
});

document.querySelectorAll("button[data-liquid]").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    setLiquid(btn.dataset.liquid);
  });
});

applySetup();
