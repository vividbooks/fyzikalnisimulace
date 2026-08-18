(() => {
  const SVG_W = 311;
  const SVG_H = 310;

  const SHAPE_SCALE = 0.7;
  const PEG = { x: 163.5, y: 44, r: 7 * SHAPE_SCALE };
  const HOOK_ATTACH = { x: PEG.x, y: PEG.y };

  const HOLE_R = 8;
  const WEIGHT_SHARE = 0.22;
  const WEIGHT_SNAP = HOLE_R * 2.8;
  const SNAP = 14 * SHAPE_SCALE;
  const G = 1800;
  const DAMPING = 2.4;
  const DRAW_MIN_DIST = 0.8;
  const CORNER_R = 6.4;
  const CORNER_HIT = 16;
  const MIN_SHAPE_AREA = 900;
  const VERTEX_LIMIT = { min: -60, max: 380 };

  function circlePath(cx, cy, r) {
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }

  function polygonPath(verts) {
    return `${verts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("")}Z`;
  }

  function polygonCentroid(verts) {
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < verts.length; i += 1) {
      const [x1, y1] = verts[i];
      const [x2, y2] = verts[(i + 1) % verts.length];
      const cross = x1 * y2 - x2 * y1;
      area += cross;
      cx += (x1 + x2) * cross;
      cy += (y1 + y2) * cross;
    }
    area *= 0.5;
    return { x: cx / (6 * area), y: cy / (6 * area) };
  }

  function weightMass(materialArea) {
    return Math.max(1400, Math.abs(materialArea) * WEIGHT_SHARE);
  }

  function weightedHoles() {
    return currentShape?.weights || [];
  }

  function shapeCentroid() {
    const holeArea = Math.PI * HOLE_R * HOLE_R;
    let area;
    let cx;
    let cy;

    if (currentShape.kind === "circle") {
      area = Math.PI * currentShape.r * currentShape.r;
      cx = currentShape.cx * area;
      cy = currentShape.cy * area;
      HOLES.forEach(([x, y]) => {
        area -= holeArea;
        cx -= x * holeArea;
        cy -= y * holeArea;
      });
    } else {
      const signed = polygonArea(VERTICES);
      const poly = polygonCentroid(VERTICES);
      area = signed;
      cx = poly.x * area;
      cy = poly.y * area;
      const holeSigned = holeArea * Math.sign(signed || 1);
      HOLES.forEach(([x, y]) => {
        area -= holeSigned;
        cx -= x * holeSigned;
        cy -= y * holeSigned;
      });
    }

    const mass = weightMass(area);
    const sign = Math.sign(area || 1);
    weightedHoles().forEach((index) => {
      const hole = HOLES[index];
      if (!hole) return;
      area += mass * sign;
      cx += hole[0] * mass * sign;
      cy += hole[1] * mass * sign;
    });

    return { x: cx / area, y: cy / area };
  }

  function updateCentroid() {
    centroid = shapeCentroid();
    currentShape.centroid = centroid;
  }

  function polygonArea(verts) {
    let area = 0;
    for (let i = 0; i < verts.length; i += 1) {
      const [x1, y1] = verts[i];
      const [x2, y2] = verts[(i + 1) % verts.length];
      area += x1 * y2 - x2 * y1;
    }
    return area * 0.5;
  }

  function boundsOf(verts) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    verts.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    return { minX, minY, maxX, maxY };
  }

  function makeHorseshoeVertices() {
    const cx = 156;
    const cy = 148;
    const outerR = 102;
    const innerR = 58;
    const start = (145 * Math.PI) / 180;
    const end = (35 * Math.PI) / 180 + Math.PI * 2;
    const steps = 28;
    const tipSteps = 8;
    const midR = (outerR + innerR) / 2;
    const halfW = (outerR - innerR) / 2;
    const verts = [];

    for (let i = 0; i <= steps; i += 1) {
      const t = start + ((end - start) * i) / steps;
      verts.push([cx + outerR * Math.cos(t), cy + outerR * Math.sin(t)]);
    }
    for (let i = 1; i < tipSteps; i += 1) {
      const t = (Math.PI * i) / tipSteps;
      const capCx = cx + midR * Math.cos(end);
      const capCy = cy + midR * Math.sin(end);
      const a = end + t;
      verts.push([capCx + halfW * Math.cos(a), capCy + halfW * Math.sin(a)]);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const t = start + ((end - start) * i) / steps;
      verts.push([cx + innerR * Math.cos(t), cy + innerR * Math.sin(t)]);
    }
    for (let i = 1; i < tipSteps; i += 1) {
      const t = (Math.PI * i) / tipSteps;
      const capCx = cx + midR * Math.cos(start);
      const capCy = cy + midR * Math.sin(start);
      const a = start + Math.PI + t;
      verts.push([capCx + halfW * Math.cos(a), capCy + halfW * Math.sin(a)]);
    }

    return { verts, cx, cy, midR, start, end };
  }

  const UTVAR_VERTS = [
    [247.668, 148.532],
    [163.669, 22.6651],
    [104.133, 113.921],
    [32.9109, 128.942],
    [71.7213, 227.303],
    [204.455, 273.132],
  ];

  const CIRCLE = { cx: 156, cy: 168, r: 98 };
  const CIRCLE_RING = 76;

  const horseshoe = makeHorseshoeVertices();

  const HROM_VERTS = [
    [128, 42],
    [214, 42],
    [168, 118],
    [246, 118],
    [102, 268],
    [148, 168],
    [78, 168],
  ];

  const BUMERANG_VERTS = [
    [52, 110],
    [48, 82],
    [72, 58],
    [108, 70],
    [148, 128],
    [164, 128],
    [204, 70],
    [240, 58],
    [264, 82],
    [260, 110],
    [186, 218],
    [156, 236],
    [126, 218],
  ];

  const SHAPES = [
    {
      id: "utvar",
      label: "Útvar",
      kind: "polygon",
      fill: "#f06d6d",
      stroke: "#ff2828",
      path: polygonPath(UTVAR_VERTS),
      vertices: UTVAR_VERTS,
      holes: [
        [163.384, 44.7653],
        [231.986, 151.418],
        [195.787, 256.697],
        [81.4278, 215.856],
        [51.8553, 138.847],
        [112.068, 124.035],
      ],
      centroid: polygonCentroid(UTVAR_VERTS),
      bounds: boundsOf(UTVAR_VERTS),
    },
    {
      id: "kruh",
      label: "Kruh",
      kind: "circle",
      fill: "#5b8def",
      stroke: "#2f6fed",
      path: circlePath(CIRCLE.cx, CIRCLE.cy, CIRCLE.r),
      vertices: [],
      cx: CIRCLE.cx,
      cy: CIRCLE.cy,
      r: CIRCLE.r,
      holes: [
        [CIRCLE.cx, CIRCLE.cy - CIRCLE_RING],
        [CIRCLE.cx + CIRCLE_RING, CIRCLE.cy],
        [CIRCLE.cx, CIRCLE.cy + CIRCLE_RING],
        [CIRCLE.cx - CIRCLE_RING, CIRCLE.cy],
        [CIRCLE.cx + CIRCLE_RING * 0.7, CIRCLE.cy - CIRCLE_RING * 0.7],
      ],
      centroid: { x: CIRCLE.cx, y: CIRCLE.cy },
      bounds: {
        minX: CIRCLE.cx - CIRCLE.r,
        minY: CIRCLE.cy - CIRCLE.r,
        maxX: CIRCLE.cx + CIRCLE.r,
        maxY: CIRCLE.cy + CIRCLE.r,
      },
    },
    {
      id: "podkova",
      label: "Podkova",
      kind: "polygon",
      fill: "#e8a317",
      stroke: "#c4840c",
      path: polygonPath(horseshoe.verts),
      vertices: horseshoe.verts,
      holes: [
        [
          horseshoe.cx,
          horseshoe.cy + horseshoe.midR * Math.sin((270 * Math.PI) / 180),
        ],
        [
          horseshoe.cx + horseshoe.midR * Math.cos(horseshoe.start),
          horseshoe.cy + horseshoe.midR * Math.sin(horseshoe.start),
        ],
        [
          horseshoe.cx + horseshoe.midR * Math.cos(horseshoe.end),
          horseshoe.cy + horseshoe.midR * Math.sin(horseshoe.end),
        ],
        [
          horseshoe.cx + horseshoe.midR * Math.cos((200 * Math.PI) / 180),
          horseshoe.cy + horseshoe.midR * Math.sin((200 * Math.PI) / 180),
        ],
        [
          horseshoe.cx + horseshoe.midR * Math.cos((340 * Math.PI) / 180),
          horseshoe.cy + horseshoe.midR * Math.sin((340 * Math.PI) / 180),
        ],
      ],
      centroid: polygonCentroid(horseshoe.verts),
      bounds: boundsOf(horseshoe.verts),
    },
    {
      id: "bumerang",
      label: "Bumerang",
      kind: "polygon",
      fill: "#6fbf73",
      stroke: "#3d9a4a",
      path: polygonPath(BUMERANG_VERTS),
      vertices: BUMERANG_VERTS,
      holes: [
        [78, 78],
        [234, 78],
        [156, 200],
        [118, 118],
        [194, 118],
      ],
      centroid: polygonCentroid(BUMERANG_VERTS),
      bounds: boundsOf(BUMERANG_VERTS),
    },
    {
      id: "hrom",
      label: "Hrom",
      kind: "polygon",
      fill: "#9b6dd7",
      stroke: "#7a45c2",
      path: polygonPath(HROM_VERTS),
      vertices: HROM_VERTS,
      holes: [
        [140.36, 60.2],
        [194.83, 52.8],
        [148.83, 128.8],
        [225.76, 126.63],
        [114.39, 249.82],
        [166.52, 156.13],
        [96.2, 155.64],
      ],
      centroid: polygonCentroid(HROM_VERTS),
      bounds: boundsOf(HROM_VERTS),
    },
  ];

  const scene = document.getElementById("scene");
  const worldGroup = document.getElementById("world");
  const shapeGroup = document.getElementById("shape-group");
  const shapeBody = document.getElementById("shape-body");
  const shapeStroke = document.getElementById("shape-stroke");
  const shapeClipPath = document.getElementById("shape-clip-path");
  const drawingsGroup = document.getElementById("drawings");
  const holesGroup = document.getElementById("holes");
  const cornersGroup = document.getElementById("corners");
  const hookGroup = document.getElementById("hook");
  const hookOverGroup = document.getElementById("hook-over");
  const holesClip = document.getElementById("holes-clip");
  const guessLayer = document.getElementById("guess-layer");
  const guideVis = document.getElementById("guide-line-vis");
  const guessFeedback = document.getElementById("guess-feedback");
  const confettiLayer = document.getElementById("confetti");
  const app = document.getElementById("app");
  const guessCmBtn = document.getElementById("tool-guess-cm");
  const reshapeBtn = document.getElementById("tool-reshape");
  const pencilBtn = document.getElementById("tool-pencil");
  const weightsGroup = document.getElementById("weights");
  const weightSupply = document.getElementById("weight-supply");
  const weightGhost = document.getElementById("weight-ghost");
  const clearDrawingsBtn = document.getElementById("clear-drawings-btn");
  const guideBtn = document.getElementById("toggle-guide");
  const guideGroup = document.getElementById("guide-line");

  let VERTICES = [];
  let HOLES = [];
  let centroid = { x: 0, y: 0 };
  let currentShape = null;

  const state = {
    width: 0,
    height: 0,
    worldScale: 1,
    worldX: 0,
    worldY: 0,
    tx: 0,
    ty: 0,
    angle: 0,
    omega: 0,
    hungIndex: -1,
    dragging: false,
    dragMode: null,
    grabLocal: null,
    cornerIndex: -1,
    nearIndex: -1,
    lastT: 0,
    placed: false,
    tool: "move",
    drawing: false,
    currentStroke: null,
    strokePoints: [],
    guessResult: null,
    guideOn: false,
    weightFrom: null,
    weightSnap: -1,
  };

  function createPeg() {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.classList.add("peg");
    circle.setAttribute("cx", PEG.x);
    circle.setAttribute("cy", PEG.y);
    circle.setAttribute("r", PEG.r);
    circle.setAttribute("fill", "#575756");
    return circle;
  }

  hookGroup.append(createPeg());
  hookOverGroup.append(createPeg());

  function rebuildHoles() {
    holesGroup.replaceChildren();
    holesClip.replaceChildren();

    HOLES.forEach((hole, index) => {
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.classList.add("hole-hit");
      hit.setAttribute("cx", hole[0]);
      hit.setAttribute("cy", hole[1]);
      hit.setAttribute("r", HOLE_R * 2.1);
      hit.dataset.index = String(index);

      const disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      disk.classList.add("hole-disk");
      disk.setAttribute("cx", hole[0]);
      disk.setAttribute("cy", hole[1]);
      disk.setAttribute("r", HOLE_R);
      disk.dataset.index = String(index);

      holesGroup.append(hit, disk);

      const clip = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      clip.setAttribute("r", HOLE_R * SHAPE_SCALE);
      clip.dataset.index = String(index);
      holesClip.append(clip);
    });

    rebuildWeights();
  }

  function rebuildWeights() {
    weightsGroup.replaceChildren();
    weightedHoles().forEach((index) => {
      const hole = HOLES[index];
      if (!hole) return;
      weightsGroup.append(createWeight(hole[0], hole[1], index));
    });
  }

  function weightTransform(x, y) {
    const scale = (HOLE_R * 1.12) / 18.25;
    return `translate(${x} ${y}) scale(${scale}) translate(-18.25 -18.25)`;
  }

  function createWeight(x, y, index) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("weight");
    group.dataset.index = String(index);
    group.setAttribute("transform", weightTransform(x, y));

    const art = document.createElementNS("http://www.w3.org/2000/svg", "use");
    art.setAttribute("href", "#weight-art");
    group.append(art);
    return group;
  }

  function syncWeightNodes() {
    weightsGroup.querySelectorAll(".weight").forEach((group) => {
      const hole = HOLES[Number(group.dataset.index)];
      if (!hole) return;
      group.setAttribute("transform", weightTransform(hole[0], hole[1]));
    });
  }

  function addWeight(index) {
    if (!currentShape.weights) currentShape.weights = [];
    if (!currentShape.weights.includes(index)) {
      currentShape.weights.push(index);
    }
    rebuildWeights();
    updateCentroid();
  }

  function removeWeight(index) {
    if (!currentShape.weights) return;
    currentShape.weights = currentShape.weights.filter((item) => item !== index);
    rebuildWeights();
    updateCentroid();
  }

  function holeHasWeight(index) {
    return weightedHoles().includes(index);
  }

  function nearestHole(local) {
    let best = -1;
    let bestDist = Infinity;
    HOLES.forEach((hole, index) => {
      const dist = Math.hypot(local.x - hole[0], local.y - hole[1]);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return { index: best, dist: bestDist };
  }

  function clearHoleSnaps() {
    holesGroup.querySelectorAll(".hole-disk").forEach((disk) => {
      disk.classList.remove("is-snap");
    });
  }

  function setHoleSnap(index) {
    clearHoleSnaps();
    if (index < 0) return;
    const disk = holesGroup.querySelector(`.hole-disk[data-index="${index}"]`);
    if (disk) disk.classList.add("is-snap");
  }

  function hideWeightGhost() {
    weightGhost.hidden = true;
    weightGhost.classList.remove("is-snapped");
    clearHoleSnaps();
    app.classList.remove("is-dragging-weight");
  }

  function placeWeightGhost(x, y, snapped) {
    weightGhost.hidden = false;
    weightGhost.classList.toggle("is-snapped", snapped);
    weightGhost.style.left = `${x}px`;
    weightGhost.style.top = `${y}px`;
  }

  function beginWeightDrag(event, from) {
    event.preventDefault();
    state.dragging = true;
    state.dragMode = "weight";
    state.weightFrom = from;
    state.weightSnap = -1;
    if (typeof from === "number") {
      removeWeight(from);
    }
    app.classList.add("is-dragging");
    app.classList.add("is-dragging-weight");
    updateWeightGhost(event);
  }

  function updateWeightGhost(event) {
    const pointer = pointerFromEvent(event);
    const local = worldToLocal(pointer.x, pointer.y);
    const nearest = nearestHole(local);
    const origin = state.weightFrom;
    const allowed =
      nearest.index >= 0 &&
      nearest.dist <= WEIGHT_SNAP &&
      (!holeHasWeight(nearest.index) || nearest.index === origin);

    if (allowed) {
      state.weightSnap = nearest.index;
      const hole = HOLES[nearest.index];
      const screen = worldToScreen(localToWorld(hole[0], hole[1]).x, localToWorld(hole[0], hole[1]).y);
      const rect = scene.getBoundingClientRect();
      placeWeightGhost(rect.left + screen.x, rect.top + screen.y, true);
      setHoleSnap(nearest.index);
      return;
    }

    state.weightSnap = -1;
    clearHoleSnaps();
    placeWeightGhost(event.clientX, event.clientY, false);
  }

  function finishWeightDrag() {
    const snap = state.weightSnap;
    state.dragMode = null;
    state.weightFrom = null;
    state.weightSnap = -1;
    hideWeightGhost();
    if (snap >= 0) {
      addWeight(snap);
    }
  }

  function syncHoleNodes() {
    holesGroup.querySelectorAll("circle").forEach((node) => {
      const hole = HOLES[Number(node.dataset.index)];
      if (!hole) return;
      node.setAttribute("cx", hole[0]);
      node.setAttribute("cy", hole[1]);
    });
  }

  function vertexInward(verts, index) {
    const count = verts.length;
    const prev = verts[(index - 1 + count) % count];
    const cur = verts[index];
    const next = verts[(index + 1) % count];
    const ax = prev[0] - cur[0];
    const ay = prev[1] - cur[1];
    const bx = next[0] - cur[0];
    const by = next[1] - cur[1];
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 1e-6 || lb < 1e-6) return { x: 0, y: 0 };
    const aX = ax / la;
    const aY = ay / la;
    const bX = bx / lb;
    const bY = by / lb;
    let x = aX + bX;
    let y = aY + bY;
    const len = Math.hypot(x, y);
    if (len < 1e-6) {
      x = -aY;
      y = aX;
    } else {
      x /= len;
      y /= len;
    }
    if (!pointInPolygon(cur[0] + x * 12, cur[1] + y * 12, verts)) {
      x = -x;
      y = -y;
    }
    return { x, y };
  }

  function vertexFrame(verts, index) {
    const inward = vertexInward(verts, index);
    return {
      origin: verts[index],
      ux: inward.x,
      uy: inward.y,
      vx: -inward.y,
      vy: inward.x,
    };
  }

  function bindHolesToVertices(verts, holes) {
    const used = new Set();
    return holes.map((hole) => {
      let best = -1;
      let bestDist = Infinity;
      verts.forEach((vertex, index) => {
        if (used.has(index)) return;
        const dist = Math.hypot(hole[0] - vertex[0], hole[1] - vertex[1]);
        if (dist < bestDist) {
          bestDist = dist;
          best = index;
        }
      });
      used.add(best);
      const frame = vertexFrame(verts, best);
      const dx = hole[0] - frame.origin[0];
      const dy = hole[1] - frame.origin[1];
      return {
        vertexIndex: best,
        along: dx * frame.ux + dy * frame.uy,
        across: dx * frame.vx + dy * frame.vy,
      };
    });
  }

  function holeAtVertex(verts, binding) {
    const frame = vertexFrame(verts, binding.vertexIndex);
    let x = frame.origin[0] + frame.ux * binding.along + frame.vx * binding.across;
    let y = frame.origin[1] + frame.uy * binding.along + frame.vy * binding.across;
    if (!pointInPolygon(x, y, verts)) {
      const fallback = Math.max(HOLE_R + 4, Math.abs(binding.along));
      x = frame.origin[0] + frame.ux * fallback;
      y = frame.origin[1] + frame.uy * fallback;
    }
    return [x, y];
  }

  function placeHolesAtVertices() {
    if (!currentShape?.holeBindings) return;
    currentShape.holeBindings.forEach((binding, index) => {
      const pos = holeAtVertex(VERTICES, binding);
      HOLES[index][0] = pos[0];
      HOLES[index][1] = pos[1];
    });
    syncHoleNodes();
    syncWeightNodes();
  }

  function shapeHasCorners(shape) {
    return shape && shape.kind === "polygon" && shape.vertices.length <= 20;
  }

  function rebuildCorners() {
    cornersGroup.replaceChildren();
    if (!shapeHasCorners(currentShape)) return;

    VERTICES.forEach((vertex, index) => {
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      hit.classList.add("corner-hit");
      hit.setAttribute("cx", vertex[0]);
      hit.setAttribute("cy", vertex[1]);
      hit.setAttribute("r", CORNER_HIT);
      hit.dataset.index = String(index);

      const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      handle.classList.add("corner-handle");
      handle.setAttribute("cx", vertex[0]);
      handle.setAttribute("cy", vertex[1]);
      handle.setAttribute("r", CORNER_R);
      handle.dataset.index = String(index);

      cornersGroup.append(hit, handle);
    });
  }

  function syncCornerHandles() {
    if (!shapeHasCorners(currentShape)) return;
    cornersGroup.querySelectorAll("circle").forEach((node) => {
      const vertex = VERTICES[Number(node.dataset.index)];
      if (!vertex) return;
      node.setAttribute("cx", vertex[0]);
      node.setAttribute("cy", vertex[1]);
    });
  }

  function refreshShapePath() {
    const path =
      currentShape.kind === "circle" ? currentShape.path : polygonPath(VERTICES);
    if (currentShape.kind === "polygon") {
      currentShape.path = path;
      currentShape.bounds = boundsOf(VERTICES);
      placeHolesAtVertices();
    }
    updateCentroid();
    const holeCuts = HOLES.map(([x, y]) => circlePath(x, y, HOLE_R)).join("");
    shapeBody.setAttribute("d", path + holeCuts);
    shapeStroke.setAttribute("d", path);
    shapeClipPath.setAttribute("d", path + holeCuts);
    shapeClipPath.setAttribute("fill-rule", "evenodd");
    syncCornerHandles();
  }

  function applyShape(id) {
    const next = SHAPES.find((item) => item.id === id);
    if (!next) return;

    currentShape = next;
    if (next.kind === "polygon") {
      if (!next.liveVertices) {
        next.liveVertices = next.vertices.map((vertex) => [vertex[0], vertex[1]]);
      }
      VERTICES = next.liveVertices;
    } else {
      VERTICES = next.vertices;
    }
    if (!next.liveHoles) {
      next.liveHoles = next.holes.map((hole) => [hole[0], hole[1]]);
    }
    HOLES = next.liveHoles;
    if (!next.weights) next.weights = [];
    if (shapeHasCorners(next) && !next.holeBindings) {
      next.holeBindings = bindHolesToVertices(VERTICES, HOLES);
    }
    centroid = next.kind === "polygon" ? polygonCentroid(VERTICES) : next.centroid;
    if (next.kind === "polygon") {
      next.centroid = centroid;
      next.bounds = boundsOf(VERTICES);
      next.path = polygonPath(VERTICES);
    }

    app.style.setProperty("--shape-fill", next.fill);
    app.style.setProperty("--shape-stroke", next.stroke);
    app.dataset.shape = next.id;

    rebuildHoles();
    rebuildCorners();
    refreshShapePath();
    updateReshapeButton();

    document.querySelectorAll("[data-shape]").forEach((btn) => {
      const on = btn.dataset.shape === next.id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function selectShape(id) {
    if (currentShape && currentShape.id === id) return;
    applyShape(id);
    clearDrawings();
    resetToDefault();
  }

  function thumbnailViewBox(bounds) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const pad = Math.max(width, height) * 0.1;
    return `${bounds.minX - pad} ${bounds.minY - pad} ${width + pad * 2} ${height + pad * 2}`;
  }

  function buildShapePicker() {
    const picker = document.querySelector(".shape-picker");
    picker.replaceChildren();

    SHAPES.forEach((shape) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shape-btn";
      button.dataset.shape = shape.id;
      button.title = shape.label;
      button.setAttribute("aria-label", shape.label);
      button.setAttribute("aria-pressed", "false");

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("shape-thumb");
      svg.setAttribute("viewBox", thumbnailViewBox(shape.bounds));
      svg.setAttribute("aria-hidden", "true");

      const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const holeCuts = shape.holes.map(([x, y]) => circlePath(x, y, HOLE_R)).join("");
      body.setAttribute("d", shape.path + holeCuts);
      body.setAttribute("fill", shape.fill);
      body.setAttribute("fill-rule", "evenodd");
      body.setAttribute("stroke", shape.stroke);
      body.setAttribute("stroke-width", "7");
      svg.append(body);

      button.append(svg);
      button.addEventListener("click", () => selectShape(shape.id));
      picker.append(button);
    });
  }

  function pointInPolygon(x, y, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i, i += 1) {
      const xi = verts[i][0];
      const yi = verts[i][1];
      const xj = verts[j][0];
      const yj = verts[j][1];
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInShape(x, y) {
    if (!currentShape) return false;
    if (currentShape.kind === "circle") {
      return Math.hypot(x - currentShape.cx, y - currentShape.cy) <= currentShape.r;
    }
    return pointInPolygon(x, y, VERTICES);
  }

  function rotatePoint(x, y, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: c * x - s * y, y: s * x + c * y };
  }

  function localToWorld(x, y) {
    const p = rotatePoint(x * SHAPE_SCALE, y * SHAPE_SCALE, state.angle);
    return { x: state.tx + p.x, y: state.ty + p.y };
  }

  function worldToLocal(x, y) {
    const dx = x - state.tx;
    const dy = y - state.ty;
    const c = Math.cos(state.angle);
    const s = Math.sin(state.angle);
    return {
      x: (c * dx + s * dy) / SHAPE_SCALE,
      y: (-s * dx + c * dy) / SHAPE_SCALE,
    };
  }

  function pinToHook(holeIndex) {
    const hole = HOLES[holeIndex];
    const holeRot = rotatePoint(hole[0] * SHAPE_SCALE, hole[1] * SHAPE_SCALE, state.angle);
    state.tx = HOOK_ATTACH.x - holeRot.x;
    state.ty = HOOK_ATTACH.y - holeRot.y;
  }

  function hangAngleFor(holeIndex) {
    const hole = HOLES[holeIndex];
    const vx = centroid.x - hole[0];
    const vy = centroid.y - hole[1];
    return Math.PI / 2 - Math.atan2(vy, vx);
  }

  function normalizeAngle(angle) {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function nearestHoleToHook() {
    let best = -1;
    let bestDist = Infinity;
    HOLES.forEach((hole, index) => {
      const p = localToWorld(hole[0], hole[1]);
      const dist = Math.hypot(p.x - HOOK_ATTACH.x, p.y - HOOK_ATTACH.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return { index: best, dist: bestDist };
  }

  function updateGuide() {
    const x = state.worldX + HOOK_ATTACH.x * state.worldScale;
    guideVis.setAttribute("x1", x);
    guideVis.setAttribute("x2", x);
    guideVis.setAttribute("y1", 0);
    guideVis.setAttribute("y2", state.height);
  }

  function setGuideOn(on) {
    state.guideOn = on;
    app.dataset.guideOn = String(on);
    guideBtn.classList.toggle("is-active", on);
    guideBtn.setAttribute("aria-pressed", String(on));
    if (guideGroup) guideGroup.hidden = !on;
    if (on) updateGuide();
  }

  function pointerFromEvent(event) {
    const rect = scene.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * state.width;
    const sy = ((event.clientY - rect.top) / rect.height) * state.height;
    return {
      x: (sx - state.worldX) / state.worldScale,
      y: (sy - state.worldY) / state.worldScale,
    };
  }

  function pointOnShapeBody(x, y) {
    if (!pointInShape(x, y)) return false;
    for (let i = 0; i < HOLES.length; i += 1) {
      const hole = HOLES[i];
      if (Math.hypot(x - hole[0], y - hole[1]) <= HOLE_R) return false;
    }
    return true;
  }

  function updateReshapeButton() {
    const enabled = shapeHasCorners(currentShape);
    reshapeBtn.disabled = !enabled;
    reshapeBtn.setAttribute("aria-disabled", String(!enabled));
    if (!enabled && state.tool === "reshape") {
      setTool("move");
    }
  }

  function setTool(tool) {
    if (tool === "reshape" && !shapeHasCorners(currentShape)) {
      tool = "move";
    }
    if (tool !== "guess-cm") {
      clearGuessResult();
    }
    state.tool = tool;
    app.dataset.tool = tool;
    guessCmBtn.classList.toggle("is-active", tool === "guess-cm");
    guessCmBtn.setAttribute("aria-pressed", String(tool === "guess-cm"));
    reshapeBtn.classList.toggle("is-active", tool === "reshape");
    reshapeBtn.setAttribute("aria-pressed", String(tool === "reshape"));
    pencilBtn.classList.toggle("is-active", tool === "pencil");
    pencilBtn.setAttribute("aria-pressed", String(tool === "pencil"));
  }

  function shapeBounds() {
    return currentShape.bounds;
  }

  function referenceGuessDistance() {
    const bounds = shapeBounds();
    return Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * SHAPE_SCALE * 0.45;
  }

  function guessAccuracyLabel(distance) {
    const ref = referenceGuessDistance();
    const score = Math.max(0, Math.round(100 - (distance / ref) * 100));
    let label = "Od těžiště jsi dost daleko.";
    let hit = false;
    if (distance <= ref * 0.02) {
      label = "TREFA!";
      hit = true;
    } else if (distance <= ref * 0.08) label = "Výborně! Velmi přesný odhad.";
    else if (distance <= ref * 0.28) label = "Dobře, jsi docela blízko.";
    else if (distance <= ref * 0.5) label = "Už to není daleko.";
    return { score, label, ref, hit };
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const n = parseInt(value, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function mixHex(hex, other, amount) {
    const a = hexToRgb(hex);
    const b = hexToRgb(other);
    const r = Math.round(a.r + (b.r - a.r) * amount);
    const g = Math.round(a.g + (b.g - a.g) * amount);
    const bl = Math.round(a.b + (b.b - a.b) * amount);
    return `rgb(${r} ${g} ${bl})`;
  }

  function worldToScreen(wx, wy) {
    const rect = scene.getBoundingClientRect();
    const sx = state.worldX + wx * state.worldScale;
    const sy = state.worldY + wy * state.worldScale;
    return {
      x: (sx / state.width) * rect.width,
      y: (sy / state.height) * rect.height,
    };
  }

  function burstConfetti(worldX, worldY) {
    if (!confettiLayer) return;
    const origin = worldToScreen(worldX, worldY);
    const fill = currentShape?.fill || "#f06d6d";
    const stroke = currentShape?.stroke || fill;
    const colors = [
      fill,
      stroke,
      mixHex(fill, "#ffffff", 0.45),
      mixHex(fill, "#ffffff", 0.2),
      mixHex(fill, "#000000", 0.22),
      "#ffffff",
    ];

    confettiLayer.replaceChildren();

    const flash = document.createElement("span");
    flash.className = "confetti-flash";
    flash.style.left = `${origin.x}px`;
    flash.style.top = `${origin.y}px`;
    flash.style.background = `radial-gradient(circle, ${mixHex(fill, "#ffffff", 0.55)} 0%, ${fill} 42%, transparent 72%)`;
    confettiLayer.append(flash);

    const count = 160;
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("span");
      const kind = i % 5 === 0 ? "dot" : i % 4 === 0 ? "ribbon" : "piece";
      piece.className = `confetti-piece confetti-${kind}`;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
      const dist = 120 + Math.random() * 280;
      piece.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      piece.style.setProperty("--dy", `${Math.sin(angle) * dist - 40}px`);
      piece.style.setProperty("--fall", `${140 + Math.random() * 220}px`);
      piece.style.setProperty("--rot", `${Math.random() * 900 - 450}deg`);
      piece.style.left = `${origin.x}px`;
      piece.style.top = `${origin.y}px`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 80}ms`;
      piece.style.animationDuration = `${1400 + Math.random() * 700}ms`;
      confettiLayer.append(piece);
    }

    window.clearTimeout(burstConfetti.timer);
    burstConfetti.timer = window.setTimeout(() => {
      confettiLayer.replaceChildren();
    }, 2300);
  }

  function clearGuessResult() {
    state.guessResult = null;
    guessLayer.replaceChildren();
    guessLayer.hidden = true;
    guessFeedback.hidden = true;
    guessFeedback.classList.remove("is-hit");
    guessFeedback.textContent = "";
    if (confettiLayer) confettiLayer.replaceChildren();
  }

  function submitGuess(guessWorld) {
    const actual = localToWorld(centroid.x, centroid.y);
    const distance = Math.hypot(guessWorld.x - actual.x, guessWorld.y - actual.y);
    const { score, label, hit } = guessAccuracyLabel(distance);
    state.guessResult = {
      guessX: guessWorld.x,
      guessY: guessWorld.y,
      distance,
      score,
      label,
    };
    guessFeedback.classList.toggle("is-hit", hit);
    guessFeedback.innerHTML = `<strong>${label}</strong>Odchylka ${Math.round(distance)} px · přesnost ${score}&nbsp;%`;
    guessFeedback.hidden = false;
    updateGuessVisuals();
    if (hit) burstConfetti(actual.x, actual.y);
  }

  function colorBehindWorld(x, y) {
    const local = worldToLocal(x, y);
    if (pointOnShapeBody(local.x, local.y)) {
      return currentShape.fill;
    }
    return "#ffffff";
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const toLin = (channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  }

  function contrastInk(hex) {
    return relativeLuminance(hex) > 0.42 ? "#1d1d1b" : "#ffffff";
  }

  function createCross(x, y, className, color) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add(className);
    group.setAttribute("transform", `translate(${x} ${y})`);

    const ink = color || "#1d1d1b";
    const halo = ink === "#ffffff" ? "#1d1d1b" : "#ffffff";
    const size = 4.5;
    const arms = [
      [-size, 0, size, 0],
      [0, -size, 0, size],
    ];

    arms.forEach(([x1, y1, x2, y2]) => {
      const outline = document.createElementNS("http://www.w3.org/2000/svg", "line");
      outline.setAttribute("x1", x1);
      outline.setAttribute("y1", y1);
      outline.setAttribute("x2", x2);
      outline.setAttribute("y2", y2);
      outline.setAttribute("stroke", halo);
      outline.setAttribute("stroke-width", "3.2");
      group.append(outline);
    });

    arms.forEach(([x1, y1, x2, y2]) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", ink);
      line.setAttribute("stroke-width", "1.6");
      group.append(line);
    });

    return group;
  }

  function updateGuessVisuals() {
    if (!state.guessResult || state.tool !== "guess-cm") {
      guessLayer.hidden = true;
      return;
    }

    const guess = state.guessResult;
    const ink = contrastInk(colorBehindWorld(guess.guessX, guess.guessY));
    guessLayer.hidden = false;
    guessLayer.replaceChildren();
    guessLayer.append(createCross(guess.guessX, guess.guessY, "guess-cross", ink));
  }

  function updateClearDrawingsButton() {
    const hasDrawings = drawingsGroup.childElementCount > 0;
    clearDrawingsBtn.disabled = !hasDrawings;
    clearDrawingsBtn.setAttribute("aria-disabled", String(!hasDrawings));
  }

  function startStroke(local) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("drawing-stroke");
    path.setAttribute("d", `M${local.x} ${local.y}`);
    drawingsGroup.append(path);
    state.drawing = true;
    state.currentStroke = path;
    state.strokePoints = [{ x: local.x, y: local.y }];
    app.classList.add("is-drawing");
    updateClearDrawingsButton();
  }

  function continueStroke(local) {
    if (!state.drawing || !state.currentStroke) return;
    const last = state.strokePoints[state.strokePoints.length - 1];
    if (Math.hypot(local.x - last.x, local.y - last.y) < DRAW_MIN_DIST) return;
    state.strokePoints.push({ x: local.x, y: local.y });
    const d = state.strokePoints
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
      .join(" ");
    state.currentStroke.setAttribute("d", d);
  }

  function finishStroke() {
    state.drawing = false;
    state.currentStroke = null;
    state.strokePoints = [];
    app.classList.remove("is-drawing");
  }

  function clearDrawings() {
    drawingsGroup.replaceChildren();
    finishStroke();
    updateClearDrawingsButton();
  }

  function nearestCorner(local) {
    if (state.tool !== "reshape" || !shapeHasCorners(currentShape)) return -1;
    let best = -1;
    let bestDist = Infinity;
    VERTICES.forEach((vertex, index) => {
      const dist = Math.hypot(local.x - vertex[0], local.y - vertex[1]);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return bestDist <= CORNER_HIT ? best : -1;
  }

  function moveCorner(index, local) {
    const x = Math.min(VERTEX_LIMIT.max, Math.max(VERTEX_LIMIT.min, local.x));
    const y = Math.min(VERTEX_LIMIT.max, Math.max(VERTEX_LIMIT.min, local.y));
    const previous = VERTICES[index];
    const previousArea = polygonArea(VERTICES);
    VERTICES[index] = [x, y];
    const nextArea = polygonArea(VERTICES);
    const collapsed =
      !Number.isFinite(nextArea) ||
      Math.abs(nextArea) < MIN_SHAPE_AREA ||
      Math.sign(nextArea) !== Math.sign(previousArea);
    if (collapsed) {
      VERTICES[index] = previous;
      return false;
    }
    currentShape.edited = true;
    refreshShapePath();
    if (state.hungIndex >= 0) pinToHook(state.hungIndex);
    return true;
  }

  function hitTest(local) {
    let holeIndex = -1;
    let holeDist = Infinity;
    for (let i = 0; i < HOLES.length; i += 1) {
      const hole = HOLES[i];
      const dist = Math.hypot(local.x - hole[0], local.y - hole[1]);
      if (dist <= HOLE_R * 2.4 && dist < holeDist) {
        holeDist = dist;
        holeIndex = i;
      }
    }

    const corner = nearestCorner(local);
    let cornerDist = Infinity;
    if (corner >= 0) {
      const vertex = VERTICES[corner];
      cornerDist = Math.hypot(local.x - vertex[0], local.y - vertex[1]);
    }

    if (corner >= 0 && (state.tool === "reshape" || holeIndex < 0 || cornerDist <= holeDist)) {
      return { kind: "corner", index: corner };
    }
    if (holeIndex >= 0) {
      return { kind: "hole", index: holeIndex };
    }
    if (pointInShape(local.x, local.y)) {
      return { kind: "body" };
    }
    return null;
  }

  function layout() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    scene.setAttribute("viewBox", `0 0 ${state.width} ${state.height}`);

    state.worldScale =
      Math.min(state.width / SVG_W, state.height / SVG_H) * 0.88;
    state.worldX = (state.width - SVG_W * state.worldScale) / 2;
    state.worldY = (state.height - SVG_H * state.worldScale) / 2;

    worldGroup.setAttribute(
      "transform",
      `translate(${state.worldX} ${state.worldY}) scale(${state.worldScale})`
    );

    if (state.hungIndex >= 0) {
      pinToHook(state.hungIndex);
    } else if (!state.placed && !state.dragging) {
      placeFreeCenter();
    }

    render();
  }

  function placeFreeCenter() {
    const bounds = shapeBounds();
    state.angle = (-40 * Math.PI) / 180;
    state.omega = 0;
    const mid = rotatePoint(
      ((bounds.minX + bounds.maxX) / 2) * SHAPE_SCALE,
      ((bounds.minY + bounds.maxY) / 2) * SHAPE_SCALE,
      state.angle
    );
    state.tx = SVG_W / 2 - mid.x;
    state.ty = SVG_H * 0.58 - mid.y;
    state.placed = true;
  }

  function hangFrom(index, { settle = false } = {}) {
    state.hungIndex = index;
    state.omega = 0;
    if (settle) {
      state.angle = hangAngleFor(index);
    }
    pinToHook(index);
  }

  function unhook() {
    if (state.hungIndex < 0) return;
    state.hungIndex = -1;
    state.omega = 0;
  }

  function resetToDefault() {
    state.hungIndex = -1;
    state.omega = 0;
    state.dragging = false;
    state.dragMode = null;
    state.cornerIndex = -1;
    app.classList.remove("is-dragging");
    hideWeightGhost();
    clearGuessResult();
    setTool("move");
    placeFreeCenter();
    render();
  }

  function updateNearHole() {
    if (state.hungIndex >= 0) {
      state.nearIndex = state.hungIndex;
      return;
    }
    const nearest = nearestHoleToHook();
    state.nearIndex = nearest.dist < SNAP * 1.35 ? nearest.index : -1;
  }

  function render() {
    const deg = (state.angle * 180) / Math.PI;
    shapeGroup.setAttribute(
      "transform",
      `translate(${state.tx} ${state.ty}) rotate(${deg}) scale(${SHAPE_SCALE})`
    );

    holesClip.querySelectorAll("circle").forEach((clip) => {
      const hole = HOLES[Number(clip.dataset.index)];
      const world = localToWorld(hole[0], hole[1]);
      clip.setAttribute("cx", world.x);
      clip.setAttribute("cy", world.y);
    });

    updateGuessVisuals();
    updateGuide();
  }

  function step(t) {
    const now = t * 0.001;
    const dt = state.lastT ? Math.min(0.032, now - state.lastT) : 0.016;
    state.lastT = now;

    if (state.hungIndex >= 0 && !state.dragging) {
      const hole = HOLES[state.hungIndex];
      const target = hangAngleFor(state.hungIndex);
      const error = normalizeAngle(state.angle - target);
      const length = Math.max(
        20,
        Math.hypot(centroid.x - hole[0], centroid.y - hole[1]) * SHAPE_SCALE
      );
      state.omega += (-(G / length) * Math.sin(error) - DAMPING * state.omega) * dt;
      state.angle += state.omega * dt;
      if (Math.abs(error) < 0.003 && Math.abs(state.omega) < 0.02) {
        state.angle = target;
        state.omega = 0;
      }
      pinToHook(state.hungIndex);
    }

    updateNearHole();
    render();
    requestAnimationFrame(step);
  }

  function onPointerDown(event) {
    const pointer = pointerFromEvent(event);
    const local = worldToLocal(pointer.x, pointer.y);

    if (state.tool === "pencil") {
      if (!pointOnShapeBody(local.x, local.y)) return;
      event.preventDefault();
      scene.setPointerCapture(event.pointerId);
      startStroke(local);
      return;
    }

    if (state.tool === "guess-cm") {
      event.preventDefault();
      submitGuess(pointer);
      return;
    }

    const hit = hitTest(local);
    if (hit?.kind === "hole" && holeHasWeight(hit.index)) {
      scene.setPointerCapture(event.pointerId);
      beginWeightDrag(event, hit.index);
      return;
    }

    if (!hit) return;

    event.preventDefault();
    scene.setPointerCapture(event.pointerId);
    state.dragging = true;
    state.grabLocal = local;
    state.omega = 0;
    app.classList.add("is-dragging");

    if (hit.kind === "corner") {
      state.dragMode = "reshape";
      state.cornerIndex = hit.index;
      return;
    }

    if (state.hungIndex >= 0) {
      unhook();
    }
    state.dragMode = "move";
  }

  function onPointerMove(event) {
    const pointer = pointerFromEvent(event);

    if (state.drawing) {
      const local = worldToLocal(pointer.x, pointer.y);
      if (pointOnShapeBody(local.x, local.y)) {
        continueStroke(local);
      }
      return;
    }

    if (!state.dragging) return;

    if (state.dragMode === "weight") {
      updateWeightGhost(event);
      return;
    }

    if (state.dragMode === "reshape" && state.cornerIndex >= 0) {
      moveCorner(state.cornerIndex, worldToLocal(pointer.x, pointer.y));
      return;
    }

    if (state.dragMode === "swing" && state.hungIndex >= 0) {
      const hole = HOLES[state.hungIndex];
      const vx = state.grabLocal.x - hole[0];
      const vy = state.grabLocal.y - hole[1];
      const target = Math.atan2(
        pointer.y - HOOK_ATTACH.y,
        pointer.x - HOOK_ATTACH.x
      );
      const localAng = Math.atan2(vy, vx);
      state.angle = target - localAng;
      pinToHook(state.hungIndex);
      return;
    }

    const grabRot = rotatePoint(
      state.grabLocal.x * SHAPE_SCALE,
      state.grabLocal.y * SHAPE_SCALE,
      state.angle
    );
    state.tx = pointer.x - grabRot.x;
    state.ty = pointer.y - grabRot.y;
  }

  function onPointerUp(event) {
    if (state.drawing) {
      if (scene.hasPointerCapture(event.pointerId)) {
        scene.releasePointerCapture(event.pointerId);
      }
      finishStroke();
      return;
    }

    if (!state.dragging) return;
    if (state.dragMode === "weight") {
      if (scene.hasPointerCapture(event.pointerId)) {
        scene.releasePointerCapture(event.pointerId);
      }
      if (weightSupply.hasPointerCapture(event.pointerId)) {
        weightSupply.releasePointerCapture(event.pointerId);
      }
      state.dragging = false;
      app.classList.remove("is-dragging");
      finishWeightDrag();
      return;
    }

    const wasReshape = state.dragMode === "reshape";
    state.dragging = false;
    state.dragMode = null;
    state.cornerIndex = -1;
    app.classList.remove("is-dragging");

    if (wasReshape || state.hungIndex >= 0) return;

    const nearest = nearestHoleToHook();
    if (nearest.dist <= SNAP) {
      hangFrom(nearest.index);
    }
  }

  scene.addEventListener("pointerdown", onPointerDown);
  scene.addEventListener("pointermove", onPointerMove);
  scene.addEventListener("pointerup", onPointerUp);
  scene.addEventListener("pointercancel", onPointerUp);

  guessCmBtn.addEventListener("click", () => {
    setTool(state.tool === "guess-cm" ? "move" : "guess-cm");
  });

  reshapeBtn.addEventListener("click", () => {
    setTool(state.tool === "reshape" ? "move" : "reshape");
  });

  weightSupply.addEventListener("pointerdown", (event) => {
    if (state.tool === "pencil" || state.tool === "guess-cm") return;
    weightSupply.setPointerCapture(event.pointerId);
    beginWeightDrag(event, "supply");
  });
  weightSupply.addEventListener("pointermove", onPointerMove);
  weightSupply.addEventListener("pointerup", onPointerUp);
  weightSupply.addEventListener("pointercancel", onPointerUp);

  pencilBtn.addEventListener("click", () => {
    if (state.tool === "pencil") {
      setTool("move");
      return;
    }
    setTool("pencil");
  });

  clearDrawingsBtn.addEventListener("click", clearDrawings);

  guideBtn.addEventListener("click", () => {
    setGuideOn(!state.guideOn);
  });

  window.addEventListener("resize", layout);

  buildShapePicker();
  applyShape("utvar");
  layout();
  requestAnimationFrame(step);
})();
