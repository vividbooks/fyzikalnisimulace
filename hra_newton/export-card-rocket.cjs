const fs = require("fs");
const path = require("path");

const PLAYER_R = 29.5;
const MASS_MID = 3;
const MASS_MIN = 1;
const MASS_MAX = 8;
const MASS_COLOR_MIN = { r: 0xf0, g: 0xa3, b: 0xfc };
const MASS_COLOR_MAX = { r: 0x7c, g: 0x04, b: 0x7e };
const COCKPIT = "#9ee7ff";
const STROKE = "#111827";

function massColorRgb(t) {
  const u = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(MASS_COLOR_MIN.r + (MASS_COLOR_MAX.r - MASS_COLOR_MIN.r) * u),
    g: Math.round(MASS_COLOR_MIN.g + (MASS_COLOR_MAX.g - MASS_COLOR_MIN.g) * u),
    b: Math.round(MASS_COLOR_MIN.b + (MASS_COLOR_MAX.b - MASS_COLOR_MIN.b) * u),
  };
}

function rgbCss(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function scaleRgb(rgb, factor) {
  return {
    r: Math.min(255, Math.round(rgb.r * factor)),
    g: Math.min(255, Math.round(rgb.g * factor)),
    b: Math.min(255, Math.round(rgb.b * factor)),
  };
}

const massT = (MASS_MID - MASS_MIN) / (MASS_MAX - MASS_MIN);
const hull = massColorRgb(massT);
const hullCss = rgbCss(hull);
const motorIdleCss = rgbCss(scaleRgb(hull, 0.72));
const motorActiveCss = hullCss;

function nozzlePath(hx, hy, dirX, dirY) {
  const perpX = -dirY;
  const perpY = dirX;
  return [
    `M ${hx + dirX * 7} ${hy + dirY * 7}`,
    `L ${hx + perpX * 5} ${hy + perpY * 5}`,
    `L ${hx - dirX * 3} ${hy - dirY * 3}`,
    `L ${hx - perpX * 5} ${hy - perpY * 5}`,
    "Z",
  ].join(" ");
}

function flamePath(baseX, baseY, dirX, dirY, len, spread, wobble = 0) {
  const perpX = -dirY;
  const perpY = dirX;
  const tipX = baseX + dirX * len;
  const tipY = baseY + dirY * len;
  const midX = baseX + dirX * len * 0.55;
  const midY = baseY + dirY * len * 0.55;
  return [
    `M ${baseX + perpX * spread * 0.45} ${baseY + perpY * spread * 0.45}`,
    `Q ${midX + perpX * (spread + wobble)} ${midY + perpY * (spread + wobble)} ${tipX} ${tipY}`,
    `Q ${midX - perpX * (spread + wobble)} ${midY - perpY * (spread + wobble)} ${baseX - perpX * spread * 0.45} ${baseY - perpY * spread * 0.45}`,
    "Z",
  ].join(" ");
}

function rocketBodyPaths() {
  const noseY = -PLAYER_R - 6;
  const finY = PLAYER_R * 0.62;
  const tailY = PLAYER_R * 0.36;
  const finX = PLAYER_R * 0.7;
  const cockpitY = -PLAYER_R * 0.2;
  const cockpitR = PLAYER_R * 0.24;
  const stripeX = -PLAYER_R * 0.42;
  const stripeY = PLAYER_R * 0.38;
  const stripeW = PLAYER_R * 0.84;
  const stripeH = 7;

  return `
<path d="M 0 ${noseY} L ${finX} ${finY} L 0 ${tailY} L ${-finX} ${finY} Z" fill="${hullCss}" stroke="${STROKE}" stroke-width="2"/>
<circle cx="0" cy="${cockpitY}" r="${cockpitR}" fill="${COCKPIT}" stroke="${STROKE}" stroke-width="1.5"/>
<rect x="${stripeX}" y="${stripeY}" width="${stripeW}" height="${stripeH}" rx="4" fill="${STROKE}"/>`;
}

function rocketFlamePaths() {
  const len = 38;
  const spread = 10;
  const flameBaseY = PLAYER_R + 4;

  return `
<path d="${flamePath(0, flameBaseY, 0, 1, len, spread)}" fill="#e63a00"/>
<path d="${flamePath(0, flameBaseY, 0, 1, len * 0.78, spread * 0.72)}" fill="#ff8c00"/>
<path d="${flamePath(0, flameBaseY, 0, 1, len * 0.5, spread * 0.42)}" fill="#ffd54a"/>
<path d="${flamePath(0, flameBaseY, 0, 1, len * 0.28, spread * 0.22)}" fill="#fffde7"/>`;
}

function rocketNozzlePaths() {
  const mainDist = PLAYER_R * 0.58;
  const sideX = PLAYER_R * 0.52;
  const sideY = -PLAYER_R * 0.42;

  return `
<path d="${nozzlePath(0, mainDist, 0, 1)}" fill="${motorActiveCss}" stroke="${STROKE}" stroke-width="1.5"/>
<path d="${nozzlePath(-sideX, sideY, -1, 0)}" fill="${motorIdleCss}" stroke="${STROKE}" stroke-width="1.5"/>
<path d="${nozzlePath(sideX, sideY, 1, 0)}" fill="${motorIdleCss}" stroke="${STROKE}" stroke-width="1.5"/>`;
}

// V simulaci: shipAngleHold = PI/2 → špička doprava, plamen dozadu.
const ANGLE_DEG = 90;
const CX = 66;
const CY = 44;

const inner = `
<g transform="translate(${CX}, ${CY}) rotate(${ANGLE_DEG})">
${rocketFlamePaths()}
${rocketBodyPaths()}
${rocketNozzlePaths()}
</g>`;

const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88" fill="none" aria-hidden="true">
${inner}
</svg>
`;

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, "card-rocket.svg"), cardSvg);

const indexPath = path.join(outDir, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const newFn = `    function HraNewtonCardIllustration() {
      return html\`<svg
        xmlns="http://www.w3.org/2000/svg"
        width="132"
        height="88"
        viewBox="0 0 132 88"
        aria-hidden="true"
      >
        <image
          href="hra_newton/card-rocket.svg"
          x="0"
          y="0"
          width="132"
          height="88"
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>\`;
    }`;

const start = html.indexOf("    function HraNewtonCardIllustration()");
const end = html.indexOf("    function TepelnaKapacitaCardIllustration()");
if (start === -1 || end === -1) throw new Error("HraNewtonCardIllustration markers missing");
html = html.slice(0, start) + newFn + "\n\n" + html.slice(end);
fs.writeFileSync(indexPath, html);
console.log("wrote card-rocket.svg, updated HraNewtonCardIllustration");
