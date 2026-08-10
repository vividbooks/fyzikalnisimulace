const BALL_R = 33;
const BALL_CENTER = 33;
const VELOCITY = 160;
const MODRA_START_X = 80;
const MODRA_JET_DELAY = 2;
const JET_NOZZLE_RIGHT = 156;
const JET_HEIGHT = 72;

const ZELENA_GRAVITY = 1100;
const ZELENA_RESTITUTION = 0.74;
const ZELENA_START = { x: 40, y: 40, vx: 260, vy: 90 };
const ZLUTA_BELT_THICKNESS = 20;
const ZLUTA_ARC_HEIGHT = 96;
const ZLUTA_BELT_STRIPE_SPACING = 28;
const SEDA_SPEED = 145;

const stageMetrics = {
  width: window.innerWidth,
  height: window.innerHeight,
  get groundY() {
    return this.height / 2;
  },
  get floorY() {
    return this.groundY;
  },
  get loopLength() {
    return this.width + 2 * BALL_R;
  },
  get startX() {
    return -BALL_R;
  },
  get loopDuration() {
    return this.loopLength / VELOCITY;
  },
  get modraLoopLength() {
    return this.width + BALL_R - MODRA_START_X;
  },
  get modraMoveDuration() {
    return this.modraLoopLength / VELOCITY;
  },
  get modraLoopDuration() {
    return MODRA_JET_DELAY + this.modraMoveDuration;
  },
};

const BALLS = {
  cervena: {
    id: "cervena",
    label: "červená",
    asset: "assets/cervena.svg",
    motion: rovnomernyPrimocaryPohyb,
    velocity: rovnomernyPrimocaryPohybRychlost,
    motionAnswer: { path: "přímočarý", speed: "rovnoměrný" },
  },
  modra: {
    id: "modra",
    label: "modrá",
    asset: "assets/modra.svg",
    motion: zrychleniZpomaleni,
    velocity: zrychleniZpomaleniRychlost,
    startX: () => MODRA_START_X,
    jetActive: modraTryskovyMotorAktivni,
    jetIntensity: modraTryskovyMotorIntenzita,
    motionAnswer: { path: "přímočarý", speed: "nerovnoměrný" },
  },
  zelena: {
    id: "zelena",
    label: "zelená",
    asset: "assets/zelena.svg",
    usesBouncePhysics: true,
    motionAnswer: { path: "křivočarý", speed: "nerovnoměrný" },
  },
  zluta: {
    id: "zluta",
    label: "žlutá",
    asset: "assets/zluta.svg",
    motion2D: zlutaPasPohyb,
    noRoll: true,
    usesBelt: true,
    motionAnswer: { path: "křivočarý", speed: "rovnoměrný" },
  },
  seda: {
    id: "seda",
    label: "šedá",
    asset: "assets/seda.svg",
    motion2D: sedaPohyb,
    noRoll: true,
    usesRandomMotion: true,
    get motionAnswer() {
      return sedaMode
        ? { path: sedaMode.path, speed: sedaMode.speed }
        : { path: "", speed: "" };
    },
  },
};

function getBallStartX(ball) {
  return ball.startX ? ball.startX() : stageMetrics.startX;
}

function rovnomernyPrimocaryPohyb(elapsed) {
  const progress = (elapsed * VELOCITY) % stageMetrics.loopLength;
  return stageMetrics.startX + progress;
}

function rovnomernyPrimocaryPohybRychlost() {
  return VELOCITY;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function easeInOutCubicDerivative(t) {
  if (t < 0.5) return 12 * t * t;
  const u = -2 * t + 2;
  return 3 * u * u;
}

function modraCasVCyklu(elapsed) {
  return elapsed % stageMetrics.modraLoopDuration;
}

function modraFazePohybu(elapsed) {
  const timeInLoop = modraCasVCyklu(elapsed);
  if (timeInLoop < MODRA_JET_DELAY) return null;
  return (timeInLoop - MODRA_JET_DELAY) / stageMetrics.modraMoveDuration;
}

function zrychleniZpomaleni(elapsed) {
  const phase = modraFazePohybu(elapsed);
  if (phase === null) return MODRA_START_X;
  return MODRA_START_X + easeInOutCubic(phase) * stageMetrics.modraLoopLength;
}

function zrychleniZpomaleniRychlost(elapsed) {
  const phase = modraFazePohybu(elapsed);
  if (phase === null) return 0;
  return (easeInOutCubicDerivative(phase) * stageMetrics.modraLoopLength) /
    stageMetrics.modraMoveDuration;
}

function modraTryskovyMotorAktivni(elapsed) {
  const phase = modraFazePohybu(elapsed);
  return phase !== null && phase < 0.5;
}

function modraTryskovyMotorIntenzita(elapsed) {
  const phase = modraFazePohybu(elapsed);
  if (phase === null || phase >= 0.5) return 0;
  return easeInOutCubicDerivative(phase) / 3;
}

function zlutaPasMetrics() {
  const width = stageMetrics.width;
  const base = stageMetrics.floorY + BALL_R;
  const cx = width / 2;
  const sag = ZLUTA_ARC_HEIGHT;
  const radius = (width * width + 4 * sag * sag) / (8 * sag);
  const centerY = base + radius - sag;

  return { width, base, cx, radius, centerY };
}

function zlutaPasSurfaceY(x) {
  const { width, base, cx, radius, centerY } = zlutaPasMetrics();

  if (x <= 0 || x >= width) {
    return base;
  }

  const dx = x - cx;
  const arc = radius * radius - dx * dx;

  if (arc <= 0) {
    return base;
  }

  return centerY - Math.sqrt(arc);
}

function zlutaPasCenterY(x) {
  return zlutaPasSurfaceY(x) - BALL_R;
}

function zlutaPasPohyb(elapsed) {
  const progress = (elapsed * VELOCITY) % stageMetrics.loopLength;
  const x = stageMetrics.startX + progress;

  return {
    x,
    y: zlutaPasCenterY(x),
    speed: VELOCITY,
  };
}

function buildBeltArcPath(steps = 80) {
  const { width } = zlutaPasMetrics();
  let path = `M 0 ${zlutaPasSurfaceY(0)}`;

  for (let i = 1; i <= steps; i += 1) {
    const x = (i / steps) * width;
    path += ` L ${x} ${zlutaPasSurfaceY(x)}`;
  }

  return path;
}

function buildBeltPathD() {
  const { width, base } = zlutaPasMetrics();
  const bottom = base + ZLUTA_BELT_THICKNESS;

  return `${buildBeltArcPath()} L ${width} ${bottom} L 0 ${bottom} Z`;
}

function buildBeltTopEdgeD() {
  return buildBeltArcPath();
}

function zlutaBeltArcLengthToX(targetX) {
  const { width } = zlutaPasMetrics();
  const endX = Math.max(0, Math.min(targetX, width));
  const steps = 80;
  let length = 0;
  let prevX = 0;
  let prevY = zlutaPasSurfaceY(0);

  for (let i = 1; i <= steps; i += 1) {
    const x = (endX / steps) * i;
    const y = zlutaPasSurfaceY(x);
    length += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }

  return length;
}

let sedaMode = null;

function randomSedaMode() {
  const straight = Math.random() < 0.5;
  const uniform = Math.random() < 0.5;

  return {
    path: straight ? "přímočarý" : "křivočarý",
    speed: uniform ? "rovnoměrný" : "nerovnoměrný",
    key: `${straight ? "s" : "c"}_${uniform ? "u" : "n"}`,
  };
}

function resetSedaMode() {
  sedaMode = randomSedaMode();
}

function sedaVisibleBounds() {
  const width = stageMetrics.width;
  const overlay = document.querySelector(".ui-overlay");
  const overlayBottom = overlay
    ? overlay.getBoundingClientRect().bottom
    : 120;
  const quizTop = quizWrap
    ? quizWrap.getBoundingClientRect().top
    : stageMetrics.floorY + BALL_R + 20;
  const margin = BALL_R + 12;

  return {
    left: margin,
    right: width - margin,
    top: overlayBottom + 12,
    bottom: quizTop - 12,
  };
}

function sedaCurvedUniformMetrics() {
  const bounds = sedaVisibleBounds();
  const cx = (bounds.left + bounds.right) / 2;
  const cy = (bounds.top + bounds.bottom) / 2;
  const radius = Math.min(
    (bounds.right - bounds.left) / 2,
    (bounds.bottom - bounds.top) / 2,
  );

  return { cx, cy, radius: Math.max(radius, 0) };
}

function sedaPohyb(elapsed) {
  if (!sedaMode) resetSedaMode();

  const width = stageMetrics.width;
  const height = stageMetrics.height;
  const floor = stageMetrics.groundY;

  switch (sedaMode.key) {
    case "s_u": {
      const x0 = -BALL_R;
      const y0 = height * 0.74;
      const x1 = width + BALL_R;
      const y1 = height * 0.26;
      const length = Math.hypot(x1 - x0, y1 - y0);
      const traveled = (elapsed * SEDA_SPEED) % length;

      return {
        x: x0 + ((x1 - x0) / length) * traveled,
        y: y0 + ((y1 - y0) / length) * traveled,
        speed: SEDA_SPEED,
      };
    }
    case "s_n": {
      const duration = 2.6;
      const phase = (elapsed % duration) / duration;
      const eased = easeInOutCubic(phase);
      const xLeft = -BALL_R;
      const xRight = width + BALL_R;
      const y = height * 0.42;
      const x = xLeft + eased * (xRight - xLeft);
      const speed = Math.abs(
        (xRight - xLeft) * easeInOutCubicDerivative(phase) / duration,
      );

      return { x, y, speed };
    }
    case "c_u": {
      const { cx, cy, radius } = sedaCurvedUniformMetrics();
      const theta = radius > 0 ? (elapsed * SEDA_SPEED) / radius : 0;
      const x = cx + radius * Math.cos(theta);
      const y = cy + radius * Math.sin(theta);

      return { x, y, speed: SEDA_SPEED };
    }
    default: {
      const duration = 4.2;
      const phase = (elapsed % duration) / duration;
      const eased = easeInOutCubic(phase);
      const x = -BALL_R + eased * (width + 2 * BALL_R);
      const amplitude = 72;
      const waves = 2.4;
      const y = floor - 36 + amplitude * Math.sin(waves * Math.PI * eased);
      const easedDerivative = easeInOutCubicDerivative(phase) / duration;
      const dx = (width + 2 * BALL_R) * easedDerivative;
      const dy = amplitude * waves * Math.PI *
        Math.cos(waves * Math.PI * eased) * easedDerivative;

      return { x, y, speed: Math.hypot(dx, dy) };
    }
  }
}

function zlutaBeltOffsetAtBall(ballX) {
  const { width } = zlutaPasMetrics();
  const loopLength = stageMetrics.loopLength;
  const traveled =
    ((ballX - stageMetrics.startX) % loopLength + loopLength) % loopLength;

  if (ballX <= 0) {
    return traveled;
  }

  if (ballX >= width) {
    return zlutaBeltArcLengthToX(width) + (ballX - width);
  }

  return zlutaBeltArcLengthToX(ballX);
}

let zelenaState = null;

function createZelenaState() {
  return {
    x: ZELENA_START.x,
    y: ZELENA_START.y,
    vx: ZELENA_START.vx,
    vy: ZELENA_START.vy,
    prevX: ZELENA_START.x,
  };
}

function resetZelenaState() {
  zelenaState = createZelenaState();
}

function stepZelenaPhysics(dt) {
  if (!zelenaState) resetZelenaState();

  const state = zelenaState;
  state.prevX = state.x;

  state.vy += ZELENA_GRAVITY * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  if (state.y > stageMetrics.floorY) {
    state.y = stageMetrics.floorY;
    state.vy = -Math.abs(state.vy) * ZELENA_RESTITUTION;
    if (Math.abs(state.vy) < 55) {
      state.vy = 0;
    }
  }

  if (state.x > stageMetrics.width + BALL_R) {
    resetZelenaState();
  }

  return state;
}

const stage = document.getElementById("stage");
const picker = document.getElementById("ball-picker");
let animationSvg;
let floorLine;
let beltGroup;
let beltShape;
let beltTopEdge;
let positionLayer;
let rollLayer;
let jetLayer;

let activeBallId = "cervena";
let startTime = performance.now();
let lastFrame = performance.now();
let rotation = 0;
let rafId = null;

function updateStageSize() {
  stageMetrics.width = window.innerWidth;
  stageMetrics.height = window.innerHeight;

  if (animationSvg) {
    animationSvg.setAttribute(
      "viewBox",
      `0 0 ${stageMetrics.width} ${stageMetrics.height}`,
    );
  }

  if (floorLine) {
    floorLine.setAttribute("y1", stageMetrics.floorY + BALL_R);
    floorLine.setAttribute("y2", stageMetrics.floorY + BALL_R);
    floorLine.setAttribute("x2", stageMetrics.width);
  }

  updateBeltGraphics(stageMetrics.startX);
  updateQuizPosition();
}

function updateTrackVisibility() {
  const ball = BALLS[activeBallId];
  const usesBelt = ball.usesBelt;
  const hideFloor = ball.usesRandomMotion;

  if (floorLine) {
    floorLine.setAttribute(
      "visibility",
      usesBelt || hideFloor ? "hidden" : "visible",
    );
  }

  if (beltGroup) {
    beltGroup.setAttribute("visibility", usesBelt ? "visible" : "hidden");
  }

  updateQuizPosition();
}

function updateQuizPosition() {
  if (!quizWrap) return;

  const usesBelt = BALLS[activeBallId].usesBelt;
  const trackBottom = stageMetrics.floorY + BALL_R +
    (usesBelt ? ZLUTA_BELT_THICKNESS : 0) + 20;

  quizWrap.style.top = `${trackBottom}px`;
}

function updateBeltGraphics(ballX) {
  if (!beltShape) return;

  beltShape.setAttribute("d", buildBeltPathD());

  const beltOffset = zlutaBeltOffsetAtBall(ballX);

  if (beltTopEdge) {
    beltTopEdge.setAttribute("d", buildBeltTopEdgeD());
    beltTopEdge.setAttribute("stroke-dashoffset", String(-beltOffset));
  }
}

function updateBeltAnimation(ballX) {
  updateBeltGraphics(ballX);
}

function createStageSvg() {
  animationSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  animationSvg.setAttribute("viewBox", `0 0 ${stageMetrics.width} ${stageMetrics.height}`);
  animationSvg.setAttribute("width", "100%");
  animationSvg.setAttribute("height", "100%");
  animationSvg.setAttribute("aria-label", "Animace pohybu kuličky");
  animationSvg.id = "animation-svg";

  floorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  floorLine.id = "floor-line";
  floorLine.setAttribute("x1", "0");
  floorLine.setAttribute("x2", String(stageMetrics.width));
  floorLine.setAttribute("y1", String(stageMetrics.floorY + BALL_R));
  floorLine.setAttribute("y2", String(stageMetrics.floorY + BALL_R));
  floorLine.setAttribute("stroke", "#E5E7EB");
  floorLine.setAttribute("stroke-width", "2");

  beltGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  beltGroup.id = "belt-group";
  beltGroup.setAttribute("visibility", "hidden");

  beltShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  beltShape.setAttribute("fill", "#F3F4F6");
  beltShape.setAttribute("stroke", "#D1D5DB");
  beltShape.setAttribute("stroke-width", "2");

  beltTopEdge = document.createElementNS("http://www.w3.org/2000/svg", "path");
  beltTopEdge.setAttribute("fill", "none");
  beltTopEdge.setAttribute("stroke", "#C4C9D1");
  beltTopEdge.setAttribute("stroke-width", "3");
  beltTopEdge.setAttribute("stroke-dasharray", "12 16");
  beltTopEdge.setAttribute("stroke-linecap", "round");

  beltGroup.append(beltShape, beltTopEdge);
  animationSvg.append(floorLine, beltGroup);
  updateBeltGraphics(0);

  positionLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  positionLayer.id = "ball-position";
  positionLayer.setAttribute(
    "transform",
    `translate(${stageMetrics.startX} ${stageMetrics.groundY})`,
  );

  jetLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  jetLayer.id = "jet-motor";
  jetLayer.setAttribute("visibility", "hidden");

  rollLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  rollLayer.id = "ball-roll";

  positionLayer.append(jetLayer, rollLayer);
  animationSvg.appendChild(positionLayer);
  stage.appendChild(animationSvg);

  window.addEventListener("resize", updateStageSize);
}

function resetAnimation() {
  const now = performance.now();
  startTime = now;
  lastFrame = now;
  rotation = 0;

  const ball = BALLS[activeBallId];
  if (ball.usesBouncePhysics) {
    resetZelenaState();
    positionLayer.setAttribute(
      "transform",
      `translate(${zelenaState.x} ${zelenaState.y})`,
    );
  } else if (ball.motion2D) {
    const pos = ball.motion2D(0);
    positionLayer.setAttribute(
      "transform",
      `translate(${pos.x} ${pos.y})`,
    );
  } else {
    positionLayer.setAttribute(
      "transform",
      `translate(${getBallStartX(ball)} ${stageMetrics.groundY})`,
    );
  }

  rollLayer.setAttribute("transform", "rotate(0)");
  updateJetMotor(ball, 0);
  updateTrackVisibility();
}

async function loadSvgAsset(url) {
  const response = await fetch(url);
  const svgText = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.documentElement;
}

function nestBallSvg(source) {
  const nested = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  nested.setAttribute("width", "66");
  nested.setAttribute("height", "66");
  nested.setAttribute("viewBox", "0 0 66 66");
  nested.setAttribute("fill", "none");
  nested.setAttribute("x", String(-BALL_CENTER));
  nested.setAttribute("y", String(-BALL_CENTER));
  nested.setAttribute("overflow", "visible");

  for (const child of source.children) {
    nested.appendChild(document.importNode(child, true));
  }

  return nested;
}

async function loadBallGraphic(ballId) {
  const ball = BALLS[ballId];
  const source = await loadSvgAsset(ball.asset);

  rollLayer.replaceChildren();
  rollLayer.appendChild(nestBallSvg(source));
}

async function loadJetMotor() {
  const source = await loadSvgAsset("assets/tryskovy-motor.svg");
  const nested = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  nested.setAttribute("width", "160");
  nested.setAttribute("height", String(JET_HEIGHT));
  nested.setAttribute("viewBox", "0 0 160 72");
  nested.setAttribute("fill", "none");
  nested.setAttribute("x", String(-BALL_R - JET_NOZZLE_RIGHT));
  nested.setAttribute("y", String(-JET_HEIGHT / 2));
  nested.setAttribute("overflow", "visible");

  for (const child of source.children) {
    nested.appendChild(document.importNode(child, true));
  }

  jetLayer.replaceChildren();
  jetLayer.appendChild(nested);
}

function updateJetMotor(ball, elapsed) {
  const active = Boolean(ball.jetActive?.(elapsed));
  jetLayer.classList.toggle("is-active", active);
  jetLayer.setAttribute("visibility", active ? "visible" : "hidden");
  jetLayer.setAttribute("transform", `translate(${-BALL_R} 0)`);
}

const verifyBtn = document.getElementById("verify-btn");
const quizWrap = document.getElementById("quiz-wrap");
let pathTypeSelect;
let speedTypeSelect;
const quizSelects = [];

function initQuizSelect(root) {
  const button = root.querySelector(".quiz-select-btn");
  const valueEl = root.querySelector(".quiz-select-value");
  const menu = root.querySelector(".quiz-select-menu");
  const options = [...menu.querySelectorAll(".quiz-select-option")];
  let value = "";
  let onChange = () => {};

  button.setAttribute("aria-label", root.dataset.label || "");

  function closeMenu() {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    quizSelects.forEach((select) => {
      if (select !== control) select.closeMenu();
    });
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
  }

  function renderValue() {
    valueEl.textContent = value;
    valueEl.classList.toggle("is-empty", !value);
    options.forEach((option) => {
      const selected = option.dataset.value === value;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  const control = {
    get value() {
      return value;
    },
    set value(nextValue) {
      value = nextValue;
      renderValue();
    },
    get classList() {
      return button.classList;
    },
    closeMenu,
    onChange(callback) {
      onChange = callback;
    },
  };

  button.addEventListener("click", () => {
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  options.forEach((option) => {
    option.addEventListener("click", () => {
      value = option.dataset.value;
      renderValue();
      closeMenu();
      onChange();
    });
  });

  renderValue();
  quizSelects.push(control);
  return control;
}

function clearQuizFeedback() {
  pathTypeSelect.classList.remove("is-correct", "is-wrong");
  speedTypeSelect.classList.remove("is-correct", "is-wrong");
}

function resetQuizSelects() {
  pathTypeSelect.value = "";
  speedTypeSelect.value = "";
  clearQuizFeedback();
}

function markSelect(select, isCorrect) {
  select.classList.remove("is-correct", "is-wrong");
  select.classList.add(isCorrect ? "is-correct" : "is-wrong");
}

const CONFETTI_COLORS = [
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#86efac",
  "#15803d",
  "#bbf7d0",
];

let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiRafId = null;

function ensureConfettiCanvas() {
  if (confettiCanvas) return;

  confettiCanvas = document.createElement("canvas");
  confettiCanvas.id = "confetti-canvas";
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCtx = confettiCanvas.getContext("2d");
  document.body.appendChild(confettiCanvas);

  window.addEventListener("resize", () => {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  });
}

function createConfettiParticle(originX, originY) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 220 + Math.random() * 420;
  const size = 6 + Math.random() * 8;

  return {
    x: originX,
    y: originY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 120,
    width: size,
    height: size * (0.45 + Math.random() * 0.55),
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 14,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    opacity: 1,
    gravity: 680 + Math.random() * 220,
    drag: 0.985 + Math.random() * 0.01,
  };
}

function launchGreenConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  ensureConfettiCanvas();

  const rect = quizWrap.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const burstCount = 120;

  for (let i = 0; i < burstCount; i += 1) {
    confettiParticles.push(createConfettiParticle(originX, originY));
  }

  if (!confettiRafId) {
    confettiRafId = requestAnimationFrame(tickConfetti);
  }
}

function tickConfetti(now) {
  if (!confettiCtx || !confettiCanvas) return;

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  const dt = 1 / 60;
  confettiParticles = confettiParticles.filter((particle) => {
    particle.vx *= particle.drag;
    particle.vy = particle.vy * particle.drag + particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rotation += particle.spin * dt;
    particle.opacity -= 0.008;

    if (particle.opacity <= 0) return false;

    confettiCtx.save();
    confettiCtx.globalAlpha = particle.opacity;
    confettiCtx.translate(particle.x, particle.y);
    confettiCtx.rotate(particle.rotation);
    confettiCtx.fillStyle = particle.color;
    confettiCtx.fillRect(
      -particle.width / 2,
      -particle.height / 2,
      particle.width,
      particle.height,
    );
    confettiCtx.restore();

    return true;
  });

  if (confettiParticles.length > 0) {
    confettiRafId = requestAnimationFrame(tickConfetti);
  } else {
    confettiRafId = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function verifyMotionAnswer() {
  const ball = BALLS[activeBallId];
  clearQuizFeedback();

  let pathCorrect = false;
  let speedCorrect = false;

  if (pathTypeSelect.value) {
    pathCorrect = pathTypeSelect.value === ball.motionAnswer.path;
    markSelect(pathTypeSelect, pathCorrect);
  }

  if (speedTypeSelect.value) {
    speedCorrect = speedTypeSelect.value === ball.motionAnswer.speed;
    markSelect(speedTypeSelect, speedCorrect);
  }

  if (
    pathTypeSelect.value &&
    speedTypeSelect.value &&
    pathCorrect &&
    speedCorrect
  ) {
    launchGreenConfetti();
  }
}

function buildQuiz() {
  pathTypeSelect = initQuizSelect(document.getElementById("path-type"));
  speedTypeSelect = initQuizSelect(document.getElementById("speed-type"));

  verifyBtn.addEventListener("click", verifyMotionAnswer);
  pathTypeSelect.onChange(clearQuizFeedback);
  speedTypeSelect.onChange(clearQuizFeedback);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".quiz-select")) {
      quizSelects.forEach((select) => select.closeMenu());
    }
  });
}

let sedaChangeBtn = null;

function updateSedaChangeBtn() {
  if (!sedaChangeBtn) return;
  sedaChangeBtn.classList.toggle("is-visible", activeBallId === "seda");
}

function buildPicker() {
  for (const ball of Object.values(BALLS)) {
    const label = document.createElement("label");
    label.className = "ball-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "ball";
    input.value = ball.id;
    input.checked = ball.id === activeBallId;

    const preview = document.createElement("img");
    preview.src = ball.asset;
    preview.alt = "";
    preview.width = 40;
    preview.height = 40;

    const text = document.createElement("span");
    text.textContent = ball.label;

    label.append(input, preview, text);

    if (ball.id === "seda") {
      const group = document.createElement("div");
      group.className = "ball-option-group";

      sedaChangeBtn = document.createElement("button");
      sedaChangeBtn.type = "button";
      sedaChangeBtn.className = "seda-change-btn";
      sedaChangeBtn.setAttribute("aria-label", "Změnit pohyb");
      sedaChangeBtn.innerHTML = `<svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true"><path d="M13.5 7C13.5 5.46488 12.9567 3.97929 11.9663 2.8064C10.9758 1.63351 9.60225 0.849005 8.08881 0.591856C6.57538 0.334707 5.01977 0.62151 3.69754 1.40146C2.37531 2.18141 1.37181 3.40417 0.864775 4.85314C0.357744 6.30212 0.379914 7.88379 0.92736 9.31798C1.47481 10.7522 2.51219 11.9463 3.85576 12.6889C5.19933 13.4315 6.76237 13.6746 8.268 13.3751C9.77363 13.0756 11.1247 12.2529 12.0818 11.0528M15.5 5.5L13.5 7L11 5.5" stroke="black" stroke-linecap="round"/></svg>`;
      sedaChangeBtn.addEventListener("click", () => {
        resetSedaMode();
        resetAnimation();
        resetQuizSelects();
      });

      group.append(label, sedaChangeBtn);
      picker.appendChild(group);
    } else {
      picker.appendChild(label);
    }

    input.addEventListener("change", async () => {
      if (!input.checked || ball.id === activeBallId) return;
      activeBallId = ball.id;
      if (ball.usesRandomMotion) {
        resetSedaMode();
      }
      await loadBallGraphic(activeBallId);
      resetAnimation();
      resetQuizSelects();
      updateSedaChangeBtn();
    });
  }

  updateSedaChangeBtn();
}

function tick(now) {
  const ball = BALLS[activeBallId];
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  const elapsed = (now - startTime) / 1000;
  let x;
  let y;
  let rollSpeed;

  if (ball.usesBouncePhysics) {
    const state = stepZelenaPhysics(dt);
    x = state.x;
    y = state.y;
    const dx = state.x - state.prevX;
    rollSpeed = Math.abs(dx) / Math.max(dt, 0.001);
  } else if (ball.motion2D) {
    const pos = ball.motion2D(elapsed);
    x = pos.x;
    y = pos.y;
    rollSpeed = pos.speed;
  } else {
    x = ball.motion(elapsed);
    y = stageMetrics.groundY;
    rollSpeed = ball.velocity(elapsed);
  }

  if (!ball.noRoll) {
    rotation += (rollSpeed * dt / BALL_R) * (180 / Math.PI);
  }

  positionLayer.setAttribute("transform", `translate(${x} ${y})`);
  rollLayer.setAttribute(
    "transform",
    ball.noRoll ? "" : `rotate(${rotation})`,
  );
  updateJetMotor(ball, elapsed);

  if (ball.usesBelt) {
    updateBeltAnimation(x);
  }

  rafId = requestAnimationFrame(tick);
}

async function init() {
  createStageSvg();
  buildPicker();
  buildQuiz();
  resetQuizSelects();
  updateTrackVisibility();
  updateQuizPosition();
  await Promise.all([loadBallGraphic(activeBallId), loadJetMotor()]);
  rafId = requestAnimationFrame(tick);
}

init();
