const fs = require("fs");
const path = require("path");

const VIEW = { W: 960, H: 510 };
const COLORS = {
  beam: "#E63946",
  pivot: "#5C1F2E",
  pivotNeedle: "#813B50",
  beamCradle: "#D3D3D3",
  rope: "#5C1F2E",
  hole: "#FFFFFF",
  holeOccupied: "#9E1B30",
  weight: "#3d4d5c",
};

const SLOTS = 10;
const BEAM_HALF = 296 * 0.7 * 1.5 * 1.3 * 2 * 1.2;
const BEAM_TH = 75;
const HOLE_R = 9;
const PIVOT = { x: VIEW.W / 2, y: 168 };
const CRADLE_R = 68;
const NEEDLE_USER_TIP_X = 2.40835;
const NEEDLE_USER_TIP_Y = 0.707408;
const NEEDLE_SCALE = 4.7;
const NEEDLE_OFFSET_Y = -8;
const BEAM_LOCK_CX = PIVOT.x;
const BEAM_LOCK_CY = PIVOT.y - BEAM_TH / 2 - 56;
const HOOK_ARM_UNIT = (BEAM_HALF * 0.92) / SLOTS;
const WEIGHT_W = 70;
const WEIGHT_H = 44;
const WEIGHT_CORNER_R = 8;
const ROPE_FROM_HOLE = 42 * 1.2 * 1.2;
const ROPE_BETWEEN = 10;
const STACK_AFTER_WEIGHT = 5;
const ROPE_STROKE_W = 5.25;
const STAND_ASSET = {
  vbW: 48,
  vbH: 107,
  anchor: { x: 23.6105, y: 1.55 },
  scale: 3.04 * 1.5,
};
const PIVOT_STAND_GROUP_TY = PIVOT.y + BEAM_TH / 2 + 0.5;

function holeX(side, i) {
  const d = HOOK_ARM_UNIT * (i + 1);
  return side === "left" ? -d : d;
}

function toWorld(lx, ly, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    x: PIVOT.x + lx * c - ly * s,
    y: PIVOT.y + lx * s + ly * c,
  };
}

function standPaths() {
  return `
<g transform="translate(${PIVOT.x},${PIVOT_STAND_GROUP_TY}) scale(${STAND_ASSET.scale}) translate(${-STAND_ASSET.anchor.x},${-STAND_ASSET.anchor.y})">
<path fill="#E6E6E6" d="M23.6105 106.307C36.6502 106.307 47.221 95.7365 47.221 82.6968C47.221 69.6571 36.6502 59.0863 23.6105 59.0863C10.5708 59.0863 0 69.6571 0 82.6968C0 95.7365 10.5708 106.307 23.6105 106.307Z"/>
<path fill="#B2B2B2" d="M23.6117 100.406C33.3923 100.406 41.3211 92.4773 41.3211 82.6967C41.3211 72.9161 33.3923 64.9873 23.6117 64.9873C13.8311 64.9873 5.90234 72.9161 5.90234 82.6967C5.90234 92.4773 13.8311 100.406 23.6117 100.406Z"/>
<path fill="#813B50" d="M34.8826 92.9576C29.042 98.7982 19.5797 98.7982 13.7451 92.9576C10.341 89.5536 8.78112 84.7105 9.56713 79.9582L22.4879 1.55086C22.8265 -0.516952 25.8073 -0.516952 26.1459 1.55086L39.0666 79.9582C39.8526 84.7105 38.2927 89.5536 34.8887 92.9576H34.8826Z"/>
<path fill="#F03B50" d="M12.9257 80.8344C12.9257 80.8344 12.8712 80.8344 12.8471 80.8284C12.5568 80.786 12.3513 80.5139 12.3996 80.2177L21.7834 17.8993C21.8257 17.6091 22.1038 17.4035 22.394 17.4519C22.6843 17.4942 22.8898 17.7663 22.8415 18.0626L13.4577 80.3809C13.4154 80.647 13.1917 80.8344 12.9257 80.8344V80.8344Z"/>
</g>`;
}

function beamLockPaths() {
  const b = COLORS.pivot;
  return `
<g transform="translate(${BEAM_LOCK_CX},${BEAM_LOCK_CY})">
<path d="M -16 4 L -16 -12 A 16 16 0 0 1 16 -12 L 16 4" fill="none" stroke="${b}" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="-19" y="4" width="38" height="30" rx="6" fill="${b}"/>
<circle cx="0" cy="19" r="3.2" fill="rgba(255,255,255,0.34)"/>
<rect x="-1.2" y="19" width="2.4" height="8" rx="1" fill="rgba(255,255,255,0.34)"/>
</g>`;
}

function beamPaths(theta, left, right) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const beamMat = `matrix(${c}, ${s}, ${-s}, ${c}, ${PIVOT.x}, ${PIVOT.y})`;
  const cyEdge = BEAM_TH / 2;
  const cradleD = `M ${-CRADLE_R} ${cyEdge} A ${CRADLE_R} ${CRADLE_R} 0 0 0 ${CRADLE_R} ${cyEdge} Z`;
  const needleD =
    "M0.703315 0.707408C1.64652 -0.235803 3.17016 -0.235803 4.11337 0.707408C4.66358 1.25761 4.91148 2.03758 4.78451 2.80544L2.70461 15.442C2.6502 15.7746 2.17254 15.7746 2.11208 15.442L0.0321748 2.80544C-0.0947958 2.03758 0.159155 1.25761 0.703315 0.707408Z";

  let holes = "";
  for (let i = 0; i < SLOTS; i += 1) {
    for (const side of ["left", "right"]) {
      const n = side === "left" ? left[i] : right[i];
      const fill = n > 0 ? COLORS.holeOccupied : COLORS.hole;
      holes += `<circle cx="${holeX(side, i)}" cy="0" r="${HOLE_R}" fill="${fill}"/>`;
    }
  }

  return `
<g transform="${beamMat}">
<rect x="${-BEAM_HALF}" y="${-BEAM_TH / 2}" width="${BEAM_HALF * 2}" height="${BEAM_TH}" rx="${BEAM_TH / 2}" ry="${BEAM_TH / 2}" fill="${COLORS.beam}"/>
${holes}
<path d="${cradleD}" fill="${COLORS.beamCradle}"/>
<g transform="translate(0,${NEEDLE_OFFSET_Y}) scale(${NEEDLE_SCALE}) translate(${-NEEDLE_USER_TIP_X},${-NEEDLE_USER_TIP_Y})">
<path fill="${COLORS.pivotNeedle}" d="${needleD}"/>
</g>
</g>`;
}

function stackPaths(theta, counts, side) {
  let out = "";
  for (let i = 0; i < SLOTS; i += 1) {
    const n = counts[i] || 0;
    if (n <= 0) continue;
    const anchor = toWorld(holeX(side, i), 0, theta);
    let y = anchor.y;
    const yTops = [];
    let yBottomLast = anchor.y;
    for (let k = 0; k < n; k += 1) {
      const ropeLen = k === 0 ? ROPE_FROM_HOLE : ROPE_BETWEEN;
      const yTopWeight = y + ropeLen;
      yTops.push(yTopWeight);
      yBottomLast = yTopWeight + WEIGHT_H;
      y = yTopWeight + WEIGHT_H + STACK_AFTER_WEIGHT;
    }
    out += `<line x1="${anchor.x}" y1="${anchor.y}" x2="${anchor.x}" y2="${yBottomLast}" stroke="${COLORS.rope}" stroke-width="${ROPE_STROKE_W}" stroke-linecap="round"/>`;
    for (let k = 0; k < n; k += 1) {
      const yTopWeight = yTops[k];
      out += `<rect x="${anchor.x - WEIGHT_W / 2}" y="${yTopWeight}" width="${WEIGHT_W}" height="${WEIGHT_H}" rx="${WEIGHT_CORNER_R}" ry="${WEIGHT_CORNER_R}" fill="${COLORS.weight}"/>`;
    }
  }
  return out;
}

function computeBounds(theta, left, right) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x, y) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  const hw = BEAM_TH / 2;
  for (const [lx, ly] of [
    [-BEAM_HALF, -hw],
    [BEAM_HALF, -hw],
    [BEAM_HALF, hw],
    [-BEAM_HALF, hw],
  ]) {
    const p = toWorld(lx, ly, theta);
    add(p.x, p.y);
  }

  add(BEAM_LOCK_CX - 19, BEAM_LOCK_CY - 22);
  add(BEAM_LOCK_CX + 19, BEAM_LOCK_CY + 34);

  const standTy = PIVOT_STAND_GROUP_TY;
  const { anchor, scale: sc, vbW, vbH } = STAND_ASSET;
  for (const [sx, sy] of [
    [0, 0],
    [vbW, 0],
    [0, vbH],
    [vbW, vbH],
  ]) {
    add(PIVOT.x + sc * (sx - anchor.x), standTy + sc * (sy - anchor.y));
  }

  for (const side of ["left", "right"]) {
    const counts = side === "left" ? left : right;
    for (let i = 0; i < SLOTS; i += 1) {
      const n = counts[i] || 0;
      if (n <= 0) continue;
      const anchor = toWorld(holeX(side, i), 0, theta);
      let y = anchor.y;
      for (let k = 0; k < n; k += 1) {
        y += k === 0 ? ROPE_FROM_HOLE : ROPE_BETWEEN;
        add(anchor.x - WEIGHT_W / 2, y);
        add(anchor.x + WEIGHT_W / 2, y + WEIGHT_H);
        y += WEIGHT_H + STACK_AFTER_WEIGHT;
      }
    }
  }

  const pad = 12;
  return {
    minX: minX - pad,
    minY: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

const theta = 0.24;
const left = Array(SLOTS).fill(0);
const right = Array(SLOTS).fill(0);
left[2] = 1;
right[2] = 1;

// Ořez na střed simulace — celá délka páky by na kartě 132×88 zmizela.
const CARD_VIEW = {
  minX: 150,
  minY: 48,
  w: 670,
  h: 360,
};
const inner = `${standPaths()}
${beamPaths(theta, left, right)}
${stackPaths(theta, left, "left")}
${stackPaths(theta, right, "right")}
${beamLockPaths()}`;

const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CARD_VIEW.minX} ${CARD_VIEW.minY} ${CARD_VIEW.w} ${CARD_VIEW.h}" fill="none" aria-hidden="true">
${inner}
</svg>
`;

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, "card-lever.svg"), cardSvg);

const indexPath = path.join(outDir, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const innerOnly = inner.trim();
const newFn = `    function LeverCardIllustration() {
      // Páka — stejný vzhled jako ve simulaci paka/.
      return html\`<svg
        xmlns="http://www.w3.org/2000/svg"
        width="132"
        height="88"
        viewBox="0 0 132 88"
        aria-hidden="true"
      >
        <svg x="0" y="0" width="132" height="88" viewBox="${CARD_VIEW.minX} ${CARD_VIEW.minY} ${CARD_VIEW.w} ${CARD_VIEW.h}" preserveAspectRatio="xMidYMid meet" fill="none">
${innerOnly}
        </svg>
      </svg>\`;
    }`;

const start = html.indexOf("    function LeverCardIllustration()");
const end = html.indexOf("    function VztlakovaCardIllustration()");
if (start === -1 || end === -1) throw new Error("LeverCardIllustration markers missing");
html = html.slice(0, start) + newFn + "\n\n" + html.slice(end);
fs.writeFileSync(indexPath, html);
console.log("viewBox:", `${CARD_VIEW.minX} ${CARD_VIEW.minY} ${CARD_VIEW.w} ${CARD_VIEW.h}`);
