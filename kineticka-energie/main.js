(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Geometrie scény (jednotky viewBoxu 1110 × 520) ---------- */
  const VIEW_W = 1110;
  /** Pomocná výška pro rozměry desky (podlaha už se nekreslí — těleso letí prázdnem). */
  const FLOOR_Y = 440;
  const START_X = 70;
  /** Svislá deska — stejné rozměry jako v podkladovém SVG (délka 266, tloušťka 14,12). */
  const PLATE_W = 14.12;
  const PLATE_REST_X = 930;
  const PLATE_TOP = FLOOR_Y - PLATE_W / 2 - 266;
  const PLATE_BOTTOM = FLOOR_Y - PLATE_W / 2;
  /** Pružina: začíná 9 jednotek za deskou, končí na stěně (klidová délka 90). */
  const SPRING_GAP = 9;
  const WALL_X = PLATE_REST_X + SPRING_GAP + 90;
  const SPRING_CY = (PLATE_TOP + PLATE_BOTTOM) / 2;
  const SPRING_AMP = 28;
  const SPRING_SEGMENTS = 9;
  /** Největší stlačení pružiny (u nejvyšší energie). */
  const MAX_COMPRESSION = 64;
  const MIN_COMPRESSION = 4;

  const SPEED_MIN = 1;
  const SPEED_MAX = 10;

  /* ---------- Tělesa ---------- */
  const KOULE_2KG = `
<g transform="translate(0 -222.67)">
<path d="M144.609 148.598C144.609 187.557 113.027 219.139 74.0688 219.139C35.1094 219.139 3.52734 187.557 3.52734 148.598C3.52734 109.64 35.1094 78.0596 74.0688 78.0596C113.027 78.0596 144.609 109.64 144.609 148.598Z" fill="#EF3A50"/>
<path d="M144.609 148.598C144.609 187.557 113.027 219.139 74.0688 219.139C35.1094 219.139 3.52734 187.557 3.52734 148.598C3.52734 109.64 35.1094 78.0596 74.0688 78.0596C113.027 78.0596 144.609 109.64 144.609 148.598Z" stroke="#813A50" stroke-width="7.05468" stroke-miterlimit="10" stroke-linecap="round" fill="none"/>
<path d="M74.7552 161.692H69.3672V133.413H74.7552V149.842L83.1926 141.896H89.7023L80.9933 149.842L90.0162 161.692H83.8663L77.0444 152.849L74.7552 154.958V161.692Z" fill="white"/>
<path d="M100.475 154.824C98.8597 154.824 97.3782 154.6 96.1207 154.107C95.6269 154.422 95.313 154.914 95.313 155.544C95.313 156.44 95.8967 157.024 97.3782 157.024H105.278C109.676 157.024 111.921 159.405 111.921 162.592C111.921 167.528 106.175 169.593 100.025 169.593C94.5493 169.593 89.8809 168.202 89.8809 164.521C89.8809 162.502 91.4981 161.064 93.8315 160.75C92.0343 160.168 91.0925 158.731 91.0925 157.114C91.0925 155.32 92.35 153.973 94.2795 153.209C92.574 152.041 91.5422 150.292 91.5422 148.137C91.5422 143.918 95.2671 141.359 100.475 141.359C102.899 141.359 105.142 141.987 106.759 143.11C107.881 141.539 109.856 140.281 112.011 140.281V144.592C110.934 144.592 109.632 144.77 108.599 145.13C109.138 145.983 109.451 147.015 109.451 148.137C109.451 152.267 105.682 154.824 100.475 154.824ZM100.025 166.317C103.976 166.317 106.849 165.419 106.849 163.488C106.849 162.186 105.772 161.694 103.976 161.694H97.3782C95.9408 161.694 94.7733 162.278 94.7733 163.713C94.7733 165.509 96.8385 166.317 100.025 166.317ZM100.519 144.636C98.4982 144.636 97.1066 145.847 97.1066 148.137C97.1066 150.426 98.4982 151.639 100.519 151.639C102.585 151.639 103.976 150.426 103.976 148.137C103.976 145.847 102.585 144.636 100.519 144.636Z" fill="white"/>
<path d="M19.293 148.597C19.293 118.347 43.8168 93.8213 74.0708 93.8213" stroke="white" stroke-width="7.05468" stroke-miterlimit="10" stroke-linecap="round" fill="none"/>
<path d="M51.0513 133.199C53.7603 133.199 56.0393 133.973 57.8453 135.564C59.6513 137.155 60.5543 139.133 60.5543 141.498C60.5543 143.777 59.6943 145.927 57.9743 147.862C56.8563 149.152 55.7813 150.313 54.7063 151.302L48.3853 157.15H60.4253V161.45H42.1933L42.0643 157.236C46.2783 153.409 49.1593 150.7 50.7073 149.152C52.1263 147.733 53.3303 146.4 54.3193 145.11C55.2653 143.949 55.6953 142.659 55.6523 141.283C55.6093 139.176 53.8033 137.499 50.9223 137.499C48.2993 137.499 46.2353 139.133 45.5473 141.584L41.6773 139.649C42.9243 135.865 46.5793 133.199 51.0513 133.199Z" fill="white"/>
</g>`;

  /** Míč ve stejném stylu jako koule (výplň, tmavší obrys, bílý odlesk a popisek). */
  function ballMarkup(r, fill, stroke, label, fontSize) {
    const sw = 7.05;
    const cx = r + sw / 2;
    const cy = -(r + sw / 2);
    const hr = r * 0.777;
    return `
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
<path d="M${cx - hr} ${cy}A${hr} ${hr} 0 0 1 ${cx} ${cy - hr}" stroke="white" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
<text x="${cx + r * 0.08}" y="${cy + fontSize * 0.36}" fill="white" font-size="${fontSize}" font-weight="600" text-anchor="middle">${label}</text>`;
  }

  function boxMarkup() {
    return `
<rect x="3.5" y="-133.5" width="143" height="130" rx="14" fill="#3F7BEA" stroke="#223F8F" stroke-width="7.05"/>
<path d="M20 -58V-104Q20 -116 32 -116H66" stroke="white" stroke-width="7.05" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<text x="79" y="-52" fill="white" font-size="42" font-weight="600" text-anchor="middle">5 kg</text>`;
  }

  function wheelMarkup(cx) {
    const r = 26;
    const cy = -r;
    return `
<g class="wheel" data-cx="${cx}" data-cy="${cy}">
<circle cx="${cx}" cy="${cy}" r="${r - 2.5}" fill="#3B3B3A" stroke="#1D1D1B" stroke-width="5"/>
<circle cx="${cx}" cy="${cy}" r="11" fill="#B1B1B1"/>
<g class="wheel__spokes">
<path d="M${cx - 17} ${cy}H${cx + 17}M${cx} ${cy - 17}V${cy + 17}" stroke="#B1B1B1" stroke-width="3.5" stroke-linecap="round"/>
</g>
<circle cx="${cx}" cy="${cy}" r="4" fill="#3B3B3A"/>
</g>`;
  }

  function cartMarkup() {
    return `
<rect x="3.5" y="-150" width="223" height="104" rx="14" fill="#2FB17A" stroke="#1C6B4A" stroke-width="7.05"/>
<path d="M20 -78V-120Q20 -132 32 -132H78" stroke="white" stroke-width="7.05" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<text x="118" y="-82" fill="white" font-size="44" font-weight="600" text-anchor="middle">10 kg</text>
${wheelMarkup(52)}
${wheelMarkup(178)}`;
  }

  /** width/height = obrys tělesa v jednotkách scény; počátek vlevo dole (na podlaze). */
  /** Tenisák ve stylu ostatních těles: žlutozelená plsť, tmavší obrys, dva bílé švy a odlesk. */
  function tennisMarkup(r) {
    const sw = 6;
    const R = r - sw / 2;
    const cx = r;
    const cy = -r;
    const id = "tenisakClip" + Math.random().toString(36).slice(2, 8);
    const f = (v) => v.toFixed(2);
    /* Švy: dva protilehlé oblouky, které se k okrajům stáčejí jako u skutečného míčku. */
    const seamL = `M${f(cx - 0.62 * R)} ${f(cy - 0.78 * R)}C${f(cx - 0.12 * R)} ${f(cy - 0.35 * R)} ${f(cx - 0.12 * R)} ${f(cy + 0.35 * R)} ${f(cx - 0.62 * R)} ${f(cy + 0.78 * R)}`;
    const seamR = `M${f(cx + 0.62 * R)} ${f(cy - 0.78 * R)}C${f(cx + 0.12 * R)} ${f(cy - 0.35 * R)} ${f(cx + 0.12 * R)} ${f(cy + 0.35 * R)} ${f(cx + 0.62 * R)} ${f(cy + 0.78 * R)}`;
    return `
<defs><clipPath id="${id}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/></clipPath></defs>
<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="#D1FF33"/>
<g clip-path="url(#${id})">
  <circle cx="${f(cx + 0.35 * R)}" cy="${f(cy + 0.4 * R)}" r="${f(R * 0.95)}" fill="#9FC21A" opacity="0.35"/>
  <path d="${seamL}" stroke="#FFFFFF" stroke-width="${f(R * 0.11)}" stroke-linecap="round" fill="none"/>
  <path d="${seamR}" stroke="#FFFFFF" stroke-width="${f(R * 0.11)}" stroke-linecap="round" fill="none"/>
</g>
<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="#7E9A12" stroke-width="${sw}"/>
<path d="M${f(cx - 0.26 * R)} ${f(cy - 0.7 * R)}Q${f(cx)} ${f(cy - 0.82 * R)} ${f(cx + 0.26 * R)} ${f(cy - 0.7 * R)}" stroke="white" stroke-width="${f(R * 0.09)}" stroke-linecap="round" fill="none" opacity="0.7"/>`;
  }

  /** Bowlingová koule: tmavě modrá lesklá, jemné mramorování, tři otvory na prsty a odlesk. */
  function bowlingMarkup(r) {
    const sw = 7;
    const R = r - sw / 2;
    const cx = r;
    const cy = -r;
    const f = (v) => v.toFixed(2);
    const id = "bowlingClip" + Math.random().toString(36).slice(2, 8);
    const hole = (x, y, rr) =>
      `<circle cx="${f(cx + x * R)}" cy="${f(cy + y * R)}" r="${f(rr * R)}" fill="#0B1022"/>` +
      `<path d="M${f(cx + x * R - rr * R * 0.8)} ${f(cy + y * R + rr * R * 0.45)}A${f(rr * R)} ${f(rr * R)} 0 0 0 ${f(cx + x * R + rr * R * 0.8)} ${f(cy + y * R + rr * R * 0.45)}" stroke="#5B6FAE" stroke-width="${f(R * 0.03)}" fill="none" stroke-linecap="round"/>`;
    return `
<defs><clipPath id="${id}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}"/></clipPath></defs>
<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="#2C3E7A"/>
<g clip-path="url(#${id})">
  <path d="M${f(cx - R)} ${f(cy + 0.1 * R)}C${f(cx - 0.4 * R)} ${f(cy - 0.35 * R)} ${f(cx + 0.1 * R)} ${f(cy + 0.45 * R)} ${f(cx + R)} ${f(cy - 0.05 * R)}" stroke="#4A63B0" stroke-width="${f(R * 0.12)}" fill="none" opacity="0.45"/>
  <path d="M${f(cx - R)} ${f(cy + 0.6 * R)}C${f(cx - 0.3 * R)} ${f(cy + 0.25 * R)} ${f(cx + 0.3 * R)} ${f(cy + 0.9 * R)} ${f(cx + R)} ${f(cy + 0.5 * R)}" stroke="#4A63B0" stroke-width="${f(R * 0.08)}" fill="none" opacity="0.35"/>
  <circle cx="${f(cx + 0.4 * R)}" cy="${f(cy + 0.45 * R)}" r="${f(R)}" fill="#0B1022" opacity="0.28"/>
</g>
${hole(-0.2, -0.28, 0.13)}
${hole(0.18, -0.34, 0.13)}
${hole(-0.02, 0.12, 0.16)}
<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="#141C3A" stroke-width="${sw}"/>
<path d="M${f(cx - 0.78 * R)} ${f(cy - 0.05 * R)}A${f(0.78 * R)} ${f(0.78 * R)} 0 0 1 ${f(cx - 0.1 * R)} ${f(cy - 0.77 * R)}" stroke="white" stroke-width="${f(R * 0.08)}" stroke-linecap="round" fill="none" opacity="0.75"/>`;
  }

  /** Pěnový míč podle dodaného SVG (66 × 66), zvětšený na zadaný poloměr. */
  function foamMarkup(r) {
    const k = (2 * r) / 66;
    return `
<g fill="none" transform="translate(0 ${-2 * r}) scale(${k})">
<path d="M0.0118035 32.212L33.7903 65.9905C42.5018 65.7852 50.377 62.2042 56.1602 56.5053L9.49485 9.83997C3.79595 15.6232 0.214951 23.4983 0.00964355 32.2098L0.0118035 32.212Z" fill="#F03B50"/>
<path d="M0 33.0004C0 51.2252 14.7735 66.0008 33.0005 66.0008C33.2641 66.0008 33.5278 65.9965 33.7893 65.99L0.0108063 32.2115C0.00432292 32.473 0 32.7367 0 33.0004Z" fill="#AD0404"/>
<path d="M33.0008 0.00012207C23.8009 0.00012207 15.4805 3.76697 9.49634 9.83975L56.1617 56.5051C62.2344 50.5209 66.0013 42.2005 66.0013 33.0006C66.0013 14.7758 51.2278 0.00012207 33.0008 0.00012207Z" fill="#FF8158"/>
<path opacity="0.75" d="M33.0038 3.80225C49.1301 3.80225 62.2028 16.8749 62.2028 33.0013" stroke="#F2F2F2" stroke-width="2.59336" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;
  }

    /** Poloměr ve scéně podle objemu (r ~ ∛V); 300 cm³ odpovídá r = 70,5. */
  const radiusForVolume = (v) => 70.5 * Math.cbrt(v / 300);
  const KOULE_R = radiusForVolume(500);
  const TENISAK_R = radiusForVolume(150);
  const PENOVY_R = radiusForVolume(500);

  const OBJECTS = [
    {
      id: "koule",
      name: "Bowlingová koule",
      mass: 1,
      volume: 500,
      /* Rozměr = přesně průměr kresby, jinak se koule otáčí kolem posunutého středu a „poskakuje“. */
      width: 2 * KOULE_R,
      height: 2 * KOULE_R,
      markup: () => bowlingMarkup(KOULE_R),
    },
    {
      id: "tenisak",
      name: "Tenisák",
      mass: 0.06,
      volume: 150,
      width: 2 * TENISAK_R,
      height: 2 * TENISAK_R,
      markup: () => tennisMarkup(TENISAK_R),
    },
    {
      id: "penovy",
      name: "Pěnový míč",
      mass: 0.06,
      volume: 500,
      width: 2 * PENOVY_R,
      height: 2 * PENOVY_R,
      markup: () => foamMarkup(PENOVY_R),
    },
  ];

  /** Hmotnost pro zobrazení: pod 0,1 kg v gramech. */
  function formatMass(m) {
    return m < 0.1 ? `${formatNumber(m * 1000)} g` : `${formatNumber(m)} kg`;
  }

  const MAX_ENERGY = 0.5 * Math.max(...OBJECTS.map((o) => o.mass)) * SPEED_MAX * SPEED_MAX;

  /* ---------- DOM ---------- */
  const stage = document.getElementById("stage");
  const picker = document.getElementById("objectPicker");
  const slider = document.getElementById("speedSlider");
  const speedValueEl = document.getElementById("speedValue");
  const btnRun = document.getElementById("btnRun");
  const btnReset = document.getElementById("btnReset");
  const hintEl = document.getElementById("hintEl");
  const massValueEl = document.getElementById("massValue");
  const volumeValueEl = document.getElementById("volumeValue");
  const bodyInfoNameEl = document.getElementById("bodyInfoName");

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function formatNumber(x) {
    const rounded = Math.round(x * 100) / 100;
    return String(rounded).replace(".", ",");
  }

  /* ---------- Stavba scény ---------- */
  /* Těleso letí prázdnem (bez podlahy) přímo na střed měřiče.
     Měřič: deska s pružinou uchycenou na pevném bloku. */
  const wallTop = PLATE_TOP - 20;
  const wallBottom = PLATE_BOTTOM + 20;
  const wallW = 40;
  const clip = el("clipPath", { id: "wallClip" }, el("defs", null, stage));
  el("rect", { x: WALL_X, y: wallTop, width: wallW, height: wallBottom - wallTop, rx: 8 }, clip);
  el("rect", { x: WALL_X, y: wallTop, width: wallW, height: wallBottom - wallTop, rx: 8, fill: "#D6D3B8" }, stage);
  const hatch = el("g", { "clip-path": "url(#wallClip)", stroke: "#A9A690", "stroke-width": 3 }, stage);
  for (let y = wallTop - wallW; y < wallBottom + wallW; y += 18) {
    el("line", { x1: WALL_X, y1: y + wallW, x2: WALL_X + wallW, y2: y }, hatch);
  }
  el(
    "rect",
    { x: WALL_X, y: wallTop, width: wallW, height: wallBottom - wallTop, rx: 8, fill: "none", stroke: "#3B3B3A", "stroke-width": 5 },
    stage
  );

  /* Pružina: světlá celá dráha + tmavé zadní oblouky (jako v podkladu). */
  const springGroup = el("g", { fill: "none", "stroke-width": 4.94, "stroke-linecap": "round", "stroke-linejoin": "round" }, stage);
  const springLight = el("path", { stroke: "#858585" }, springGroup);
  const springDark = el("path", { stroke: "#565655" }, springGroup);

  function drawSpring(x0, x1) {
    const w = (x1 - x0) / SPRING_SEGMENTS;
    const top = SPRING_CY - SPRING_AMP;
    const bottom = SPRING_CY + SPRING_AMP;
    let light = `M${x0} ${bottom}`;
    let dark = "";
    for (let i = 0; i < SPRING_SEGMENTS; i++) {
      const a = x0 + i * w;
      const b = a + w;
      const m = a + w / 2;
      const fromY = i % 2 === 0 ? bottom : top;
      const toY = i % 2 === 0 ? top : bottom;
      const seg = `C${m} ${fromY} ${m} ${toY} ${b} ${toY}`;
      light += seg;
      if (i % 2 === 0) dark += `M${a} ${fromY}` + seg;
    }
    springLight.setAttribute("d", light);
    springDark.setAttribute("d", dark);
  }

  /* Deska + displej, který po nárazu napíše energii. */
  const plateGroup = el("g", null, stage);
  el(
    "line",
    {
      x1: PLATE_REST_X,
      y1: PLATE_TOP,
      x2: PLATE_REST_X,
      y2: PLATE_BOTTOM,
      stroke: "#3B3B3A",
      "stroke-width": PLATE_W,
      "stroke-linecap": "round",
    },
    plateGroup
  );

  const RD_W = 230;
  const RD_H = 96;
  const RD_Y = PLATE_TOP - 34 - RD_H;
  el(
    "line",
    { x1: PLATE_REST_X, y1: RD_Y + RD_H, x2: PLATE_REST_X, y2: PLATE_TOP, stroke: "#3B3B3A", "stroke-width": 5 },
    plateGroup
  );
  const readout = el("g", { class: "readout" }, plateGroup);
  el(
    "rect",
    {
      x: PLATE_REST_X - RD_W / 2,
      y: RD_Y,
      width: RD_W,
      height: RD_H,
      rx: 20,
      fill: "#ffffff",
      stroke: "#3B3B3A",
      "stroke-width": 5,
    },
    readout
  );
  el(
    "rect",
    {
      class: "readout__flash",
      x: PLATE_REST_X - RD_W / 2 + 2.5,
      y: RD_Y + 2.5,
      width: RD_W - 5,
      height: RD_H - 5,
      rx: 18,
      fill: "#FDE68A",
    },
    readout
  );
  const readoutLabel = el(
    "text",
    { x: PLATE_REST_X, y: RD_Y + 32, "text-anchor": "middle", "font-size": 19, fill: "#64748B" },
    readout
  );
  readoutLabel.textContent = "Energie nárazu";
  const readoutValue = el(
    "text",
    { x: PLATE_REST_X, y: RD_Y + 76, "text-anchor": "middle", "font-size": 40, "font-weight": 600, fill: "#94A3B8" },
    readout
  );

  /* Těleso. */
  const objectGroup = el("g", null, stage);

  /* ---------- Stav ---------- */
  const state = {
    objectIndex: 0,
    speed: 5,
    phase: "idle", // idle | approach | contact | rebound | respawn
    x: START_X,
    compression: 0,
    contactT: 0,
    amplitude: 0,
    omega: 1,
    visualSpeed: 0,
    energyShown: false,
    wheelAngle: 0,
    respawnT: 0,
    rafId: 0,
    lastTs: 0,
    hintHidden: false,
  };

  function currentObject() {
    return OBJECTS[state.objectIndex];
  }

  function energyOf(obj, v) {
    return 0.5 * obj.mass * v * v;
  }

  /** Rychlost na obrazovce (jednotky/s) — roste s rychlostí, ale i 1 m/s je vidět. */
  function visualSpeedFor(v) {
    return 110 + 65 * v;
  }

  function contactX() {
    return PLATE_REST_X - PLATE_W / 2;
  }

  function mountObject() {
    const obj = currentObject();
    objectGroup.innerHTML = "";
    const inner = el("g", { class: "object-spin" }, objectGroup);
    inner.innerHTML = obj.markup();
    state.wheelAngle = 0;
  }

  function renderScene() {
    const obj = currentObject();
    const plateX = PLATE_REST_X + state.compression;
    plateGroup.setAttribute("transform", `translate(${state.compression} 0)`);
    drawSpring(plateX + SPRING_GAP, WALL_X);
    objectGroup.setAttribute(
      "transform",
      `translate(${state.x} ${SPRING_CY + obj.height / 2})`
    );
    /* Míče se kutálejí: otočení odpovídá ujeté dráze (úhel = dráha / poloměr). */
    const spin = objectGroup.querySelector(".object-spin");
    if (spin) {
      const deg = (state.wheelAngle * 180) / Math.PI;
      spin.setAttribute("transform", `rotate(${deg.toFixed(2)} ${obj.width / 2} ${-obj.height / 2})`);
    }
  }

  function setReadout(energy) {
    if (energy == null) {
      readoutValue.textContent = "? J";
      readoutValue.setAttribute("fill", "#94A3B8");
      readout.classList.remove("is-pop");
      return;
    }
    const txt = formatNumber(energy);
    readoutValue.textContent = `${txt} J`;
    readoutValue.setAttribute("fill", "#EF3A50");
    readout.classList.remove("is-pop");
    void readout.getBoundingClientRect();
    readout.classList.add("is-pop");
  }

  function updateStats() {
    const obj = currentObject();
    massValueEl.textContent = formatMass(obj.mass);
    if (bodyInfoNameEl) bodyInfoNameEl.textContent = obj.name;
    if (volumeValueEl) volumeValueEl.textContent = formatNumber(obj.volume);
    speedValueEl.innerHTML = `${formatNumber(state.speed)} <span class="unit-frac" aria-label="metrů za sekundu"><span class="unit-frac__num">m</span><span class="unit-frac__den">s</span></span>`;
    const fill = ((state.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * 100;
    slider.style.setProperty("--fill", `${fill}%`);
  }

  function setBusy(busy) {
    btnRun.disabled = busy;
    slider.disabled = busy;
    if (picker) picker.querySelectorAll("button").forEach((b) => (b.disabled = busy));
  }

  /* ---------- Výběr tělesa ---------- */
  if (picker) OBJECTS.forEach((obj, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "object-btn";
    btn.setAttribute("role", "radio");
    btn.dataset.index = String(i);
    const pad = 6;
    const icon = el("svg", {
      class: "object-btn__icon",
      viewBox: `${-pad} ${-obj.height - pad} ${obj.width + pad * 2} ${obj.height + pad * 2}`,
      "aria-hidden": "true",
    });
    icon.innerHTML = obj.markup();
    btn.appendChild(icon);
    const name = document.createElement("span");
    name.textContent = obj.name;
    const mass = document.createElement("span");
    mass.className = "object-btn__mass";
    mass.textContent = `${formatNumber(obj.volume)} cm³\n${formatMass(obj.mass)}`;
    btn.append(name, mass);
    btn.addEventListener("click", () => selectObject(i));
    picker.appendChild(btn);
  });

  function syncPicker() {
    if (picker) picker.querySelectorAll(".object-btn").forEach((b, i) => {
      const on = i === state.objectIndex;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function selectObject(i) {
    if (state.phase !== "idle") return;
    state.objectIndex = i;
    syncPicker();
    mountObject();
    resetToStart();
  }

  slider.addEventListener("input", () => {
    state.speed = Number(slider.value);
    updateStats();
    if (state.phase === "idle") setReadout(null);
  });

  /* ---------- Animace ---------- */
  function hideHint() {
    if (state.hintHidden) return;
    state.hintHidden = true;
    hintEl.classList.add("is-hidden");
  }

  function launch() {
    if (state.phase !== "idle") return;
    hideHint();
    const obj = currentObject();
    const energy = energyOf(obj, state.speed);
    state.visualSpeed = visualSpeedFor(state.speed);
    state.amplitude = Math.max(MIN_COMPRESSION, MAX_COMPRESSION * Math.sqrt(energy / MAX_ENERGY));
    /* Harmonické stlačení s plynulou návazností rychlosti: v = A·ω. */
    state.omega = state.visualSpeed / state.amplitude;
    state.energyShown = false;
    state.x = START_X;
    state.compression = 0;
    setReadout(null);
    state.phase = "approach";
    setBusy(true);
    state.lastTs = 0;
    cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(tick);
  }

  function roll(dx) {
    const obj = currentObject();
    state.x += dx;
    state.wheelAngle += dx / (obj.height / 2);
  }

  function tick(ts) {
    if (!state.lastTs) state.lastTs = ts;
    let dt = Math.min(0.05, (ts - state.lastTs) / 1000);
    state.lastTs = ts;
    const obj = currentObject();

    if (state.phase === "approach") {
      roll(state.visualSpeed * dt);
      const overshoot = state.x + obj.width - contactX();
      if (overshoot >= 0) {
        /* Zbytek kroku už probíhá ve fázi stlačování. */
        state.phase = "contact";
        state.contactT = overshoot / state.visualSpeed;
      }
    } else if (state.phase === "contact") {
      state.contactT += dt;
    }

    if (state.phase === "contact") {
      const halfPeriod = Math.PI / state.omega;
      const t = Math.min(state.contactT, halfPeriod);
      state.compression = state.amplitude * Math.sin(state.omega * t);
      const newX = contactX() + state.compression - obj.width;
      state.wheelAngle += (newX - state.x) / (obj.height / 2);
      state.x = newX;
      if (!state.energyShown && t >= halfPeriod / 2) {
        state.energyShown = true;
        setReadout(energyOf(obj, state.speed));
      }
      if (state.contactT >= halfPeriod) {
        state.compression = 0;
        state.phase = "rebound";
      }
    } else if (state.phase === "rebound") {
      roll(-state.visualSpeed * dt);
      if (state.x + obj.width < -60) {
        state.phase = "respawn";
        state.respawnT = 0;
        state.x = START_X;
        state.wheelAngle = 0;
        objectGroup.style.opacity = "0";
      }
    } else if (state.phase === "respawn") {
      state.respawnT += dt;
      const k = Math.min(1, state.respawnT / 0.35);
      objectGroup.style.opacity = String(k);
      if (k >= 1) {
        objectGroup.style.opacity = "";
        state.phase = "idle";
        setBusy(false);
        renderScene();
        return;
      }
    }

    renderScene();
    state.rafId = requestAnimationFrame(tick);
  }

  function resetToStart() {
    cancelAnimationFrame(state.rafId);
    state.phase = "idle";
    state.x = START_X;
    state.compression = 0;
    state.wheelAngle = 0;
    objectGroup.style.opacity = "";
    setReadout(null);
    setBusy(false);
    updateStats();
    renderScene();
  }

  btnRun.addEventListener("click", launch);

  /* Nápověda zmizí po první interakci se simulací. */
  ["pointerdown", "keydown", "input"].forEach((type) =>
    document.addEventListener(type, hideHint, { capture: true, once: true })
  );
  btnReset.addEventListener("click", resetToStart);

  /* ---------- Start ---------- */
  state.speed = Number(slider.value);
  syncPicker();
  mountObject();
  resetToStart();

  /* Pro testy/ladění. */
  window.__kineticSim = { state, launch, resetToStart, selectObject };
})();
