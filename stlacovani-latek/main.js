const lottieEl = document.getElementById("lottie");
const pistonHit = document.getElementById("pistonHit");
const hintEl = document.getElementById("hintEl");
const sceneButtons = [...document.querySelectorAll(".subject-btn[data-scene]")];

if (!lottieEl || !pistonHit || !window.lottie) {
  throw new Error("Chybí scéna nebo Lottie knihovna.");
}

const SCENES = {
  solid: {
    asset: "assets/press-solid.json",
    pumpYTop: 847.514,
    pumpYBottom: 1213.514,
    /** Od této části zdvihu je tažení dolů těžší (píst narazí na pevnou látku) */
    contactStart: 0.78,
    resistance: 0.72,
    hint: "Táhni píst dolů nebo nahoru a zkus stlačit pevnou látku.",
    ariaLabel: "Lis s pevnou látkou",
  },
  liquid: {
    asset: "assets/press-liquid.json",
    pumpYTop: 847.514,
    pumpYBottom: 1483.514,
    contactStart: 0.88,
    resistance: 0.35,
    hint: "Táhni píst dolů nebo nahoru a zkus stlačit kapalinu.",
    ariaLabel: "Lis s kapalinou",
  },
  gas: {
    asset: "assets/press-gas.json",
    pumpYTop: 847.514,
    pumpYBottom: 1492,
    contactStart: 0.15,
    resistance: 0.22,
    hint: "Táhni píst dolů nebo nahoru a zkus stlačit plynnou látku.",
    ariaLabel: "Lis s plynnou látkou",
  },
};

/**
 * Morph tvaru „gas layer Outlines“ z původní Lottie (framy 231→315).
 * Spodní hrana zůstává, horní elipsa klesá s pístem.
 */
const GAS_PATH_START = {
  i: [
    [0, 0],
    [139.095, 0],
    [0, 28.06],
    [0, 0],
    [-139.093, 0],
    [0, -28.061],
  ],
  o: [
    [0, 28.06],
    [-139.093, 0],
    [0, 0],
    [0, -28.061],
    [139.095, 0],
    [0, 0],
  ],
  v: [
    [251.852, 67.953],
    [-0.001, 118.761],
    [-251.853, 67.953],
    [-251.861, -210.729],
    [-0.009, -261.537],
    [251.844, -210.729],
  ],
  c: true,
};

const GAS_PATH_END = {
  i: [
    [0, 0],
    [139.095, 0],
    [0, 28.06],
    [0, 0],
    [-139.093, 0],
    [0, -28.061],
  ],
  o: [
    [0, 28.06],
    [-139.093, 0],
    [0, 0],
    [0, -28.061],
    [139.095, 0],
    [0, 0],
  ],
  v: [
    [251.852, 67.953],
    [-0.001, 118.761],
    [-251.853, 67.953],
    [-252.422, -23.76],
    [-0.57, -74.568],
    [251.283, -23.76],
  ],
  c: true,
};

/** Barva plynu: světlá (řídký) → tmavší (stlačený) */
const GAS_COLOR_LIGHT = [0.345, 0.851, 0.463];
const GAS_COLOR_DARK = [0.11, 0.42, 0.22];
/** Počet částic v kolečku: při min. stlačení 1–3, při max. 15 */
const GAS_PARTICLE_COUNT_MIN_LOW = 1;
const GAS_PARTICLE_COUNT_MIN_HIGH = 3;
const GAS_PARTICLE_COUNT_MAX = 15;
/** Konstantní rychlost částic v lokálních jednotkách / frame při 30 fps */
const GAS_PARTICLE_SPEED = 1.15;
const GAS_PARTICLE_FRAME_MS = 1000 / 30;
/** Střed a poloměr pohybu v souřadnicích vrstvy detail 3 Outlines */
const GAS_PARTICLE_CX = 351.23;
const GAS_PARTICLE_CY = 103.5;
const GAS_PARTICLE_RADIUS = 70;
/** Poloměr částice v lokálních souřadnicích (fallback) */
const GAS_PARTICLE_SIZE_FALLBACK = 11;

const KEYBOARD_STEP = 0.04;
const DRAG_SPAN = 0.42;
const CANVAS_SIZE = 2000;
/** Záložní hit zóna oranžové hlavy pístu (když nejde spočítat z SVG) */
const HIT_TOP_START = 0.145;
const HIT_HEIGHT = 0.2;
const HIT_LEFT = 0.28;
const HIT_WIDTH = 0.44;
const HIT_PAD = 10;

const stageEl = document.getElementById("stage");

let sceneId = "solid";
let scene = SCENES.solid;
let anim = null;
let pumpWrapper = null;
let gasPathEl = null;
/** Částice v kolečku — DOM path + pohyb konstantní rychlostí */
let gasParticleEls = [];
let gasParticleMotion = [];
/** Cílový počet částic při minimálním stlačení (1–3) */
let gasSparseTarget = 2;
let gasSparseNextChangeAt = 0;
/** Poslední tick pohybu částic (ms) — rychlost nezávislá na frekvenci drag/enterFrame */
let lastGasParticleTickAt = 0;
/** Progress 0–1 mapovaný na Y pístu */
let progress = 0;
let dragging = false;
let dragPointerId = null;
let lastY = 0;
let stageHeight = 1;
let loading = false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pumpOffsetY(p) {
  return clamp(p, 0, 1) * (scene.pumpYBottom - scene.pumpYTop);
}

/**
 * Dolní část zdvihu je těžší — stejný pohyb myši posune píst méně.
 * Nahoru jde píst vždy stejně lehce. U kapaliny je odpor menší než u pevné.
 */
function dragSensitivity(atProgress, movingDown) {
  if (!movingDown || atProgress < scene.contactStart) return 1;
  const t = (atProgress - scene.contactStart) / (1 - scene.contactStart);
  return 1 - scene.resistance * t;
}

function updateAria() {
  const pct = Math.round(progress * 100);
  pistonHit.setAttribute("aria-valuenow", String(pct));
  pistonHit.setAttribute(
    "aria-valuetext",
    pct < 5 ? "Píst nahoře" : pct > 88 ? "Píst dole na látce" : `Stlačení ${pct} %`
  );
}

function findPumpLayerElement() {
  const elements = anim?.renderer?.elements;
  if (!elements) return null;
  for (const el of elements) {
    if (el?.data?.nm !== "pump top Outlines") continue;
    return el.layerElement || el.baseElement || null;
  }
  return null;
}

/** Obalí vrstvu pístu — Lottie nepřepisuje vnější translate, částice běží dál */
function ensurePumpWrapper() {
  if (pumpWrapper?.isConnected) return pumpWrapper;

  const layerEl = findPumpLayerElement();
  if (!layerEl?.parentNode) return null;

  if (layerEl.parentNode.dataset?.pumpWrap === "1") {
    pumpWrapper = layerEl.parentNode;
    return pumpWrapper;
  }

  const ns = "http://www.w3.org/2000/svg";
  const wrapper = document.createElementNS(ns, "g");
  wrapper.dataset.pumpWrap = "1";
  layerEl.parentNode.insertBefore(wrapper, layerEl);
  wrapper.appendChild(layerEl);
  pumpWrapper = wrapper;
  return pumpWrapper;
}

function findLayerElementByName(name) {
  const elements = anim?.renderer?.elements;
  if (!elements) return null;
  for (const el of elements) {
    if (el?.data?.nm !== name) continue;
    return el.layerElement || el.baseElement || null;
  }
  return null;
}

function findGasLayerElement() {
  return findLayerElementByName("gas layer Outlines");
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpPoint(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

function lerpRgb(from, to, t) {
  return [
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
    lerp(from[2], to[2], t),
  ];
}

function rgbToCss(rgb) {
  const r = Math.round(clamp(rgb[0], 0, 1) * 255);
  const g = Math.round(clamp(rgb[1], 0, 1) * 255);
  const b = Math.round(clamp(rgb[2], 0, 1) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function parseRgbFill(el) {
  const fill = (el.getAttribute("fill") || "").trim().toLowerCase();
  if (!fill || fill === "none") return null;
  const m = fill.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }
  if (fill.startsWith("#") && fill.length >= 7) {
    return {
      r: parseInt(fill.slice(1, 3), 16),
      g: parseInt(fill.slice(3, 5), 16),
      b: parseInt(fill.slice(5, 7), 16),
    };
  }
  return null;
}

/** Zelená výplň plynu / částic (i po ztmavení) */
function isGasGreenFill(el) {
  const rgb = parseRgbFill(el);
  if (!rgb) return false;
  // Pozadí kolečka je téměř černé — vynechat
  if (rgb.r < 50 && rgb.g < 50 && rgb.b < 50) return false;
  return rgb.g > rgb.r && rgb.g > rgb.b && rgb.g > 40;
}

/** Lineární morph Bezier cesty (stejná topologie jako v Lottie) */
function lerpBezierPath(from, to, t) {
  const p = clamp(t, 0, 1);
  return {
    i: from.i.map((pt, idx) => lerpPoint(pt, to.i[idx], p)),
    o: from.o.map((pt, idx) => lerpPoint(pt, to.o[idx], p)),
    v: from.v.map((pt, idx) => lerpPoint(pt, to.v[idx], p)),
    c: from.c,
  };
}

/** Lottie bezier → SVG path `d` (i/o jsou relativní k vrcholům) */
function bezierToPathD(path) {
  const { v, i, o, c } = path;
  if (!v?.length) return "";
  let d = `M${v[0][0]} ${v[0][1]}`;
  for (let idx = 1; idx < v.length; idx += 1) {
    const prev = v[idx - 1];
    const curr = v[idx];
    d += ` C${prev[0] + o[idx - 1][0]} ${prev[1] + o[idx - 1][1]} ${
      curr[0] + i[idx][0]
    } ${curr[1] + i[idx][1]} ${curr[0]} ${curr[1]}`;
  }
  if (c) {
    const last = v[v.length - 1];
    const first = v[0];
    d += ` C${last[0] + o[o.length - 1][0]} ${last[1] + o[o.length - 1][1]} ${
      first[0] + i[0][0]
    } ${first[1] + i[0][1]} ${first[0]} ${first[1]}`;
    d += " Z";
  }
  return d;
}

function ensureGasPathElement() {
  if (sceneId !== "gas") return null;
  if (gasPathEl?.isConnected) return gasPathEl;

  const layerEl = findGasLayerElement();
  if (!layerEl) return null;

  const paths = [...layerEl.querySelectorAll("path")];
  gasPathEl =
    paths.find((path) => {
      const fill = (path.getAttribute("fill") || "").toLowerCase();
      return fill && fill !== "none";
    }) || paths[0] || null;
  return gasPathEl;
}

function findTransformHost(path) {
  let el = path.parentElement;
  while (el) {
    if (el.getAttribute("transform")) return el;
    if (el.dataset?.nm || el === lottieEl) break;
    el = el.parentElement;
  }
  return path.parentElement;
}

function measureGasParticleRadius(path) {
  try {
    const bbox = path.getBBox();
    return Math.max(bbox.width, bbox.height) / 2;
  } catch {
    return GAS_PARTICLE_SIZE_FALLBACK;
  }
}

/** Částice zasahuje do kruhu (alespoň částečně uvnitř) */
function gasParticleTouchesCircle(x, y, particleRadius, cx, cy, circleRadius) {
  const dist = Math.hypot(x - cx, y - cy);
  return dist <= circleRadius + particleRadius;
}

/** Celá částice je za hranou kruhu */
function gasParticleFullyOutsideCircle(x, y, particleRadius, cx, cy, circleRadius) {
  const dist = Math.hypot(x - cx, y - cy);
  return dist > circleRadius + particleRadius;
}

/**
 * Náhodný přílet do kruhu: start vně, směr přes náhodný bod uvnitř.
 * Rychlost zůstává konstantní. Mimo kruh je částice vždy neviditelná.
 */
function respawnGasParticle(p) {
  const cx = GAS_PARTICLE_CX;
  const cy = GAS_PARTICLE_CY;
  const radius = GAS_PARTICLE_RADIUS;
  const speed = GAS_PARTICLE_SPEED;
  const particleRadius = p.radius ?? GAS_PARTICLE_SIZE_FALLBACK;

  const entryAngle = Math.random() * Math.PI * 2;
  const startDist = radius + particleRadius + 10 + Math.random() * 28;
  p.x = cx + Math.cos(entryAngle) * startDist;
  p.y = cy + Math.sin(entryAngle) * startDist;

  const aimAngle = Math.random() * Math.PI * 2;
  const aimDist = Math.random() * radius * 0.75;
  const tx = cx + Math.cos(aimAngle) * aimDist;
  const ty = cy + Math.sin(aimAngle) * aimDist;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const mag = Math.hypot(dx, dy) || 1;
  p.vx = (dx / mag) * speed;
  p.vy = (dy / mag) * speed;
  p.inside = false;
}

function setGasParticleOpacity(p, visible) {
  const opacity = visible ? "1" : "0";
  p.path.setAttribute("opacity", opacity);
  p.path.style.opacity = opacity;
  if (p.host) {
    p.host.setAttribute("opacity", opacity);
    p.host.style.opacity = opacity;
  }
}

function collectGasParticles() {
  gasParticleEls = [];
  gasParticleMotion = [];
  gasSparseTarget = 2;
  gasSparseNextChangeAt = 0;
  lastGasParticleTickAt = 0;
  if (sceneId !== "gas") return;

  const detailEl = findLayerElementByName("detail 3");
  if (!detailEl) return;

  gasParticleEls = [...detailEl.querySelectorAll("path")].filter(isGasGreenFill);

  gasParticleMotion = gasParticleEls.map((path, index) => {
    const host = findTransformHost(path);
    const radius = measureGasParticleRadius(path);
    const p = {
      path,
      host,
      radius,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      inside: false,
      active: false,
      retireOnExit: false,
    };
    respawnGasParticle(p);
    setGasParticleOpacity(p, false);
    if (index < gasSparseTarget) {
      p.active = true;
      const steps = Math.floor(Math.random() * 55);
      for (let i = 0; i < steps; i += 1) {
        p.x += p.vx;
        p.y += p.vy;
      }
      p.inside = gasParticleTouchesCircle(
        p.x,
        p.y,
        p.radius,
        GAS_PARTICLE_CX,
        GAS_PARTICLE_CY,
        GAS_PARTICLE_RADIUS
      );
      setGasParticleOpacity(p, p.inside);
    }
    return p;
  });
}

function gasVisibleCount(t) {
  const now = performance.now();
  if (now >= gasSparseNextChangeAt) {
    gasSparseNextChangeAt = now + 4000 + Math.random() * 3000;
    gasSparseTarget =
      GAS_PARTICLE_COUNT_MIN_LOW +
      Math.floor(
        Math.random() *
          (GAS_PARTICLE_COUNT_MIN_HIGH - GAS_PARTICLE_COUNT_MIN_LOW + 1)
      );
  }
  return Math.round(
    lerp(gasSparseTarget, GAS_PARTICLE_COUNT_MAX, clamp(t, 0, 1))
  );
}

/** Srovná počet aktivních částic s cílem — úbytek až po opuštění kruhu (bez probliknutí) */
function syncGasParticleActivity(targetCount) {
  const activeList = gasParticleMotion.filter((p) => p.active);
  let activeCount = activeList.length;

  if (activeCount < targetCount) {
    for (const p of gasParticleMotion) {
      if (activeCount >= targetCount) break;
      if (p.active) continue;
      p.active = true;
      p.retireOnExit = false;
      respawnGasParticle(p);
      setGasParticleOpacity(p, false);
      activeCount += 1;
    }
  } else if (activeCount > targetCount) {
    let excess = activeCount - targetCount;
    // Nejdřív ty mimo kruh — hned vypnout bez bliknutí
    for (const p of activeList) {
      if (excess <= 0) break;
      if (p.inside || p.retireOnExit) continue;
      p.active = false;
      p.retireOnExit = false;
      setGasParticleOpacity(p, false);
      excess -= 1;
    }
    // Zbytek nechat doletět ven
    for (const p of activeList) {
      if (excess <= 0) break;
      if (!p.active || p.retireOnExit) continue;
      if (p.inside) {
        p.retireOnExit = true;
        excess -= 1;
      }
    }
  }
}

/** Konstantní rychlost podle uplynulého času — ne podle počtu volání při dragu */
function tickGasParticleMotion() {
  if (sceneId !== "gas" || !gasParticleMotion.length) return;

  const now = performance.now();
  if (!lastGasParticleTickAt) {
    lastGasParticleTickAt = now;
    return;
  }
  let dt = (now - lastGasParticleTickAt) / GAS_PARTICLE_FRAME_MS;
  lastGasParticleTickAt = now;
  if (dt <= 0) return;
  dt = Math.min(dt, 2.5);

  const cx = GAS_PARTICLE_CX;
  const cy = GAS_PARTICLE_CY;
  const radius = GAS_PARTICLE_RADIUS;
  const particleColor = rgbToCss(GAS_COLOR_LIGHT);

  for (const p of gasParticleMotion) {
    if (!p.host?.isConnected || !p.path?.isConnected) continue;
    if (!p.active) {
      setGasParticleOpacity(p, false);
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const particleRadius = p.radius ?? GAS_PARTICLE_SIZE_FALLBACK;
    const touchesCircle = gasParticleTouchesCircle(
      p.x,
      p.y,
      particleRadius,
      cx,
      cy,
      radius
    );
    const fullyOutside = gasParticleFullyOutsideCircle(
      p.x,
      p.y,
      particleRadius,
      cx,
      cy,
      radius
    );

    if (p.inside && fullyOutside) {
      if (p.retireOnExit) {
        p.active = false;
        p.retireOnExit = false;
        p.inside = false;
        setGasParticleOpacity(p, false);
      } else {
        respawnGasParticle(p);
        setGasParticleOpacity(p, false);
      }
    } else {
      p.inside = touchesCircle;
      p.path.setAttribute("fill", particleColor);
      setGasParticleOpacity(p, touchesCircle);
    }

    p.host.setAttribute("transform", `translate(${p.x}, ${p.y})`);
  }
}

function gasColorAtProgress(t) {
  return rgbToCss(lerpRgb(GAS_COLOR_LIGHT, GAS_COLOR_DARK, clamp(t, 0, 1)));
}

/**
 * Hustota částic (při min. stlačení 1–3, při max. 15) + ztmavení výplně.
 * Částice jsou vidět jen uvnitř kruhu — bez problikávání.
 */
function applyGasAppearance() {
  if (sceneId !== "gas") return;

  const t = clamp(progress, 0, 1);
  const fillColor = gasColorAtProgress(t);
  const targetCount = gasVisibleCount(t);

  if (!gasParticleMotion.length) {
    collectGasParticles();
  }

  syncGasParticleActivity(targetCount);
  tickGasParticleMotion();

  const pathEl = ensureGasPathElement();
  if (pathEl) {
    pathEl.setAttribute("fill", fillColor);
    pathEl.setAttribute("fill-opacity", String(lerp(0.72, 1, t)));
  }
}

/**
 * Stlačení plynu podle původní Lottie morph (framy 231→315),
 * synchronně s pozicí pístu (progress 0–1).
 */
function applyGasCompression() {
  if (sceneId !== "gas" || !anim) return;

  const morph = lerpBezierPath(GAS_PATH_START, GAS_PATH_END, progress);
  const d = bezierToPathD(morph);

  const layerData = anim.animationData?.layers?.find(
    (layer) => layer.nm === "gas layer Outlines"
  );
  const shape = layerData?.shapes?.[0]?.it?.[0];
  if (shape?.ks) {
    shape.ks = { a: 0, k: morph, ix: 2 };
  }

  const pathEl = ensureGasPathElement();
  if (pathEl) {
    pathEl.setAttribute("d", d);
  }

  const elements = anim.renderer?.elements;
  if (elements) {
    for (const el of elements) {
      if (el?.data?.nm !== "gas layer Outlines") continue;
      if (el.data?.shapes?.[0]?.it?.[0]?.ks) {
        el.data.shapes[0].it[0].ks = { a: 0, k: morph, ix: 2 };
      }
      const cachedPath = el.itemsData?.[0]?.it?.[0];
      if (cachedPath?.ks?.k) {
        cachedPath.ks.k = morph;
        cachedPath.ks.a = 0;
      }
      el.layerElement?.querySelectorAll("path").forEach((path) => {
        const fill = (path.getAttribute("fill") || "").toLowerCase();
        if (fill && fill !== "none") path.setAttribute("d", d);
      });
    }
  }

  applyGasAppearance();
}

function applyPistonPosition() {
  const wrapper = ensurePumpWrapper();
  if (wrapper) {
    const dy = pumpOffsetY(progress);
    wrapper.setAttribute("transform", `translate(0 ${dy})`);
  }
  applyGasCompression();
}

function isOrangeFill(el) {
  const fill = (el.getAttribute("fill") || "").trim().toLowerCase();
  if (!fill || fill === "none") return false;
  const rgb = fill.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    return r > 180 && g > 50 && g < 200 && b < 140;
  }
  if (fill.startsWith("#") && fill.length >= 7) {
    const r = parseInt(fill.slice(1, 3), 16);
    const g = parseInt(fill.slice(3, 5), 16);
    const b = parseInt(fill.slice(5, 7), 16);
    return r > 180 && g > 50 && g < 200 && b < 140;
  }
  return false;
}

function applyHitFallback() {
  const travel = (scene.pumpYBottom - scene.pumpYTop) / CANVAS_SIZE;
  pistonHit.style.left = `${HIT_LEFT * 100}%`;
  pistonHit.style.width = `${HIT_WIDTH * 100}%`;
  pistonHit.style.top = `${(HIT_TOP_START + progress * travel) * 100}%`;
  pistonHit.style.height = `${HIT_HEIGHT * 100}%`;
}

/** Hit zóna sleduje oranžovou hlavu pístu */
function updateHitArea() {
  if (!stageEl) return;

  const layerEl = findPumpLayerElement();
  const stageRect = stageEl.getBoundingClientRect();
  if (!layerEl || stageRect.width < 2 || stageRect.height < 2) {
    applyHitFallback();
    return;
  }

  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  let found = false;

  for (const el of layerEl.querySelectorAll("[fill]")) {
    if (!isOrangeFill(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    found = true;
    minL = Math.min(minL, rect.left);
    minT = Math.min(minT, rect.top);
    maxR = Math.max(maxR, rect.right);
    maxB = Math.max(maxB, rect.bottom);
  }

  if (!found) {
    applyHitFallback();
    return;
  }

  pistonHit.style.left = `${minL - stageRect.left - HIT_PAD}px`;
  pistonHit.style.top = `${minT - stageRect.top - HIT_PAD}px`;
  pistonHit.style.width = `${maxR - minL + HIT_PAD * 2}px`;
  pistonHit.style.height = `${maxB - minT + HIT_PAD * 2}px`;
}

function syncUi() {
  applyPistonPosition();
  updateHitArea();
  updateAria();
}

function setProgress(next) {
  progress = clamp(next, 0, 1);
  syncUi();
}

function destroyAnimation() {
  if (anim) {
    anim.removeEventListener("enterFrame", applyPistonPosition);
    anim.destroy();
    anim = null;
  }
  pumpWrapper = null;
  gasPathEl = null;
  gasParticleEls = [];
  gasParticleMotion = [];
  gasSparseTarget = 2;
  gasSparseNextChangeAt = 0;
  lastGasParticleTickAt = 0;
  lottieEl.innerHTML = "";
}

function updateSceneControls() {
  sceneButtons.forEach((button) => {
    const active = button.dataset.scene === sceneId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (hintEl) hintEl.textContent = scene.hint;
  lottieEl.setAttribute("aria-label", scene.ariaLabel);
}

async function loadScene(nextId) {
  if (!SCENES[nextId] || loading) return;
  if (nextId === sceneId && anim) return;

  loading = true;
  dragging = false;
  dragPointerId = null;
  pistonHit.classList.remove("is-dragging");

  sceneId = nextId;
  scene = SCENES[sceneId];
  progress = 0;
  updateSceneControls();
  destroyAnimation();

  try {
    const response = await fetch(scene.asset);
    if (!response.ok) {
      throw new Error(`Nepodařilo se načíst animaci (${scene.asset}).`);
    }
    const animationData = await response.json();

    anim = window.lottie.loadAnimation({
      container: lottieEl,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid meet",
        progressiveLoad: true,
      },
    });

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Načítání animace vypršelo."));
      }, 8000);
      anim.addEventListener("DOMLoaded", () => {
        window.clearTimeout(timeout);
        resolve();
      });
      anim.addEventListener("data_failed", () => {
        window.clearTimeout(timeout);
        reject(new Error("Lottie data_failed"));
      });
    });

    ensurePumpWrapper();
    ensureGasPathElement();
    collectGasParticles();
    syncUi();
    anim.addEventListener("enterFrame", applyPistonPosition);
  } catch (error) {
    console.error(error);
    destroyAnimation();
    if (hintEl) hintEl.textContent = "Animaci se nepodařilo načíst.";
  } finally {
    loading = false;
  }
}

function onPointerDown(event) {
  if (!anim || loading) return;
  event.preventDefault();
  dragging = true;
  dragPointerId = event.pointerId;
  lastY = event.clientY;
  stageHeight = lottieEl.getBoundingClientRect().height || 1;
  pistonHit.classList.add("is-dragging");
  pistonHit.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!dragging || event.pointerId !== dragPointerId) return;
  event.preventDefault();
  const deltaY = event.clientY - lastY;
  lastY = event.clientY;
  const movingDown = deltaY > 0;
  const sensitivity = dragSensitivity(progress, movingDown);
  const deltaProgress = (deltaY / (stageHeight * DRAG_SPAN)) * sensitivity;
  progress = clamp(progress + deltaProgress, 0, 1);
  syncUi();
}

function onPointerUp(event) {
  if (!dragging || (dragPointerId !== null && event.pointerId !== dragPointerId)) {
    return;
  }
  dragging = false;
  dragPointerId = null;
  pistonHit.classList.remove("is-dragging");
  try {
    pistonHit.releasePointerCapture?.(event.pointerId);
  } catch {
    /* ignore */
  }
}

function onKeyDown(event) {
  if (!anim || loading) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const movingDown = event.key === "ArrowDown";
    const dir = movingDown ? 1 : -1;
    const step = KEYBOARD_STEP * dragSensitivity(progress, movingDown);
    setProgress(progress + dir * step);
  } else if (event.key === "Home") {
    event.preventDefault();
    setProgress(0);
  } else if (event.key === "End") {
    event.preventDefault();
    setProgress(1);
  }
}

pistonHit.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);
pistonHit.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", () => {
  if (anim) updateHitArea();
});

if (stageEl && typeof ResizeObserver !== "undefined") {
  const stageResizeObserver = new ResizeObserver(() => {
    if (anim) updateHitArea();
  });
  stageResizeObserver.observe(stageEl);
}

sceneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const wasQuiz = window.stlacovaniQuiz?.isActive?.();
    window.stlacovaniQuiz?.exit();
    loadScene(button.dataset.scene);
    if (wasQuiz) updateSceneControls();
  });
});

loadScene("solid").catch((error) => {
  console.error(error);
  if (hintEl) hintEl.textContent = "Animaci se nepodařilo načíst.";
});
