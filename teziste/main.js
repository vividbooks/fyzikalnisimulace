(() => {
  const SVG_W = 311;
  const SVG_H = 310;

  const SHAPE_SCALE = 0.7;
  const PEG = { x: 163.5, y: 44, r: 7 * SHAPE_SCALE };
  const HOOK_ATTACH = { x: PEG.x, y: PEG.y };

  const HOLE_R = 8;
  const WEIGHT_SHARE = 0.22;
  const WEIGHT_SNAP = HOLE_R * 4.4;
  const SNAP = 14 * SHAPE_SCALE;
  const G = 1800;
  const DAMPING = 2.4;
  const DRAW_MIN_DIST = 0.8;
  const CORNER_R = 6.4;
  const CORNER_HIT = 16;
  const HANDLE_R = 34;
  const HANDLE_DISK_R = 22;
  const HOLE_CLICK_MOVE = 10;
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

  /** Střed útvaru bez závaží — úchyt teček se po přidání závaží nehýbe. */
  function shapeGeometryOrigin() {
    if (!currentShape || currentShape.empty) return null;
    if (currentShape.kind === "circle") {
      return { x: currentShape.cx, y: currentShape.cy };
    }
    if (VERTICES.length >= 3) {
      const poly = polygonCentroid(VERTICES);
      if (Number.isFinite(poly.x) && Number.isFinite(poly.y)) return poly;
    }
    const bounds = currentShape.bounds;
    if (!bounds) return null;
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
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

  const CUSTOM_ID = "vlastni";
  const CUSTOM_FILL = "#38bdf8";
  const CUSTOM_STROKE = "#0284c7";

  function createEmptyCustomShape() {
    return {
      id: CUSTOM_ID,
      label: "Vlastní",
      kind: "path",
      fill: CUSTOM_FILL,
      stroke: CUSTOM_STROKE,
      path: "",
      vertices: [],
      liveVertices: [],
      holes: [],
      liveHoles: [],
      weights: [],
      centroid: { x: 156, y: 168 },
      bounds: { minX: 40, minY: 40, maxX: 270, maxY: 270 },
      empty: true,
    };
  }

  let customShape = createEmptyCustomShape();

  const scene = document.getElementById("scene");
  const workspace = document.getElementById("workspace");
  const worldGroup = document.getElementById("world");
  const shapeGroup = document.getElementById("shape-group");
  const shapeBody = document.getElementById("shape-body");
  const shapeStroke = document.getElementById("shape-stroke");
  const shapeClipPath = document.getElementById("shape-clip-path");
  const drawingsGroup = document.getElementById("drawings");
  const dragHandleGroup = document.getElementById("drag-handle");
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
  const showCmBtn = document.getElementById("tool-show-cm");
  const reshapeBtn = document.getElementById("tool-reshape");
  const pencilBtn = document.getElementById("tool-pencil");
  const drawShapeBtn = document.getElementById("tool-draw-shape");
  const newShapeBtn = document.getElementById("tool-new-shape");
  const resetBtn = document.getElementById("tool-reset");
  const draftPath = document.getElementById("draft-path");
  const drawConfirm = document.getElementById("draw-confirm");
  const drawConfirmOk = document.getElementById("draw-confirm-ok");
  const drawConfirmCancel = document.getElementById("draw-confirm-cancel");
  const hintEl = document.getElementById("hintEl");
  const builderModeSwitch = document.getElementById("builder-mode-switch");
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
    pointerStart: null,
    holeClickIndex: -1,
    cornerIndex: -1,
    nearIndex: -1,
    lastT: 0,
    placed: false,
    tool: "move",
    drawing: false,
    currentStroke: null,
    strokePoints: [],
    guessResult: null,
    cmVisible: false,
    guideOn: false,
    weightFrom: null,
    weightSnap: -1,
    weightCarry: false,
    appMode: "gallery",
    lastGalleryShapeId: "utvar",
    hintDismissed: false,
    drawingShape: false,
    draftPoints: [],
    pendingCustom: null,
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

  function raySegmentHit(origin, dir, x1, y1, x2, y2) {
    const sx = x2 - x1;
    const sy = y2 - y1;
    const denom = dir.x * sy - dir.y * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const ox = x1 - origin.x;
    const oy = y1 - origin.y;
    const t = (ox * sy - oy * sx) / denom;
    const u = (ox * dir.y - oy * dir.x) / denom;
    if (t >= 1e-4 && u >= 0 && u <= 1) {
      return {
        t,
        point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t },
      };
    }
    return null;
  }

  function normalizeDir(dx, dy, fallback = { x: 0, y: 1 }) {
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return fallback;
    return { x: dx / len, y: dy / len };
  }

  /** Vizuál teček: ~8 px do stran, ~11 px nahoru/dolů. */
  const HANDLE_INSET = 28;

  function insetFromBoundary(point, origin) {
    const inward = normalizeDir(origin.x - point.x, origin.y - point.y);
    const reach = Math.hypot(origin.x - point.x, origin.y - point.y);
    const pad = Math.min(HANDLE_INSET, Math.max(0, reach * 0.62));
    let x = point.x + inward.x * pad;
    let y = point.y + inward.y * pad;
    for (let i = 0; i < 12 && !pointOnShapeBody(x, y); i += 1) {
      x += inward.x * 2;
      y += inward.y * 2;
      if (Math.hypot(origin.x - x, origin.y - y) < 4) break;
    }
    return pointOnShapeBody(x, y) ? { x, y } : null;
  }

  function rayPolygonBoundary(origin, dir, verts) {
    let bestT = Infinity;
    let best = null;
    for (let i = 0; i < verts.length; i += 1) {
      const [x1, y1] = verts[i];
      const [x2, y2] = verts[(i + 1) % verts.length];
      const hit = raySegmentHit(origin, dir, x1, y1, x2, y2);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
        best = hit.point;
      }
    }
    return best ? insetFromBoundary(best, origin) : null;
  }

  function rayCircleBoundary(origin, dir, cx, cy, r) {
    const ox = origin.x - cx;
    const oy = origin.y - cy;
    const b = 2 * (ox * dir.x + oy * dir.y);
    const c = ox * ox + oy * oy - r * r;
    const disc = b * b - 4 * c;
    if (disc < 0) return null;
    const sqrt = Math.sqrt(disc);
    let t = (-b + sqrt) / 2;
    if (t <= 1e-4) t = (-b - sqrt) / 2;
    if (t <= 1e-4) return null;
    return insetFromBoundary(
      { x: origin.x + dir.x * t, y: origin.y + dir.y * t },
      origin
    );
  }

  function boundaryPointAlongRay(origin, dir) {
    if (!currentShape || currentShape.empty) return null;
    if (currentShape.kind === "circle") {
      return rayCircleBoundary(
        origin,
        dir,
        currentShape.cx,
        currentShape.cy,
        currentShape.r
      );
    }
    if (VERTICES.length >= 3) {
      return rayPolygonBoundary(origin, dir, VERTICES);
    }
    return null;
  }

  function handleEdgeDirections(origin) {
    const bounds = currentShape.bounds || shapeBounds();
    const targets = [
      { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
      { x: bounds.maxX, y: bounds.maxY },
      { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 },
      { x: bounds.minX, y: bounds.maxY },
      { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
    ];
    const dirs = targets.map((target) =>
      normalizeDir(target.x - origin.x, target.y - origin.y)
    );
    dirs.push({ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 });
    return dirs;
  }

  function circleHandleAnchor() {
    const cx = currentShape.cx;
    const cy = currentShape.cy;
    const innerR = CIRCLE_RING - HOLE_R - 14;
    const radius = Math.max(18, innerR * 0.62);
    const dir = normalizeDir(1, 0.35);
    return { x: cx + dir.x * radius, y: cy + dir.y * radius };
  }

  function handleAnchor() {
    if (!currentShape || currentShape.empty) return null;
    if (currentShape.kind === "circle") return circleHandleAnchor();
    let origin = shapeGeometryOrigin();
    if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return null;
    if (!pointInShape(origin.x, origin.y) && currentShape.bounds) {
      origin = {
        x: (currentShape.bounds.minX + currentShape.bounds.maxX) / 2,
        y: (currentShape.bounds.minY + currentShape.bounds.maxY) / 2,
      };
    }

    let best = null;
    let bestDist = -1;
    for (const dir of handleEdgeDirections(origin)) {
      const edge = boundaryPointAlongRay(origin, dir);
      if (!edge) continue;
      const dist = Math.hypot(edge.x - origin.x, edge.y - origin.y);
      if (dist > bestDist) {
        bestDist = dist;
        best = edge;
      }
    }
    return best;
  }

  function rebuildDragHandle() {
    dragHandleGroup.replaceChildren();
    const disk = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    disk.classList.add("drag-handle-disk");
    disk.setAttribute("r", String(HANDLE_DISK_R));

    const dots = document.createElementNS("http://www.w3.org/2000/svg", "g");
    dots.classList.add("drag-handle-dots");
    const cols = [-5.2, 5.2];
    const rows = [-8.2, 0, 8.2];
    rows.forEach((y) => {
      cols.forEach((x) => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.classList.add("drag-handle-dot");
        dot.setAttribute("cx", String(x));
        dot.setAttribute("cy", String(y));
        dot.setAttribute("r", "2.6");
        dots.append(dot);
      });
    });

    dragHandleGroup.append(disk, dots);
  }

  function syncDragHandle() {
    const hide =
      !currentShape ||
      currentShape.empty ||
      state.tool === "pencil" ||
      state.tool === "guess-cm" ||
      state.tool === "draw-shape";
    const point = hide ? null : handleAnchor();
    if (!point) {
      dragHandleGroup.classList.add("is-hidden");
      return;
    }
    dragHandleGroup.classList.remove("is-hidden");
    dragHandleGroup.setAttribute("transform", `translate(${point.x} ${point.y})`);
    const fill = currentShape.fill || "#f06d6d";
    dragHandleGroup.style.color = mixHex(fill, "#1d1d1b", 0.4);
  }

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
    const scale = (HOLE_R * 1.55) / 18.25;
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

  function nearestFreeHole(local) {
    let best = -1;
    let bestDist = Infinity;
    HOLES.forEach((hole, index) => {
      if (holeHasWeight(index) && index !== state.weightFrom) return;
      const dist = Math.hypot(local.x - hole[0], local.y - hole[1]);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return { index: best, dist: bestDist };
  }

  function resolveWeightSnap(local) {
    const nearest = nearestFreeHole(local);
    if (nearest.index < 0) return -1;
    if (nearest.dist <= WEIGHT_SNAP) return nearest.index;
    if (pointInShape(local.x, local.y)) return nearest.index;
    return -1;
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

  function cancelWeightCarry() {
    state.weightCarry = false;
    state.dragging = false;
    state.dragMode = state.dragMode === "weight" ? null : state.dragMode;
    state.weightFrom = null;
    state.weightSnap = -1;
    hideWeightGhost();
    app.classList.remove("is-dragging", "is-carrying-weight");
    weightSupply.classList.remove("is-armed");
    if (state.hungIndex < 0 && !state.hintDismissed) {
      syncSceneHint();
    } else {
      hintEl?.classList.add("is-hidden");
    }
  }

  function showWeightHint() {
    if (!hintEl || state.pendingCustom) return;
    hintEl.textContent = "Polož závaží na otvor.";
    hintEl.classList.remove("sim-empty-hint--top", "is-hidden");
  }

  function armWeightCarry(event) {
    state.weightCarry = true;
    state.dragging = false;
    state.dragMode = "weight";
    state.weightFrom = "supply";
    app.classList.remove("is-dragging");
    app.classList.add("is-carrying-weight", "is-dragging-weight");
    weightSupply.classList.add("is-armed");
    showWeightHint();
    if (event) updateWeightGhost(event);
  }

  function placeWeightGhost(x, y, snapped) {
    weightGhost.hidden = false;
    weightGhost.classList.toggle("is-snapped", snapped);
    weightGhost.style.left = `${x}px`;
    weightGhost.style.top = `${y}px`;
  }

  function beginWeightDrag(event, from) {
    event.preventDefault();
    const pointer = pointerFromEvent(event);
    state.dragging = true;
    state.dragMode = "weight";
    state.weightFrom = from;
    state.weightSnap = -1;
    state.weightCarry = false;
    state.pointerStart = pointer;
    if (typeof from === "number") {
      removeWeight(from);
    }
    app.classList.add("is-dragging");
    app.classList.add("is-dragging-weight");
    weightSupply.classList.toggle("is-armed", from === "supply");
    updateWeightGhost(event);
  }

  function updateWeightGhost(event) {
    const pointer = pointerFromEvent(event);
    const local = worldToLocal(pointer.x, pointer.y);
    const snap = resolveWeightSnap(local);

    if (snap >= 0) {
      state.weightSnap = snap;
      const hole = HOLES[snap];
      const world = localToWorld(hole[0], hole[1]);
      const screen = worldToScreen(world.x, world.y);
      const rect = scene.getBoundingClientRect();
      placeWeightGhost(rect.left + screen.x, rect.top + screen.y, true);
      setHoleSnap(snap);
      return;
    }

    state.weightSnap = -1;
    clearHoleSnaps();
    placeWeightGhost(event.clientX, event.clientY, false);
  }

  function finishWeightDrag(event) {
    const snap = state.weightSnap;
    const from = state.weightFrom;
    const start = state.pointerStart;
    let moved = Infinity;
    if (event && start) {
      const pointer = pointerFromEvent(event);
      moved = Math.hypot(pointer.x - start.x, pointer.y - start.y);
    }

    if (snap >= 0) {
      addWeight(snap);
      cancelWeightCarry();
      return;
    }

    if (from === "supply" && moved <= HOLE_CLICK_MOVE) {
      armWeightCarry(event);
      return;
    }

    cancelWeightCarry();
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
    return (
      shape &&
      !shape.empty &&
      shape.kind === "polygon" &&
      shape.vertices.length >= 3 &&
      shape.vertices.length <= 20
    );
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
    if (!currentShape || currentShape.empty) {
      syncDragHandle();
      return;
    }
    if (
      (currentShape.kind === "polygon" || currentShape.kind === "path") &&
      VERTICES.length < 3
    ) {
      return;
    }
    const path =
      currentShape.kind === "polygon" ? polygonPath(VERTICES) : currentShape.path;
    if (currentShape.kind === "polygon") {
      currentShape.path = path;
      currentShape.bounds = boundsOf(VERTICES);
      placeHolesAtVertices();
    } else if (currentShape.kind === "path") {
      currentShape.bounds = boundsOf(VERTICES);
    }
    updateCentroid();
    const holeCuts = HOLES.map(([x, y]) => circlePath(x, y, HOLE_R)).join("");
    shapeBody.setAttribute("d", path + holeCuts);
    shapeStroke.setAttribute("d", path);
    shapeClipPath.setAttribute("d", path + holeCuts);
    shapeClipPath.setAttribute("fill-rule", "evenodd");
    syncCornerHandles();
    syncDragHandle();
  }

  function applyShape(id) {
    const next = id === CUSTOM_ID ? customShape : SHAPES.find((item) => item.id === id);
    if (!next) return;

    currentShape = next;
    app.dataset.shapeReady = next.empty ? "false" : "true";
    if (next.empty) {
      VERTICES = [];
      HOLES = [];
      centroid = { x: 156, y: 168 };
      shapeBody.setAttribute("d", "");
      shapeStroke.setAttribute("d", "");
      shapeClipPath.setAttribute("d", "");
      holesGroup.replaceChildren();
      cornersGroup.replaceChildren();
      holesClip.replaceChildren();
      weightsGroup.replaceChildren();
      cancelWeightCarry();
      syncDragHandle();
      app.style.setProperty("--shape-fill", next.fill);
      app.style.setProperty("--shape-stroke", next.stroke);
      app.dataset.shape = next.id;
      updateReshapeButton();
      document.querySelectorAll("[data-shape]").forEach((btn) => {
        btn.classList.remove("is-active");
        btn.setAttribute("aria-pressed", "false");
      });
      return;
    }
    if (next.kind === "polygon" || next.kind === "path") {
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
    centroid = next.kind === "circle" ? next.centroid : polygonCentroid(VERTICES);
    if (next.kind === "polygon") {
      next.centroid = centroid;
      next.bounds = boundsOf(VERTICES);
      next.path = polygonPath(VERTICES);
    } else if (next.kind === "path") {
      next.centroid = centroid;
      next.bounds = boundsOf(VERTICES);
      if (!next.path) next.path = catmullRomClosedPath(VERTICES);
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
    if (id !== CUSTOM_ID) state.lastGalleryShapeId = id;
    if (currentShape && currentShape.id === id && !currentShape.empty) return;
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
    const picker = document.getElementById("gallery-preset-list");
    picker.replaceChildren();

    SHAPES.forEach((shape) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-preset-btn";
      button.dataset.shape = shape.id;
      button.title = shape.label;
      button.setAttribute("aria-label", shape.label);
      button.setAttribute("aria-pressed", "false");

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("shape-thumb", "gallery-preset-btn__schema");
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

  function capturePointer(target, event) {
    try {
      target.setPointerCapture(event.pointerId);
    } catch (_) {
      /* synthetic events cannot capture */
    }
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
    if (tool === "draw-shape" && state.appMode !== "lab") {
      tool = "move";
    }
    if (tool !== "guess-cm") {
      clearGuessResult();
    } else {
      dismissSceneHint();
      setCmVisible(false);
    }
    if (tool !== "move" && (state.weightCarry || state.dragMode === "weight")) {
      cancelWeightCarry();
    }
    state.tool = tool;
    app.dataset.tool = tool;
    guessCmBtn.classList.toggle("is-active", tool === "guess-cm");
    guessCmBtn.setAttribute("aria-pressed", String(tool === "guess-cm"));
    reshapeBtn.classList.toggle("is-active", tool === "reshape");
    reshapeBtn.setAttribute("aria-pressed", String(tool === "reshape"));
    pencilBtn.classList.toggle("is-active", tool === "pencil");
    pencilBtn.setAttribute("aria-pressed", String(tool === "pencil"));
    if (drawShapeBtn) {
      drawShapeBtn.classList.toggle("is-active", tool === "draw-shape");
      drawShapeBtn.setAttribute("aria-pressed", String(tool === "draw-shape"));
    }
    syncShowCmButton();
    syncDragHandle();
  }

  function syncBuilderModeSwitch() {
    if (!builderModeSwitch) return;
    builderModeSwitch.querySelectorAll("[data-builder-mode]").forEach((btn) => {
      const on = btn.dataset.builderMode === state.appMode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  const DRAW_OWN_HINT = "Nakresli vlastní útvar.";
  const SCENE_HINT_HIDE_MS = 3000;
  let sceneHintHideTimer = 0;

  function clearSceneHintTimer() {
    if (!sceneHintHideTimer) return;
    clearTimeout(sceneHintHideTimer);
    sceneHintHideTimer = 0;
  }

  function syncSceneHint() {
    if (!hintEl) return;
    clearSceneHintTimer();
    if (state.hintDismissed) {
      hintEl.classList.add("is-hidden");
      return;
    }
    if (state.pendingCustom) {
      hintEl.classList.add("is-hidden");
      return;
    } else if (state.appMode === "lab" && customShape.empty) {
      hintEl.textContent = DRAW_OWN_HINT;
    } else {
      hintEl.textContent = "Pověs útvar na hřebík.";
    }
    hintEl.classList.toggle(
      "sim-empty-hint--top",
      hintEl.textContent === DRAW_OWN_HINT
    );
    hintEl.classList.remove("is-hidden");
    if (hintEl.textContent === DRAW_OWN_HINT) {
      sceneHintHideTimer = setTimeout(() => {
        hintEl.classList.add("is-hidden");
        sceneHintHideTimer = 0;
      }, SCENE_HINT_HIDE_MS);
    }
  }

  function dismissSceneHint() {
    clearSceneHintTimer();
    state.hintDismissed = true;
    hintEl?.classList.add("is-hidden");
  }

  function setAppMode(mode) {
    if (state.appMode === mode) return;
    state.appMode = mode;
    app.dataset.appMode = mode;
    syncBuilderModeSwitch();
    clearDraft();
    state.hintDismissed = false;
    if (mode === "gallery") {
      if (state.tool === "draw-shape") {
        setTool("move");
      }
      selectShape(state.lastGalleryShapeId);
    } else if (customShape.empty) {
      applyShape(CUSTOM_ID);
      clearDrawings();
      resetToDefault();
      setTool("draw-shape");
    } else {
      applyShape(CUSTOM_ID);
      clearDrawings();
      resetToDefault();
    }
    syncSceneHint();
  }

  function pointLineDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) return Math.hypot(point.x - start.x, point.y - start.y);
    return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / length;
  }

  function simplifyPolyline(points, epsilon) {
    if (points.length < 3) return points.slice();
    let maxDist = 0;
    let index = 0;
    const start = points[0];
    const end = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i += 1) {
      const dist = pointLineDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > epsilon) {
      const left = simplifyPolyline(points.slice(0, index + 1), epsilon);
      const right = simplifyPolyline(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [start, end];
  }

  function pathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i += 1) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return length;
  }

  function resampleClosed(points, count) {
    const closed = points.slice();
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) > 1) {
      closed.push({ x: first.x, y: first.y });
    }
    const total = pathLength(closed);
    if (total < 1) return null;
    const step = total / count;
    const result = [];
    let traveled = 0;
    let index = 1;
    let prev = closed[0];
    result.push([prev.x, prev.y]);
    while (result.length < count && index < closed.length) {
      const next = closed[index];
      const seg = Math.hypot(next.x - prev.x, next.y - prev.y);
      if (traveled + seg >= step) {
        const t = (step - traveled) / seg;
        const x = prev.x + (next.x - prev.x) * t;
        const y = prev.y + (next.y - prev.y) * t;
        result.push([x, y]);
        prev = { x, y };
        traveled = 0;
      } else {
        traveled += seg;
        prev = next;
        index += 1;
      }
    }
    return result.length >= 5 ? result : null;
  }

  function catmullRomClosedPath(verts) {
    const n = verts.length;
    if (n < 3) return polygonPath(verts);
    const fmt = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
    let d = `M${fmt(verts[0][0], verts[0][1])}`;
    for (let i = 0; i < n; i += 1) {
      const p0 = verts[(i - 1 + n) % n];
      const p1 = verts[i];
      const p2 = verts[(i + 1) % n];
      const p3 = verts[(i + 2) % n];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${fmt(c1x, c1y)} ${fmt(c2x, c2y)} ${fmt(p2[0], p2[1])}`;
    }
    return `${d}Z`;
  }

  function catmullRomOpenPath(points) {
    if (!points.length) return "";
    if (points.length === 1) {
      return `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    }
    if (points.length === 2) {
      return `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}L${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`;
    }
    const pts = points.map((point) => [point.x, point.y]);
    const fmt = (x, y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
    let d = `M${fmt(pts[0][0], pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${fmt(c1x, c1y)} ${fmt(c2x, c2y)} ${fmt(p2[0], p2[1])}`;
    }
    return d;
  }

  function keepClosedStroke(points) {
    if (points.length < 8 || pathLength(points) < 36) return null;
    const pts = points.map((point) => ({ x: point.x, y: point.y }));
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < 28) {
      pts.pop();
    }
    const simplified = simplifyPolyline(pts, 1.6);
    if (simplified.length < 8) {
      return resampleClosed(pts, Math.max(24, Math.round(pathLength(pts) / 8)));
    }
    return simplified.map((point) => [point.x, point.y]);
  }

  function fitVertices(verts) {
    const bounds = boundsOf(verts);
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(180 / width, 180 / height);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return verts.map(([x, y]) => [156 + (x - cx) * scale, 168 + (y - cy) * scale]);
  }

  function makeHolesForCustom(verts) {
    const ring =
      resampleClosed(
        verts.map(([x, y]) => ({ x, y })),
        6
      ) ||
      [0, 1, 2, 3, 4, 5].map((i) => verts[Math.floor((i * verts.length) / 6)]);
    const holes = [];
    for (let i = 0; i < ring.length; i += 1) {
      const origin = ring[i];
      const inward = vertexInward(ring, i);
      let x = origin[0] + inward.x * (HOLE_R + 12);
      let y = origin[1] + inward.y * (HOLE_R + 12);
      if (!pointInPolygon(x, y, verts)) {
        x = origin[0] + inward.x * (HOLE_R + 8);
        y = origin[1] + inward.y * (HOLE_R + 8);
      }
      holes.push([x, y]);
    }
    return holes;
  }

  function updateDraftPath(pending = false) {
    if (!draftPath) return;
    if (!state.draftPoints.length) {
      draftPath.setAttribute("d", "");
      draftPath.removeAttribute("hidden");
      draftPath.classList.remove("is-pending", "is-visible");
      return;
    }
    draftPath.removeAttribute("hidden");
    draftPath.classList.add("is-visible");
    draftPath.classList.toggle("is-pending", pending);
    const d = pending
      ? catmullRomClosedPath(state.pendingCustom || [])
      : catmullRomOpenPath(state.draftPoints);
    draftPath.setAttribute("d", d);
  }

  function clearDraft() {
    state.drawingShape = false;
    state.draftPoints = [];
    state.pendingCustom = null;
    app.classList.remove("is-drawing");
    updateDraftPath();
    if (drawConfirm) drawConfirm.hidden = true;
    if (shapeGroup) shapeGroup.removeAttribute("opacity");
  }

  function startShapeDraft(world) {
    clearDraft();
    state.drawingShape = true;
    state.draftPoints = [{ x: world.x, y: world.y }];
    updateDraftPath();
    app.classList.add("is-drawing");
    if (shapeGroup) shapeGroup.setAttribute("opacity", "0.22");
    clearSceneHintTimer();
    hintEl?.classList.add("is-hidden");
  }

  function continueShapeDraft(world) {
    const last = state.draftPoints[state.draftPoints.length - 1];
    if (!last || Math.hypot(world.x - last.x, world.y - last.y) < 1.2) return;
    state.draftPoints.push({ x: world.x, y: world.y });
    updateDraftPath();
  }

  function finishShapeDraft() {
    state.drawingShape = false;
    app.classList.remove("is-drawing");
    const verts = keepClosedStroke(state.draftPoints);
    const area = verts ? Math.abs(polygonArea(verts)) : 0;
    if (!verts || area < MIN_SHAPE_AREA * 0.12) {
      clearDraft();
      state.hintDismissed = false;
      if (hintEl) {
        hintEl.textContent = "Nakresli větší uzavřený útvar.";
        hintEl.classList.remove("sim-empty-hint--top", "is-hidden");
      }
      return;
    }
    state.pendingCustom = verts;
    updateDraftPath(true);
    if (drawConfirm) drawConfirm.hidden = false;
    state.hintDismissed = false;
    syncSceneHint();
  }

  function commitPendingCustom() {
    if (!state.pendingCustom) return;
    const fitted = fitVertices(state.pendingCustom);
    const holes = makeHolesForCustom(fitted);
    customShape = {
      id: CUSTOM_ID,
      label: "Vlastní",
      kind: "path",
      fill: CUSTOM_FILL,
      stroke: CUSTOM_STROKE,
      path: catmullRomClosedPath(fitted),
      vertices: fitted.map((vertex) => [vertex[0], vertex[1]]),
      liveVertices: fitted.map((vertex) => [vertex[0], vertex[1]]),
      holes: holes.map((hole) => [hole[0], hole[1]]),
      liveHoles: holes.map((hole) => [hole[0], hole[1]]),
      holeBindings: null,
      weights: [],
      centroid: polygonCentroid(fitted),
      bounds: boundsOf(fitted),
      empty: false,
      edited: true,
    };
    clearDraft();
    applyShape(CUSTOM_ID);
    clearDrawings();
    resetToDefault();
    state.hintDismissed = false;
    syncSceneHint();
  }

  function startNewCustomShape() {
    customShape = createEmptyCustomShape();
    clearDraft();
    applyShape(CUSTOM_ID);
    clearDrawings();
    resetToDefault();
    setTool("draw-shape");
    state.hintDismissed = false;
    syncSceneHint();
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

  let confettiBurst = null;
  let confettiRaf = 0;

  function confettiContext() {
    if (!confettiLayer || confettiLayer.getContext == null) return null;
    return confettiLayer.getContext("2d");
  }

  function resizeConfettiCanvas() {
    if (!confettiLayer || confettiLayer.getContext == null) return { w: 0, h: 0, dpr: 1 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = confettiLayer.clientWidth;
    const h = confettiLayer.clientHeight;
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (confettiLayer.width !== pw || confettiLayer.height !== ph) {
      confettiLayer.width = pw;
      confettiLayer.height = ph;
    }
    return { w, h, dpr };
  }

  function spawnConfettiBurst(particles, cx, cy, colors, strength) {
    const count = Math.round(58 * strength);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (220 + Math.random() * 480) * strength;
      particles.push({
        x: cx + (Math.random() - 0.5) * 36 * strength,
        y: cy + (Math.random() - 0.5) * 36 * strength,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60 * strength,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 14,
        life: 2.4 + Math.random() * 1.8,
        w: (8 + Math.random() * 12) * strength,
        h: (5 + Math.random() * 8) * strength,
        kind: Math.random() < 0.22 ? "star" : "rect",
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  function drawConfettiParticle(ctx, p) {
    ctx.globalAlpha = Math.min(1, p.life);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    if (p.kind === "star") {
      const r = p.w * 0.55;
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = p.rot + (i * Math.PI * 2) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        const ia = a + Math.PI / 5;
        ctx.lineTo(Math.cos(ia) * r * 0.42, Math.sin(ia) * r * 0.42);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function stopConfetti() {
    confettiBurst = null;
    if (confettiRaf) {
      cancelAnimationFrame(confettiRaf);
      confettiRaf = 0;
    }
    const ctx = confettiContext();
    if (ctx) ctx.clearRect(0, 0, confettiLayer.width, confettiLayer.height);
  }

  function tickConfetti(ts) {
    if (!confettiBurst) {
      confettiRaf = 0;
      return;
    }

    const dt = confettiBurst.lastTs
      ? Math.min(0.05, (ts - confettiBurst.lastTs) / 1000)
      : 1 / 60;
    confettiBurst.lastTs = ts;
    confettiBurst.time += dt;
    confettiBurst.flash = Math.max(0, confettiBurst.flash - dt * 1.6);
    confettiBurst.pendingBursts = confettiBurst.pendingBursts.filter((burst) => {
      if (confettiBurst.time >= burst.at) {
        spawnConfettiBurst(
          confettiBurst.particles,
          confettiBurst.cx,
          confettiBurst.cy,
          confettiBurst.colors,
          burst.strength
        );
        return false;
      }
      return true;
    });

    for (const ring of confettiBurst.rings) {
      if (ring.delay > 0) {
        ring.delay -= dt;
        continue;
      }
      ring.r += ring.speed * dt;
      ring.life -= dt * 0.95;
    }
    confettiBurst.rings = confettiBurst.rings.filter((ring) => ring.life > 0);

    for (const p of confettiBurst.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      p.vx *= 0.988;
      p.rot += p.spin * dt;
      p.life -= dt;
    }
    confettiBurst.particles = confettiBurst.particles.filter((p) => p.life > 0);

    const { w, h, dpr } = resizeConfettiCanvas();
    const ctx = confettiContext();
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const { particles, rings, flash, cx, cy } = confettiBurst;
      if (flash > 0) {
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55);
        glow.addColorStop(0, `rgba(255, 255, 255, ${flash * 0.55})`);
        glow.addColorStop(0.35, `rgba(251, 191, 36, ${flash * 0.35})`);
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }
      for (const ring of rings) {
        if (ring.delay > 0 || ring.life <= 0) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251, 191, 36, ${ring.life * 0.75})`;
        ctx.lineWidth = ring.width * ring.life;
        ctx.stroke();
      }
      for (const p of particles) {
        if (p.life <= 0) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        drawConfettiParticle(ctx, p);
        ctx.restore();
      }
    }

    if (
      confettiBurst.time >= confettiBurst.duration &&
      confettiBurst.particles.length === 0
    ) {
      stopConfetti();
      return;
    }
    confettiRaf = requestAnimationFrame(tickConfetti);
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
      "#fbbf24",
      "#fde047",
    ];

    const particles = [];
    spawnConfettiBurst(particles, origin.x, origin.y, colors, 1);
    confettiBurst = {
      particles,
      rings: [
        { r: 0, life: 1, speed: 520, width: 5 },
        { r: 0, life: 1, speed: 380, width: 3, delay: 0.08 },
      ],
      pendingBursts: [
        { at: 0.14, strength: 0.9 },
        { at: 0.32, strength: 0.75 },
      ],
      cx: origin.x,
      cy: origin.y,
      colors,
      time: 0,
      duration: 4.8,
      flash: 1.35,
      lastTs: 0,
    };
    if (!confettiRaf) confettiRaf = requestAnimationFrame(tickConfetti);
  }

  function setCmVisible(visible) {
    if (visible && state.tool === "guess-cm") visible = false;
    state.cmVisible = visible;
    if (showCmBtn) {
      showCmBtn.classList.toggle("is-active", visible);
      showCmBtn.setAttribute("aria-pressed", String(visible));
    }
    updateGuessVisuals();
  }

  function syncShowCmButton() {
    if (!showCmBtn) return;
    const blocked = state.tool === "guess-cm";
    showCmBtn.disabled = blocked;
    showCmBtn.setAttribute("aria-disabled", String(blocked));
  }

  function clearGuessResult() {
    state.guessResult = null;
    guessLayer.replaceChildren();
    guessLayer.removeAttribute("hidden");
    guessLayer.classList.remove("is-visible");
    guessFeedback.hidden = true;
    guessFeedback.classList.remove("is-hit");
    guessFeedback.textContent = "";
    stopConfetti();
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

  function worldToView(wx, wy) {
    return {
      x: state.worldX + wx * state.worldScale,
      y: state.worldY + wy * state.worldScale,
    };
  }

  function createCross(x, y, className, color, size = 12) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add(className);
    group.setAttribute("transform", `translate(${x} ${y})`);

    const ink = color || "#1d1d1b";
    const halo = ink === "#ffffff" ? "#1d1d1b" : "#ffffff";
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
      outline.setAttribute("stroke-width", "4.2");
      group.append(outline);
    });

    arms.forEach(([x1, y1, x2, y2]) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("stroke", ink);
      line.setAttribute("stroke-width", "2.1");
      group.append(line);
    });

    return group;
  }

  function createGuessLabel(x, y, text, fill, stroke) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("guess-label");
    group.setAttribute("transform", `translate(${x + 14} ${y - 14})`);

    const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const width = Math.max(64, text.length * 8.4 + 16);
    box.setAttribute("x", 0);
    box.setAttribute("y", -14);
    box.setAttribute("width", width);
    box.setAttribute("height", 22);
    box.setAttribute("rx", 11);
    box.setAttribute("fill", fill);
    box.setAttribute("stroke", stroke);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", 8);
    label.setAttribute("y", 2);
    label.setAttribute("fill", stroke);
    label.textContent = text;

    group.append(box, label);
    return group;
  }

  function updateGuessVisuals() {
    const showGuess =
      state.guessResult && state.tool === "guess-cm";
    if (!showGuess && !state.cmVisible) {
      guessLayer.removeAttribute("hidden");
      guessLayer.classList.remove("is-visible");
      guessLayer.replaceChildren();
      return;
    }

    guessLayer.removeAttribute("hidden");
    guessLayer.classList.add("is-visible");
    guessLayer.replaceChildren();

    if (state.cmVisible) {
      const actual = localToWorld(centroid.x, centroid.y);
      const actualView = worldToView(actual.x, actual.y);
      guessLayer.append(createCross(actualView.x, actualView.y, "cm-cross", "#22c55e"));
    }

    if (showGuess) {
      const guess = state.guessResult;
      const guessView = worldToView(guess.guessX, guess.guessY);
      const guessInk = contrastInk(colorBehindWorld(guess.guessX, guess.guessY));
      guessLayer.append(createCross(guessView.x, guessView.y, "guess-cross", guessInk));
    }
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
    const handle = handleAnchor();
    if (
      handle &&
      Math.hypot(local.x - handle.x, local.y - handle.y) <= HANDLE_R
    ) {
      return { kind: "handle" };
    }
    if (pointInShape(local.x, local.y)) {
      return { kind: "body" };
    }
    return null;
  }

  function layout() {
    const host = workspace || scene;
    const rect = host.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
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
    dismissSceneHint();
  }

  function unhook() {
    if (state.hungIndex < 0) return;
    state.hungIndex = -1;
    state.omega = 0;
  }

  function clearAllWeights() {
    if (!currentShape) return;
    currentShape.weights = [];
    rebuildWeights();
    updateCentroid();
  }

  function resetToDefault() {
    state.hungIndex = -1;
    state.omega = 0;
    state.dragging = false;
    state.dragMode = null;
    state.cornerIndex = -1;
    cancelWeightCarry();
    clearAllWeights();
    app.classList.remove("is-dragging");
    clearGuessResult();
    setCmVisible(false);
    setTool(state.appMode === "lab" && currentShape?.empty ? "draw-shape" : "move");
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
    syncDragHandle();
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

    if (state.tool === "draw-shape") {
      if (state.pendingCustom) return;
      event.preventDefault();
      capturePointer(scene, event);
      startShapeDraft(pointer);
      return;
    }

    if (currentShape?.empty) return;

    if (state.tool === "pencil") {
      if (!pointOnShapeBody(local.x, local.y)) return;
      event.preventDefault();
      capturePointer(scene, event);
      startStroke(local);
      return;
    }

    if (state.tool === "guess-cm") {
      event.preventDefault();
      submitGuess(pointer);
      return;
    }

    if (state.weightCarry) {
      event.preventDefault();
      const carryHit = hitTest(local);
      if (carryHit?.kind === "hole" && !holeHasWeight(carryHit.index)) {
        addWeight(carryHit.index);
        cancelWeightCarry();
        return;
      }
      if (carryHit?.kind === "hole" && holeHasWeight(carryHit.index)) {
        cancelWeightCarry();
        capturePointer(scene, event);
        beginWeightDrag(event, carryHit.index);
        return;
      }
      cancelWeightCarry();
      return;
    }

    const hit = hitTest(local);
    if (hit?.kind === "hole" && holeHasWeight(hit.index)) {
      capturePointer(scene, event);
      beginWeightDrag(event, hit.index);
      return;
    }

    if (!hit) return;

    event.preventDefault();
    capturePointer(scene, event);
    state.dragging = true;
    state.grabLocal = local;
    state.omega = 0;
    app.classList.add("is-dragging");

    if (hit.kind === "corner") {
      state.dragMode = "reshape";
      state.cornerIndex = hit.index;
      return;
    }

    if (hit.kind === "hole") {
      state.dragMode = "hole-press";
      state.holeClickIndex = hit.index;
      state.pointerStart = pointer;
      return;
    }

    if (state.hungIndex >= 0) {
      unhook();
    }
    state.dragMode = "move";
  }

  function onPointerMove(event) {
    const pointer = pointerFromEvent(event);

    if (state.drawingShape) {
      continueShapeDraft(pointer);
      return;
    }

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

    if (state.dragMode === "hole-press") {
      const dx = pointer.x - state.pointerStart.x;
      const dy = pointer.y - state.pointerStart.y;
      if (Math.hypot(dx, dy) <= HOLE_CLICK_MOVE) return;
      if (state.hungIndex >= 0) unhook();
      state.dragMode = "move";
      state.holeClickIndex = -1;
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
    if (state.drawingShape) {
      if (scene.hasPointerCapture(event.pointerId)) {
        scene.releasePointerCapture(event.pointerId);
      }
      finishShapeDraft();
      return;
    }

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
      finishWeightDrag(event);
      return;
    }

    if (state.dragMode === "hole-press") {
      const index = state.holeClickIndex;
      state.dragging = false;
      state.dragMode = null;
      state.holeClickIndex = -1;
      state.pointerStart = null;
      app.classList.remove("is-dragging");
      if (index >= 0) hangFrom(index);
      return;
    }

    const wasReshape = state.dragMode === "reshape";
    state.dragging = false;
    state.dragMode = null;
    state.cornerIndex = -1;
    state.holeClickIndex = -1;
    state.pointerStart = null;
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

  showCmBtn?.addEventListener("click", () => {
    if (state.tool === "guess-cm") return;
    setCmVisible(!state.cmVisible);
  });

  reshapeBtn.addEventListener("click", () => {
    setTool(state.tool === "reshape" ? "move" : "reshape");
  });

  weightSupply.addEventListener("pointerdown", (event) => {
    if (state.tool === "pencil" || state.tool === "guess-cm" || state.tool === "draw-shape") return;
    if (currentShape?.empty) return;
    if (state.weightCarry) {
      event.preventDefault();
      cancelWeightCarry();
      return;
    }
    capturePointer(weightSupply, event);
    beginWeightDrag(event, "supply");
  });
  weightSupply.addEventListener("pointermove", onPointerMove);
  weightSupply.addEventListener("pointerup", onPointerUp);
  weightSupply.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("pointermove", (event) => {
    if (state.weightCarry || (state.dragging && state.dragMode === "weight")) {
      updateWeightGhost(event);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (state.weightCarry || state.dragMode === "weight")) {
      cancelWeightCarry();
    }
  });

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

  resetBtn?.addEventListener("click", () => {
    resetToDefault();
  });

  const dismissHintOnInteract = (event) => {
    if (event.target.closest?.(".mode-switch, .hub-back-to-sims")) return;
    dismissSceneHint();
  };
  workspace?.addEventListener("pointerdown", dismissHintOnInteract);
  document
    .querySelector(".left-panel")
    ?.addEventListener("pointerdown", dismissHintOnInteract);

  drawShapeBtn?.addEventListener("click", () => {
    if (state.appMode !== "lab") return;
    setTool("draw-shape");
  });

  newShapeBtn?.addEventListener("click", () => {
    if (state.appMode !== "lab") return;
    startNewCustomShape();
  });

  drawConfirmOk?.addEventListener("click", commitPendingCustom);
  drawConfirmCancel?.addEventListener("click", () => {
    clearDraft();
    state.hintDismissed = false;
    syncSceneHint();
  });

  builderModeSwitch?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-builder-mode]");
    if (!btn) return;
    setAppMode(btn.dataset.builderMode);
  });

  window.addEventListener("resize", layout);
  if (typeof ResizeObserver !== "undefined" && workspace) {
    new ResizeObserver(() => layout()).observe(workspace);
  }

  buildShapePicker();
  rebuildDragHandle();
  applyShape("utvar");
  syncBuilderModeSwitch();
  syncSceneHint();
  layout();
  requestAnimationFrame(step);
})();
