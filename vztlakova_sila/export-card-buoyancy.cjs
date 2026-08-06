const fs = require("fs");
const path = require("path");

const Z = 2;
const DESIGN_W = 1200;
const pad = 28 * Z;
const tankW = 480 * Z;
const tankHpx = 460 * Z;
const tankX = Math.round(pad + (DESIGN_W - 2 * pad - tankW) / 2);
const tankY = pad + 150 * Z;
const tankH = 40;
const waterH = 30;
const pxPerCm = tankHpx / tankH;
const baseYWater = tankY + (tankH - waterH) * pxPerCm;
const yWater = baseYWater;
const yBottom = tankY + tankHpx;
const tankBottomR = Math.min(18 * Z, tankW * 0.06, tankHpx * 0.05);

const MATERIAL = "beton";
const Vcm3 = 50;
const xBottom = 4;
const sideDispCm = Math.cbrt(Vcm3) * 2;
const sizePx = clamp(sideDispCm * pxPerCm, 72 * Z, 260 * Z);
const hookX = tankX + tankW / 2;
const yBottomWeight = baseYWater + xBottom * pxPerCm;
const weightX = hookX - sizePx / 2;
const weightY = yBottomWeight - sizePx;
const attachX = weightX + sizePx / 2;
const attachY = weightY - 8 * Z;
const ropeTopY = weightY - 80 * Z;

const inset = 2 * Z;
const il = tankX + inset;
const ir = tankX + tankW - inset;
const it = tankY + inset;
const ib = yBottom - inset;
const innerBR = Math.max(4 * Z, Math.min(tankBottomR, (ir - il) / 2 - 2 * Z, (ib - it) / 4));

const liqFill = "rgba(59, 130, 246, 0.52)";
const tankStroke = "rgba(200, 225, 255, 0.82)";
const tankGlow = "rgba(120, 180, 255, 0.55)";
const rope = "#8b96ab";
const weightFill = "#8a8f94";
const weightStroke = "rgba(255, 255, 255, 0.55)";
const hookFill = "#5eb8ff";

const CARD_VIEW = {
  minX: tankX - 16,
  minY: tankY - 12,
  w: tankW + 32,
  h: yBottom - tankY + 24,
};

function clamp(x, a, b) {
  return Math.min(b, Math.max(a, x));
}

function waveY(x) {
  const t = (x - tankX) / tankW;
  const env = Math.sin(t * Math.PI);
  const surf =
    Math.sin(t * Math.PI * 2.6) * 0.4 +
    Math.sin(t * Math.PI * 5.1) * 0.24 +
    Math.sin(t * Math.PI * 8.2) * 0.13;
  const micro = 0.48 * Z * Math.sin(t * Math.PI * 4);
  return yWater + 2 * env * surf + micro * env;
}

function waterPath() {
  const steps = 36;
  let d = `M ${il} ${waveY(il).toFixed(2)}`;
  for (let i = 1; i <= steps; i++) {
    const wx = il + ((ir - il) * i) / steps;
    d += ` L ${wx.toFixed(2)} ${waveY(wx).toFixed(2)}`;
  }
  d += ` L ${ir} ${ib - innerBR}`;
  d += ` A ${innerBR} ${innerBR} 0 0 1 ${(ir - innerBR).toFixed(2)} ${ib}`;
  d += ` L ${(il + innerBR).toFixed(2)} ${ib}`;
  d += ` A ${innerBR} ${innerBR} 0 0 1 ${il} ${(ib - innerBR).toFixed(2)}`;
  d += " Z";
  return d;
}

function tankOutlinePath() {
  return [
    `M ${tankX} ${tankY}`,
    `L ${tankX} ${yBottom - tankBottomR}`,
    `A ${tankBottomR} ${tankBottomR} 0 0 0 ${tankX + tankBottomR} ${yBottom}`,
    `L ${tankX + tankW - tankBottomR} ${yBottom}`,
    `A ${tankBottomR} ${tankBottomR} 0 0 0 ${tankX + tankW} ${yBottom - tankBottomR}`,
    `L ${tankX + tankW} ${tankY}`,
  ].join(" ");
}

function weightDots() {
  const r = Math.max(2, 2.15 * Z);
  const midX = weightX + sizePx / 2;
  const midY = weightY + sizePx / 2;
  const step = Math.max(8 * Z, sizePx * 0.14);
  const dots = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const cx = midX + col * step;
      const cy = midY + row * step;
      dots.push(
        `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="rgba(255,255,255,0.88)" stroke="rgba(0,0,0,0.35)" stroke-width="${Math.max(1.1, 0.55 * Z).toFixed(2)}"/>`
      );
    }
  }
  return dots.join("\n");
}

function submergedOverlay() {
  const midX = weightX + sizePx / 2;
  const surfY = waveY(midX);
  const yBot = weightY + sizePx;
  const subTop = Math.max(weightY, surfY);
  if (subTop >= yBot - 0.5) return "";
  const cr = Math.min(10 * Z, sizePx / 2);
  const clipId = "weightClip";
  return `
<defs>
  <clipPath id="${clipId}">
    <rect x="${weightX}" y="${weightY}" width="${sizePx}" height="${sizePx}" rx="${cr}" ry="${cr}"/>
  </clipPath>
</defs>
<rect x="${(weightX - 3).toFixed(2)}" y="${(subTop - 3).toFixed(2)}" width="${(sizePx + 6).toFixed(2)}" height="${(yBot - subTop + 6).toFixed(2)}" fill="${liqFill}" clip-path="url(#${clipId})"/>`;
}

const cr = Math.min(10 * Z, sizePx / 2);
const inner = `
<defs>
  <clipPath id="tankInner">
    <path d="M ${il} ${it} L ${il} ${ib - innerBR} A ${innerBR} ${innerBR} 0 0 0 ${il + innerBR} ${ib} L ${ir - innerBR} ${ib} A ${innerBR} ${innerBR} 0 0 0 ${ir} ${ib - innerBR} L ${ir} ${it} Z"/>
  </clipPath>
</defs>
<g clip-path="url(#tankInner)">
  <path d="${waterPath()}" fill="${liqFill}"/>
</g>
<path d="${tankOutlinePath()}" fill="none" stroke="${tankGlow}" stroke-width="${14 * Z}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
<path d="${tankOutlinePath()}" fill="none" stroke="${tankStroke}" stroke-width="${6.5 * Z}" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="${hookX}" y1="${ropeTopY}" x2="${attachX}" y2="${attachY}" stroke="${rope}" stroke-width="${3 * Z}" stroke-linecap="round"/>
<circle cx="${attachX}" cy="${attachY}" r="${5 * Z}" fill="${hookFill}"/>
<rect x="${weightX}" y="${weightY}" width="${sizePx}" height="${sizePx}" rx="${cr}" ry="${cr}" fill="${weightFill}" stroke="${weightStroke}" stroke-width="${3.2 * Z}"/>
${weightDots()}
${submergedOverlay()}`;

const svg = `<svg width="132" height="88" viewBox="${CARD_VIEW.minX} ${CARD_VIEW.minY} ${CARD_VIEW.w} ${CARD_VIEW.h}" fill="none" xmlns="http://www.w3.org/2000/svg">
${inner}
</svg>
`;

const outPath = path.join(__dirname, "card-buoyancy.svg");
fs.writeFileSync(outPath, svg);
console.log("Wrote", outPath);
console.log("viewBox:", `${CARD_VIEW.minX} ${CARD_VIEW.minY} ${CARD_VIEW.w} ${CARD_VIEW.h}`);
