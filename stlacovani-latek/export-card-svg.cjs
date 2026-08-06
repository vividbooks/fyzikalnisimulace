const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const jsonPath = path.join(__dirname, "assets/press-solid.json");
const animationData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const dom = new JSDOM("<!DOCTYPE html><div id='lottie'></div>", {
  pretendToBeVisual: true,
  resources: "usable",
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;

require("canvas");
const lottie = require("lottie-web/build/player/lottie.js");

const container = document.getElementById("lottie");
const anim = lottie.loadAnimation({
  container,
  renderer: "svg",
  loop: false,
  autoplay: false,
  animationData,
});

function parseMatrix(transform) {
  const m = /matrix\(([^)]+)\)/.exec(transform || "");
  if (!m) return null;
  const v = m[1].split(",").map(Number);
  return { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] };
}

function applyMatrix(m, x, y) {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

function getTransformChain(el) {
  const chain = [];
  while (el && el.tagName !== "svg") {
    const t = el.getAttribute("transform");
    if (t) chain.unshift(t);
    el = el.parentElement;
  }
  return chain;
}

function transformPoint(chain, x, y) {
  for (const t of chain) {
    const mat = parseMatrix(t);
    if (mat) {
      const p = applyMatrix(mat, x, y);
      x = p.x;
      y = p.y;
    }
  }
  return { x, y };
}

function computeBounds(svg, filterPath) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  svg.querySelectorAll("path").forEach((p) => {
    const d = p.getAttribute("d") || "";
    if (filterPath && !filterPath(d, p)) return;
    const nums = d.match(/-?\d+\.?\d*(?:e[-+]?\d+)?/gi);
    if (!nums || nums.length < 2) return;
    const chain = getTransformChain(p.parentElement);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const pt = transformPoint(chain, parseFloat(nums[i]), parseFloat(nums[i + 1]));
      if (pt.y < -100) continue;
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  });
  const pad = 24;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

anim.addEventListener("DOMLoaded", () => {
  anim.goToAndStop(0, true);
  const svg = container.querySelector("svg");
  if (!svg) process.exit(1);

  svg.querySelectorAll('[style*="display: none"]').forEach((el) => el.remove());
  svg.querySelectorAll('g[clip-path*="__lottie_element_10"]').forEach((el) => el.remove());
  svg.querySelectorAll('path[fill="rgb(29,29,27)"]').forEach((el) => {
    if ((el.getAttribute("d") || "").includes("1000,-1000")) el.remove();
  });
  svg.querySelectorAll('g[opacity="0.8"]').forEach((el) => el.remove());
  svg.querySelectorAll('g[opacity="0.15"]').forEach((el) => el.remove());
  svg.querySelectorAll('g[opacity="0.3"]').forEach((el) => el.remove());

  svg.querySelectorAll('path[fill="rgb(88,161,255)"]').forEach((el) => {
    const d = el.getAttribute("d") || "";
    if (/8\.395|-2\.207|-1\.799/.test(d)) el.closest("g[transform]")?.remove();
  });

  svg.querySelectorAll("[clip-path]").forEach((el) => el.removeAttribute("clip-path"));
  svg.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));

  const raw = computeBounds(svg, (d) => !/(-435|-659|-651)/.test(d));
  const maxY = raw.minY + raw.height;
  const bounds = {
    minX: raw.minX,
    minY: Math.max(raw.minY, -80),
    width: raw.width,
    height: maxY - Math.max(raw.minY, -80),
  };
  const vb = `${bounds.minX.toFixed(1)} ${bounds.minY.toFixed(1)} ${bounds.width.toFixed(1)} ${bounds.height.toFixed(1)}`;

  const innerG = svg.querySelector(":scope > g");
  const inner = innerG ? innerG.innerHTML : svg.innerHTML;

  const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none" aria-hidden="true">
${inner}
</svg>`;

  fs.writeFileSync(path.join(__dirname, "card-press.svg"), cardSvg);
  console.log("viewBox:", vb);
  process.exit(0);
});

setTimeout(() => process.exit(1), 15000);
