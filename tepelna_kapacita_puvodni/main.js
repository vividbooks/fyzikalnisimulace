const scene = document.querySelector(".scene");
const sceneWorkspace = document.querySelector("#scene-workspace");
const supplyStrip = document.querySelector("#supply-strip");
const setupEl = document.querySelector("#setup");
const workspaceControlsEl = document.querySelector("#workspace-controls");
const poolSetupEl = document.querySelector("#pool-setup");
const poolsEl = document.querySelector("#pools");
const poolSlots = [...document.querySelectorAll(".pool-slot")];
const pools = [...document.querySelectorAll(".pool")];
const workspaceEl = sceneWorkspace || scene;

const SUPPLY_SCALE = 0.5;
const DEFAULT_SPAWN_MASS_G = 1000;
const SUPPLY_ITEM_ORDER = [
  "water",
  "oil",
  "alcohol",
  "gold",
  "copper",
  "marble",
  "aluminum",
];

const burnersEl = document.querySelector("#burners");
const burners = [...document.querySelectorAll(".burner")];
const heatOutputPanels = [...document.querySelectorAll(".heat-outputs")];
const burnerCountButtons = [...document.querySelectorAll(".burner-count-btn")];
const poolCountButtons = [...document.querySelectorAll(".pool-count-btn")];
const coolingButtons = [...document.querySelectorAll(".cooling-btn")];
const coolingAmbientInfo = document.querySelector("#cooling-ambient-info");
const coolingAmbientValue = document.querySelector("#cooling-ambient-value");
const poolWaterInfo = document.querySelector("#pool-water-info");
const poolBrickHitEls = [...document.querySelectorAll(".pool-brick-hit")];
const poolWaterOverlayWrapEl = document.querySelector("#pool-water-overlay-wrap");
const poolFrontFramesLayerEl = document.querySelector("#pool-front-frames-layer");
const poolFrontFrameWrapEls = [
  ...document.querySelectorAll("#pool-front-frames-layer .pool-front-frame-wrap"),
];
const powerSlider = document.querySelector("#burner-power");
const powerLabel = document.querySelector("#burner-power-label");
const burnerToggle = document.querySelector("#burner-toggle");
const heatSourceButtons = [...document.querySelectorAll(".heat-source-btn")];

const HEAT_OUTPUT_LABELS = {
  water: "Teplo předané vodě",
  oil: "Teplo předané oleji",
  alcohol: "Teplo předané lihu",
  gold: "Teplo předané zlatu",
  copper: "Teplo předané mědi",
  marble: "Teplo předané mramoru",
  aluminum: "Teplo předané hliníku",
};

const MAX_POWER_W = 1000;
const MIN_MASS_G = 10;
const MAX_FLUID_MASS_G = 2000;
const AMBIENT_TEMP_C = 20;
const ATMOSPHERIC_PRESSURE_PA = 101325;
const WATER_BOILING_POINT_C = 100;
const OIL_BOILING_POINT_C = 300;
const ALCOHOL_BOILING_POINT_C = 78;

/**
 * Efektivní UA [W/K] pro odvod do okolního vzduchu (20 °C, 101325 Pa).
 * Ztráta tepla: P = UA × (T − T_okolí).
 */
const VESSEL_COOLING_UA_W_PER_K = 1.8;
const VESSEL_DISPLAY_WIDTH = 160;
const VESSEL_DISPLAY_HEIGHT = 184;

const BRICK_ASPECT_RATIO = 88 / 148;

/** Hustota [g/l] pro výpočet vizuálního objemu cihly vs. 1 kg vody. */
const SOLID_BRICK_DENSITY_G_PER_L = {
  gold: 19300,
  copper: 9000,
  marble: 2700,
  aluminum: 2700,
};

const SOLID_BRICK_PHYSICS = {
  gold: { specificHeat: 130, maxTempC: 1064 },
  copper: { specificHeat: 400, maxTempC: 1085 },
  marble: { specificHeat: 850, maxTempC: 1200 },
  aluminum: { specificHeat: 900, maxTempC: 660 },
};

function getSolidBrickReferenceSize(brickKey) {
  const volumeRatio =
    FLUID_DENSITY_G_PER_L.water / SOLID_BRICK_DENSITY_G_PER_L[brickKey];
  const linearScale = Math.cbrt(volumeRatio);
  const width = Math.round(VESSEL_DISPLAY_WIDTH * linearScale);
  const height = Math.round(width * BRICK_ASPECT_RATIO);
  return { width, height };
}

const REFERENCE_FLUID_MASS_G = 1000;

/** Hustota [g/l] – stejné číslo jako kg/m³; objem [l] = hmotnost [g] / hustota. */
const FLUID_DENSITY_G_PER_L = {
  water: 1000,
  oil: 850,
  alcohol: 790,
};

/** 1 kg vody → střední hladina (referenční keyframe). */
const VOLUME_AT_REFERENCE =
  REFERENCE_FLUID_MASS_G / FLUID_DENSITY_G_PER_L.water;

/** Skoro plná nádoba = největší objem při 2 kg (nejmenší hustota kapalin). */
const VOLUME_AT_VESSEL_MAX =
  MAX_FLUID_MASS_G / Math.min(...Object.values(FLUID_DENSITY_G_PER_L));

/** Path data pro kapalinu – stejná geometrie jako ukázková SVG (prázdná / 1 kg / plná). */
const FLUID_PATH_KEYFRAMES = {
  empty: [
    "M190.53 182.53C190.53 199.098 149.564 212.53 99.03 212.53C48.4957 212.53 7.53003 199.098 7.53003 182.53",
    "M190.53 182.53C190.53 165.962 149.564 152.53 99.03 152.53C48.4957 152.53 7.53003 165.962 7.53003 182.53",
    "M190.53 182.53C190.53 199.098 149.564 212.53 99.03 212.53C48.4957 212.53 7.53003 199.098 7.53003 182.53",
    "M190.53 182.53C190.53 165.962 149.564 152.53 99.03 152.53C48.4957 152.53 7.53003 165.962 7.53003 182.53",
    "M100.53 213.32C151.064 213.32 192.03 199.535 192.03 182.53V198.741C192.03 215.745 151.064 229.53 100.53 229.53C49.996 229.53 9.03003 215.745 9.03003 198.741V182.53C9.03003 199.535 49.996 213.32 100.53 213.32Z",
  ],
  reference: [
    "M190.53 112.53C190.53 129.098 149.564 142.53 99.03 142.53C48.4957 142.53 7.53 129.098 7.53 112.53",
    "M190.53 112.53C190.53 95.9625 149.564 82.53 99.03 82.53C48.4957 82.53 7.53 95.9625 7.53 112.53",
    "M190.53 112.53C190.53 129.098 149.564 142.53 99.03 142.53C48.4957 142.53 7.53 129.098 7.53 112.53",
    "M190.53 112.53C190.53 95.9625 149.564 82.53 99.03 82.53C48.4957 82.53 7.53 95.9625 7.53 112.53",
    "M100.53 143.32C151.064 143.32 192.03 129.535 192.03 112.53V198.741C192.03 215.745 151.064 229.53 100.53 229.53C49.9959 229.53 9.03 215.745 9.03 198.741V112.53C9.03 129.535 49.9959 143.32 100.53 143.32Z",
  ],
  full: [
    "M190.53 63.5302C190.53 80.0979 149.564 93.53 99.03 93.53C48.4957 93.53 7.53003 80.0979 7.53003 63.5302",
    "M190.53 63.5302C190.53 46.9625 149.564 33.53 99.03 33.53C48.4957 33.53 7.53003 46.9625 7.53003 63.5302",
    "M190.53 63.5302C190.53 80.0979 149.564 93.53 99.03 93.53C48.4957 93.53 7.53003 80.0979 7.53003 63.5302",
    "M190.53 63.5302C190.53 46.9625 149.564 33.53 99.03 33.53C48.4957 33.53 7.53003 46.9625 7.53003 63.5302",
    "M100.53 93.3195C151.064 93.3195 192.03 79.5346 192.03 62.53V198.741C192.03 215.745 151.064 229.53 100.53 229.53C49.996 229.53 9.03003 215.745 9.03003 198.741V62.53C9.03003 79.5346 49.996 93.3195 100.53 93.3195Z",
  ],
};

const SNAP_RADIUS = 85;
const POOL_BRICK_SNAP_RADIUS = 130;
const FLAME_TIP_OFFSET_Y = 8;
const FLAME_CENTER_X_RATIO = 87.375 / 113;
const POOL_WATER_CENTER_X_RATIO = 68 / 136;
/** Výchozí hladina vody v bazénu (bez ponořené cihly). */
const POOL_WATER_SURFACE_Y_RATIO_BASE = 62 / 110;
/** Nejvyšší hladina při maximálním vytlačení objemu cihlou. */
const POOL_WATER_SURFACE_Y_RATIO_RAISED = 48 / 110;
const POOL_WATER_RISE_VIEWBOX_MAX =
  (POOL_WATER_SURFACE_Y_RATIO_BASE - POOL_WATER_SURFACE_Y_RATIO_RAISED) *
  110;
/** Při morfování: body u dna (y ≥ konec) stojí, horní hrana (y ≤ začátek) stoupá. */
const POOL_WATER_PATH_Y_BLEND_START = 18;
const POOL_WATER_PATH_Y_BLEND_END = 90;

const POOL_WATER_PATHS = {
  fill: "M134.376 35.0117L89.7279 60.1415L0.926727 42.2403L45.0573 17.3225L134.376 35.0117Z",
  surface:
    "M134.505 34.8616L134.377 80.2101C134.377 80.2101 133.701 84.209 131.472 85.915C129.244 87.6211 97.085 105.971 97.085 105.971C97.085 105.971 92.9209 110.263 82.263 108.222C71.6051 106.181 4.26523 92.4335 4.26523 92.4335L1.31662 90.2221L0.92955 86.6571L0.877777 42.1419L89.7307 60.1442L134.507 34.864L134.505 34.8616Z",
};
const POOL_BRICK_CENTER_X_RATIO = 63 / 136;
const POOL_SNAP_OFFSET_Y = 4;
const POOL_BRICK_BOTTOM_INSET = 0;
/** Spodní hrana cihly na dně bazénu v isometrii (viewBox 136×110), ne u přední hrany. */
const POOL_BRICK_FLOOR_Y_RATIO = 98 / 110;
const POOL_BOTTOM_Y_RATIO = 108 / 110;
/** Voda v bazénu: 3 kg, výchozí teplota 20 °C. */
const POOL_WATER_MASS_G = 3000;
const POOL_WATER_SPECIFIC_HEAT = 4200;
/**
 * Časová konstanta vyrovnání teploty tělesa s vodou v bazénu (20 °C) [s].
 * τ ≈ (m·c) / UA – menší hmotnost i menší c = pomalejší dle kapacity, viz getPoolObjectUA.
 */
const POOL_TEMP_EQUILIBRATION_TIME_S = 22;

const ITEM_CATALOG = {
  water: {
    fluidKey: "water",
    label: "Nádoba s vodou",
    supplyLabel: "Voda",
    svg: "assets/water-vessel.svg",
    visualClass: "water-vessel",
    modifierClass: "vessel-draggable--water",
    densityGPerL: FLUID_DENSITY_G_PER_L.water,
    specificHeat: 4200,
    boilingPointC: WATER_BOILING_POINT_C,
    sliderClass: "vessel-mass-control__slider--water",
    massLabel: "Hmotnost vody",
    tempLabel: "Teplota vody",
  },
  oil: {
    fluidKey: "oil",
    label: "Nádoba s olejem",
    supplyLabel: "Olej",
    svg: "assets/oil-vessel.svg",
    visualClass: "oil-vessel",
    modifierClass: "vessel-draggable--oil",
    densityGPerL: FLUID_DENSITY_G_PER_L.oil,
    specificHeat: 1800,
    boilingPointC: OIL_BOILING_POINT_C,
    sliderClass: "vessel-mass-control__slider--oil",
    massLabel: "Hmotnost oleje",
    tempLabel: "Teplota oleje",
  },
  alcohol: {
    fluidKey: "alcohol",
    label: "Nádoba s lihem",
    supplyLabel: "Líh",
    svg: "assets/alcohol-vessel.svg",
    visualClass: "alcohol-vessel",
    modifierClass: "vessel-draggable--alcohol",
    densityGPerL: FLUID_DENSITY_G_PER_L.alcohol,
    specificHeat: 2400,
    boilingPointC: ALCOHOL_BOILING_POINT_C,
    sliderClass: "vessel-mass-control__slider--alcohol",
    massLabel: "Hmotnost lihu",
    tempLabel: "Teplota lihu",
  },
  gold: {
    fluidKey: "gold",
    label: "Zlatá cihla",
    supplyLabel: "Zlato",
    svg: "assets/gold-brick.svg",
    visualClass: "gold-brick",
    modifierClass: "vessel-draggable--gold",
    solidBrickKey: "gold",
    specificHeat: SOLID_BRICK_PHYSICS.gold.specificHeat,
    boilingPointC: SOLID_BRICK_PHYSICS.gold.maxTempC,
    sliderClass: "vessel-mass-control__slider--gold",
    massLabel: "Hmotnost zlata",
    tempLabel: "Teplota zlata",
  },
  copper: {
    fluidKey: "copper",
    label: "Měděná cihla",
    supplyLabel: "Měď",
    svg: "assets/copper-brick.svg",
    visualClass: "copper-brick",
    modifierClass: "vessel-draggable--copper",
    solidBrickKey: "copper",
    specificHeat: SOLID_BRICK_PHYSICS.copper.specificHeat,
    boilingPointC: SOLID_BRICK_PHYSICS.copper.maxTempC,
    sliderClass: "vessel-mass-control__slider--copper",
    massLabel: "Hmotnost mědi",
    tempLabel: "Teplota mědi",
  },
  marble: {
    fluidKey: "marble",
    label: "Mramorová cihla",
    supplyLabel: "Mramor",
    svg: "assets/marble-brick.svg",
    visualClass: "marble-brick",
    modifierClass: "vessel-draggable--marble",
    solidBrickKey: "marble",
    specificHeat: SOLID_BRICK_PHYSICS.marble.specificHeat,
    boilingPointC: SOLID_BRICK_PHYSICS.marble.maxTempC,
    sliderClass: "vessel-mass-control__slider--marble",
    massLabel: "Hmotnost mramoru",
    tempLabel: "Teplota mramoru",
  },
  aluminum: {
    fluidKey: "aluminum",
    label: "Hliníková cihla",
    supplyLabel: "Hliník",
    svg: "assets/aluminum-brick.svg",
    visualClass: "aluminum-brick",
    modifierClass: "vessel-draggable--aluminum",
    solidBrickKey: "aluminum",
    specificHeat: SOLID_BRICK_PHYSICS.aluminum.specificHeat,
    boilingPointC: SOLID_BRICK_PHYSICS.aluminum.maxTempC,
    sliderClass: "vessel-mass-control__slider--aluminum",
    massLabel: "Hmotnost hliníku",
    tempLabel: "Teplota hliníku",
  },
};

const sim = {
  heatSource: "burner",
  burnerOn: false,
  powerW: 500,
  burnerCount: 1,
  poolCount: 1,
  coolingOn: false,
};

const vesselControllers = [];
let nextVesselInstanceId = 1;
let spawnDrag = null;

/** Vnitřní energie vody v každém bazénu vůči referenční teplotě 20 °C [J]. */
const poolWaterStates = [{ heatJ: 0 }, { heatJ: 0 }];

function getPoolElement(poolIndex) {
  return pools[poolIndex] ?? null;
}

function getPoolSlot(poolIndex) {
  return poolSlots[poolIndex] ?? null;
}

function getPoolWaterState(poolIndex) {
  return poolWaterStates[poolIndex] ?? poolWaterStates[0];
}

function formatDecimal(value, fractionDigits) {
  return value.toLocaleString("cs-CZ", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatHeat(joules) {
  if (joules < 1000) {
    return `${Math.round(joules)} J`;
  }
  if (joules < 1_000_000) {
    return `${formatDecimal(joules / 1000, 2)} kJ`;
  }
  return `${formatDecimal(joules / 1_000_000, 2)} MJ`;
}

function formatWatts(watts) {
  return `${Math.round(watts)} W`;
}

function formatMass(grams) {
  if (grams <= 0) {
    return "0 g";
  }
  if (grams < 1000) {
    return `${Math.round(grams)} g`;
  }
  const kg = grams / 1000;
  if (Number.isInteger(kg)) {
    return `${kg} kg`;
  }
  return `${formatDecimal(kg, 1)} kg`;
}

function formatTempValue(celsius) {
  if (celsius < 100) {
    const rounded = Math.round(celsius * 10) / 10;
    return Number.isInteger(rounded)
      ? String(rounded)
      : formatDecimal(rounded, 1);
  }
  return String(Math.round(celsius));
}

function formatFluidTemp(celsius) {
  return `${formatTempValue(celsius)} °C`;
}

function getFluidTempC(fluidState, specificHeat) {
  if (fluidState.massG < MIN_MASS_G) {
    return AMBIENT_TEMP_C;
  }
  const massKg = fluidState.massG / 1000;
  return AMBIENT_TEMP_C + fluidState.heatJ / (massKg * specificHeat);
}

function getMaxHeatJ(massG, specificHeat, boilingPointC) {
  if (massG < MIN_MASS_G) {
    return 0;
  }
  const massKg = massG / 1000;
  return massKg * specificHeat * (boilingPointC - AMBIENT_TEMP_C);
}

function clampFluidHeat(fluidState, specificHeat, boilingPointC) {
  const maxHeatJ = getMaxHeatJ(fluidState.massG, specificHeat, boilingPointC);
  fluidState.heatJ = Math.max(0, Math.min(fluidState.heatJ, maxHeatJ));
}

function isFluidHeating(fluidState) {
  return fluidState.snappedBurnerIndex !== null && fluidState.massG >= MIN_MASS_G;
}

function hasReachedBoilingOrMelting(
  fluidState,
  specificHeat,
  boilingPointC
) {
  const tempC = getFluidTempC(fluidState, specificHeat);
  const maxHeatJ = getMaxHeatJ(fluidState.massG, specificHeat, boilingPointC);
  return (
    tempC >= boilingPointC - 0.05 ||
    fluidState.heatJ >= maxHeatJ - 0.001
  );
}

function getItemDisplaySize(typeKey, massG = DEFAULT_SPAWN_MASS_G) {
  const config = ITEM_CATALOG[typeKey];
  if (config.solidBrickKey) {
    return getSolidBrickDisplaySize(massG, config.solidBrickKey);
  }
  return { width: VESSEL_DISPLAY_WIDTH, height: VESSEL_DISPLAY_HEIGHT };
}

function scaleDisplaySize(size, scale) {
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

function getSupplyThumbnailSize(typeKey) {
  return scaleDisplaySize(
    getItemDisplaySize(typeKey, DEFAULT_SPAWN_MASS_G),
    SUPPLY_SCALE
  );
}

function createItemVisual(typeKey, width, height) {
  const config = ITEM_CATALOG[typeKey];
  const visual = document.createElement("object");
  visual.className = `vessel-visual ${config.visualClass}`;
  visual.type = "image/svg+xml";
  visual.data = config.svg;
  visual.width = width;
  visual.height = height;
  visual.setAttribute("tabindex", "-1");
  visual.setAttribute("aria-hidden", "true");
  visual.style.width = `${width}px`;
  visual.style.height = `${height}px`;
  return visual;
}

function buildVesselDOM(typeKey, instanceId) {
  const config = ITEM_CATALOG[typeKey];
  const displaySize = getItemDisplaySize(typeKey, DEFAULT_SPAWN_MASS_G);

  const root = document.createElement("div");
  root.className = `vessel-draggable ${config.modifierClass}`;
  root.dataset.instanceId = instanceId;

  const handle = document.createElement("div");
  handle.className = "vessel-handle";
  handle.setAttribute("role", "application");
  handle.setAttribute("aria-label", `${config.label} – přetáhněte po ploše`);

  const visual = createItemVisual(
    typeKey,
    displaySize.width,
    displaySize.height
  );

  if (config.solidBrickKey) {
    const visualWrap = document.createElement("span");
    visualWrap.className = "vessel-visual-wrap";
    visualWrap.appendChild(visual);
    handle.appendChild(visualWrap);
  } else {
    handle.appendChild(visual);
  }

  if (config.solidBrickKey) {
    const handleSize = getSolidBrickHandleSize(config.solidBrickKey);
    handle.classList.add("vessel-handle--solid-brick");
    handle.style.width = `${handleSize.width}px`;
    handle.style.height = `${handleSize.height}px`;
  }

  const stats = document.createElement("div");
  stats.className = "vessel-stats";
  stats.setAttribute("aria-live", "polite");

  const massRow = document.createElement("p");
  massRow.className = "vessel-stats__row vessel-stats__row--mass";
  massRow.innerHTML = `<span class="vessel-stats__label">${config.massLabel}:</span>`;
  const massEl = document.createElement("span");
  massEl.className = "vessel-stats__value";
  massEl.id = `mass-value-${instanceId}`;
  massEl.textContent = formatMass(DEFAULT_SPAWN_MASS_G);
  massRow.appendChild(massEl);

  const massControl = document.createElement("label");
  massControl.className = "vessel-mass-control";
  massControl.htmlFor = `mass-${instanceId}`;
  const massSlider = document.createElement("input");
  massSlider.type = "range";
  massSlider.id = `mass-${instanceId}`;
  massSlider.className = `vessel-mass-control__slider ${config.sliderClass}`;
  massSlider.min = String(MIN_MASS_G);
  massSlider.max = String(MAX_FLUID_MASS_G);
  massSlider.step = "10";
  massSlider.value = String(DEFAULT_SPAWN_MASS_G);
  massSlider.setAttribute("aria-valuemin", String(MIN_MASS_G));
  massSlider.setAttribute("aria-valuemax", String(MAX_FLUID_MASS_G));
  massSlider.setAttribute("aria-valuenow", String(DEFAULT_SPAWN_MASS_G));
  massSlider.setAttribute("aria-valuetext", formatMass(DEFAULT_SPAWN_MASS_G));
  massSlider.setAttribute("aria-label", config.massLabel);
  massControl.appendChild(massSlider);

  const tempBadge = document.createElement("div");
  tempBadge.className = "vessel-temp-badge";
  tempBadge.id = `temp-value-${instanceId}`;
  tempBadge.setAttribute("aria-live", "polite");
  tempBadge.setAttribute(
    "aria-label",
    `${config.tempLabel}: ${formatFluidTemp(AMBIENT_TEMP_C)}`
  );
  tempBadge.textContent = formatFluidTemp(AMBIENT_TEMP_C);

  const heatRow = document.createElement("p");
  heatRow.className = "vessel-stats__row";
  heatRow.innerHTML =
    '<span class="vessel-stats__label">Teplo předané okolí:</span>';
  const heatLostEl = document.createElement("span");
  heatLostEl.className = "vessel-stats__value";
  heatLostEl.id = `heat-lost-value-${instanceId}`;
  heatLostEl.textContent = "0 J";
  heatRow.appendChild(heatLostEl);

  stats.append(massRow, massControl, heatRow);
  root.append(tempBadge, handle, stats);

  return {
    root,
    handle,
    visual,
    massSlider,
    massEl,
    massRow,
    massControl,
    tempBadge,
    tempLabel: config.tempLabel,
    heatRow,
    heatLostEl,
  };
}

function clampSpawnPosition(typeKey, left, top) {
  const config = ITEM_CATALOG[typeKey];
  const { width } = config.solidBrickKey
    ? getSolidBrickHandleSize(config.solidBrickKey)
    : getItemDisplaySize(typeKey, DEFAULT_SPAWN_MASS_G);
  return {
    left: Math.max(0, Math.min(left, workspaceEl.clientWidth - width)),
    top: Math.max(0, top),
  };
}

function spawnVessel(typeKey, left, top) {
  const config = ITEM_CATALOG[typeKey];
  const instanceId = `v-${nextVesselInstanceId}`;
  nextVesselInstanceId += 1;
  let { left: x, top: y } = clampSpawnPosition(typeKey, left, top);
  const snapSize = config.solidBrickKey
    ? getSolidBrickHandleSize(config.solidBrickKey)
    : getItemDisplaySize(typeKey, DEFAULT_SPAWN_MASS_G);

  if (
    isPoolMode() &&
    !config.solidBrickKey &&
    isWorkspaceAreaOverPool(x, y, snapSize.width, snapSize.height)
  ) {
    const beside = getFluidVesselPlacementBesidePool(
      snapSize.width,
      snapSize.height
    );
    ({ left: x, top: y } = clampSpawnPosition(typeKey, beside.left, beside.top));
  }

  const snapTarget =
    isPoolMode() && !config.solidBrickKey
      ? null
      : findNearestHeatSource(
          x,
          y,
          snapSize.width,
          snapSize.height,
          config.solidBrickKey ?? null
        );

  const fluidState = {
    snappedBurnerIndex: null,
    massG: DEFAULT_SPAWN_MASS_G,
    heatJ: 0,
    heatDeliveredJ: 0,
    heatLostJ: 0,
  };

  const elements = buildVesselDOM(typeKey, instanceId);
  elements.root.classList.add("vessel-draggable--no-transition");
  elements.root.style.left = `${x}px`;
  elements.root.style.top = `${y}px`;
  workspaceEl.appendChild(elements.root);

  const controller = createVesselController({
    ...elements,
    fluidState,
    fluidKey: config.fluidKey,
    specificHeat: config.specificHeat,
    densityGPerL: config.densityGPerL ?? null,
    boilingPointC: config.boilingPointC,
    solidBrickKey: config.solidBrickKey ?? null,
  });

  vesselControllers.push(controller);

  if (snapTarget) {
    controller.snapToBurner(snapTarget.index);
  } else {
    refreshBurnerControls();
  }

  requestAnimationFrame(() => {
    elements.root.classList.remove("vessel-draggable--no-transition");
  });
  updateDisplays();
  updatePoolWaterOverlay();
  return controller;
}

function isPointInWorkspace(clientX, clientY) {
  const workspaceRect = workspaceEl.getBoundingClientRect();
  return (
    clientX >= workspaceRect.left &&
    clientX <= workspaceRect.right &&
    clientY >= workspaceRect.top &&
    clientY <= workspaceRect.bottom
  );
}

function isPointInSupply(clientX, clientY) {
  if (!supplyStrip) return false;
  const rect = supplyStrip.getBoundingClientRect();
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function setSupplyDropHighlight(active) {
  supplyStrip?.classList.toggle("supply-strip--drop-target", active);
}

function destroyVessel(controller) {
  const index = vesselControllers.indexOf(controller);
  if (index === -1) return;

  controller.fluidState.snappedBurnerIndex = null;
  controller.root.remove();
  vesselControllers.splice(index, 1);
  setBurnerFlame();
  updateHeatOutput();
  updatePoolBrickHitLayer();
  updatePoolWaterOverlay();
  updatePoolFrontFrame();
  syncPoolVisual();
  refreshBurnerControls();
}

function onSpawnPointerMove(event) {
  if (!spawnDrag || spawnDrag.pointerId !== event.pointerId) return;

  const { ghost, offsetX, offsetY } = spawnDrag;
  ghost.style.left = `${event.clientX - offsetX}px`;
  ghost.style.top = `${event.clientY - offsetY}px`;
  event.preventDefault();
}

function finishSpawnDragListeners() {
  document.removeEventListener("pointermove", onSpawnPointerMove);
  document.removeEventListener("pointerup", onSpawnDragEnd);
  document.removeEventListener("pointercancel", onSpawnDragEnd);
}

function onSpawnDragEnd(event) {
  if (!spawnDrag || spawnDrag.pointerId !== event.pointerId) return;

  finishSpawnDragListeners();

  const { typeKey, ghost, offsetX, offsetY } = spawnDrag;
  spawnDrag = null;

  if (isPointInWorkspace(event.clientX, event.clientY)) {
    const workspaceRect = workspaceEl.getBoundingClientRect();
    spawnVessel(
      typeKey,
      event.clientX - workspaceRect.left - offsetX,
      event.clientY - workspaceRect.top - offsetY
    );
  }

  ghost.remove();
}

function startSpawnFromSupply(typeKey, event) {
  if (event.button !== undefined && event.button !== 0) return;

  const displaySize = getItemDisplaySize(typeKey, DEFAULT_SPAWN_MASS_G);
  const ghost = document.createElement("div");
  ghost.className = "spawn-ghost";
  const handle = document.createElement("div");
  handle.className = "vessel-handle";
  handle.appendChild(
    createItemVisual(typeKey, displaySize.width, displaySize.height)
  );
  ghost.appendChild(handle);
  document.body.appendChild(ghost);

  const sourceRect = event.currentTarget.getBoundingClientRect();
  const offsetX =
    ((event.clientX - sourceRect.left) / sourceRect.width) * displaySize.width;
  const offsetY =
    ((event.clientY - sourceRect.top) / sourceRect.height) * displaySize.height;
  ghost.style.left = `${event.clientX - offsetX}px`;
  ghost.style.top = `${event.clientY - offsetY}px`;

  spawnDrag = {
    typeKey,
    ghost,
    pointerId: event.pointerId,
    offsetX,
    offsetY,
  };

  document.addEventListener("pointermove", onSpawnPointerMove);
  document.addEventListener("pointerup", onSpawnDragEnd);
  document.addEventListener("pointercancel", onSpawnDragEnd);
  event.preventDefault();
}

function initSupplyStrip() {
  if (!supplyStrip) return;

  for (const typeKey of SUPPLY_ITEM_ORDER) {
    const config = ITEM_CATALOG[typeKey];
    const thumbSize = getSupplyThumbnailSize(typeKey);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "supply-item";
    button.dataset.itemType = typeKey;
    button.setAttribute("aria-label", `Vzít: ${config.label}`);

    const visual = createItemVisual(
      typeKey,
      thumbSize.width,
      thumbSize.height
    );
    visual.classList.add("supply-item__visual");
    button.appendChild(visual);

    const caption = document.createElement("span");
    caption.className = "supply-item__label";
    caption.textContent = config.supplyLabel ?? config.label;
    button.appendChild(caption);

    button.addEventListener("pointerdown", (event) => {
      startSpawnFromSupply(typeKey, event);
    });

    supplyStrip.appendChild(button);
  }
}

function getBurnerSnapPosition(
  burnerEl,
  vesselWidth = VESSEL_DISPLAY_WIDTH,
  vesselHeight = VESSEL_DISPLAY_HEIGHT
) {
  const sceneRect = workspaceEl.getBoundingClientRect();
  const burnerRect = burnerEl?.getBoundingClientRect();

  if (!burnerRect) {
    return { left: 0, top: 0 };
  }

  const flameCenterX =
    burnerRect.left -
    sceneRect.left +
    burnerRect.width * FLAME_CENTER_X_RATIO;

  return {
    left: flameCenterX - vesselWidth / 2,
    top:
      burnerRect.top - sceneRect.top - vesselHeight + FLAME_TIP_OFFSET_Y,
  };
}

function isPoolMode() {
  return sim.heatSource === "pool";
}

function resetPoolWaterState() {
  for (const state of poolWaterStates) {
    state.heatJ = 0;
  }
}

function getPoolWaterTempC(poolIndex = 0) {
  const massKg = POOL_WATER_MASS_G / 1000;
  const heatJ = getPoolWaterState(poolIndex).heatJ;
  return AMBIENT_TEMP_C + heatJ / (massKg * POOL_WATER_SPECIFIC_HEAT);
}

function getPoolSnappedController() {
  return getPoolSubmergedBrickController();
}

function updatePoolWaterInfo() {
  const inPool = isPoolMode();

  if (poolWaterInfo) {
    poolWaterInfo.hidden = !inPool;
  }

  for (let poolIndex = 0; poolIndex < poolSlots.length; poolIndex += 1) {
    const slot = getPoolSlot(poolIndex);
    if (!slot) {
      continue;
    }

    const outputEl = slot.querySelector(".pool-water-output");
    const tempEl = slot.querySelector(".pool-water-side-temp");
    const heatEl = slot.querySelector(".pool-water-heat-delivered");
    const show = inPool && poolIndex < sim.poolCount;

    if (outputEl) {
      outputEl.hidden = !show;
    }
    if (tempEl && show) {
      tempEl.textContent = formatFluidTemp(getPoolWaterTempC(poolIndex));
    }
    if (heatEl && show) {
      heatEl.textContent = formatHeat(getPoolWaterState(poolIndex).heatJ);
    }
  }
}

function getPoolBrickOnPool(poolIndex) {
  if (!isPoolMode()) {
    return null;
  }

  return (
    vesselControllers.find(
      (controller) =>
        controller.solidBrickKey &&
        controller.fluidState.snappedBurnerIndex === poolIndex &&
        controller.fluidState.massG >= MIN_MASS_G
    ) ?? null
  );
}

function getPoolSubmergedBrickController() {
  if (!isPoolMode()) {
    return null;
  }

  for (let poolIndex = 0; poolIndex < sim.poolCount; poolIndex += 1) {
    const brick = getPoolBrickOnPool(poolIndex);
    if (brick) {
      return brick;
    }
  }

  return null;
}

/** Kádinky se k bazénu nepřichytávají ani na něj nelze položit. */
function canSnapToPool(solidBrickKey) {
  return Boolean(solidBrickKey);
}

function isWorkspaceAreaOverPool(left, top, width, height) {
  const workspaceRect = workspaceEl.getBoundingClientRect();
  return isPointerOverPool(
    workspaceRect.left + left + width / 2,
    workspaceRect.top + top + height / 2
  );
}

function getFluidVesselPlacementBesidePool(
  vesselWidth,
  vesselHeight,
  poolIndex = 0
) {
  const sceneRect = workspaceEl.getBoundingClientRect();
  const poolRect = getPoolElement(poolIndex)?.getBoundingClientRect();

  if (!poolRect) {
    return { left: 16, top: 16 };
  }

  return {
    left: poolRect.left - sceneRect.left - vesselWidth - 24,
    top: poolRect.top - sceneRect.top + poolRect.height / 2 - vesselHeight / 2,
  };
}

/** Podíl vytlačeného objemu cihly vůči objemu vody v bazénu (0–1). */
function getPoolWaterRiseFactor(poolIndex) {
  const brick = getPoolBrickOnPool(poolIndex);
  if (!brick) {
    return 0;
  }

  const displacedL =
    brick.fluidState.massG / SOLID_BRICK_DENSITY_G_PER_L[brick.solidBrickKey];
  const poolVolL = POOL_WATER_MASS_G / FLUID_DENSITY_G_PER_L.water;

  return Math.min(1, displacedL / poolVolL);
}

function getPoolWaterSurfaceYRatio(poolIndex = 0) {
  const riseFactor = getPoolWaterRiseFactor(poolIndex);
  return (
    POOL_WATER_SURFACE_Y_RATIO_BASE -
    riseFactor *
      (POOL_WATER_SURFACE_Y_RATIO_BASE - POOL_WATER_SURFACE_Y_RATIO_RAISED)
  );
}

/** Posune Y souřadnice cesty nahoru; spodek u stěn bazénu zůstane na místě. */
function morphPoolWaterPath(pathD, riseFactor) {
  if (riseFactor <= 0) {
    return pathD;
  }

  const dyMax = riseFactor * POOL_WATER_RISE_VIEWBOX_MAX;
  const span = POOL_WATER_PATH_Y_BLEND_END - POOL_WATER_PATH_Y_BLEND_START;
  const nums = pathD.match(/-?\d*\.?\d+/g)?.map(Number);

  if (!nums?.length) {
    return pathD;
  }

  const morphed = nums.map((value, index) => {
    if (index % 2 === 0) {
      return value;
    }

    const weight = Math.max(
      0,
      Math.min(1, (POOL_WATER_PATH_Y_BLEND_END - value) / span)
    );
    return value - dyMax * weight;
  });

  let numIndex = 0;
  return pathD.replace(/-?\d*\.?\d+/g, () =>
    formatPathNumber(morphed[numIndex++])
  );
}

function applyPoolWaterLevel(poolIndex) {
  const poolEl = getPoolElement(poolIndex);
  const doc = poolEl?.contentDocument;
  if (!doc) {
    return false;
  }

  const fillPath = doc.getElementById("pool-water-fill");
  const surfacePath = doc.getElementById("pool-water-surface");

  if (!fillPath || !surfacePath) {
    return false;
  }

  const riseFactor = getPoolWaterRiseFactor(poolIndex);
  fillPath.setAttribute("d", morphPoolWaterPath(POOL_WATER_PATHS.fill, riseFactor));
  surfacePath.setAttribute(
    "d",
    morphPoolWaterPath(POOL_WATER_PATHS.surface, riseFactor)
  );
  return true;
}

function syncPoolVisual() {
  if (pools.length === 0) {
    return;
  }

  for (let poolIndex = 0; poolIndex < pools.length; poolIndex += 1) {
    const poolEl = getPoolElement(poolIndex);
    if (!poolEl) {
      continue;
    }

    if (poolEl.getAttribute("data") !== "assets/pool.svg") {
      poolEl.setAttribute("data", "assets/pool.svg");
    }

    if (!applyPoolWaterLevel(poolIndex)) {
      poolEl.addEventListener("load", syncPoolVisual, { once: true });
    }
  }

  updatePoolFrontFrame();
}

function updatePoolWaterOverlay() {
  if (!poolWaterOverlayWrapEl) {
    return;
  }

  poolWaterOverlayWrapEl.hidden = true;
  poolWaterOverlayWrapEl.setAttribute("aria-hidden", "true");
}

function updatePoolFrontFrame() {
  if (!poolFrontFramesLayerEl) {
    return;
  }

  const workspaceRect = workspaceEl.getBoundingClientRect();
  let anyVisible = false;

  for (let poolIndex = 0; poolIndex < poolFrontFrameWrapEls.length; poolIndex += 1) {
    const frameWrap = poolFrontFrameWrapEls[poolIndex];
    if (!frameWrap) {
      continue;
    }

    if (!isPoolMode() || poolIndex >= sim.poolCount) {
      frameWrap.hidden = true;
      frameWrap.setAttribute("aria-hidden", "true");
      continue;
    }

    const poolRect = getPoolElement(poolIndex)?.getBoundingClientRect();
    if (!poolRect) {
      frameWrap.hidden = true;
      frameWrap.setAttribute("aria-hidden", "true");
      continue;
    }

    frameWrap.hidden = false;
    frameWrap.setAttribute("aria-hidden", "false");
    frameWrap.style.left = `${poolRect.left - workspaceRect.left}px`;
    frameWrap.style.top = `${poolRect.top - workspaceRect.top}px`;
    frameWrap.style.width = `${poolRect.width}px`;
    frameWrap.style.height = `${poolRect.height}px`;
    anyVisible = true;
  }

  poolFrontFramesLayerEl.setAttribute("aria-hidden", anyVisible ? "false" : "true");
}

function updatePoolBrickHitLayer() {
  for (let poolIndex = 0; poolIndex < poolBrickHitEls.length; poolIndex += 1) {
    const poolBrickHitEl = poolBrickHitEls[poolIndex];
    const brick = getPoolBrickOnPool(poolIndex);
    const poolEl = getPoolElement(poolIndex);
    const poolSlot = getPoolSlot(poolIndex);

    if (
      !poolBrickHitEl ||
      !brick ||
      !poolEl ||
      !poolSlot ||
      poolIndex >= sim.poolCount
    ) {
      if (poolBrickHitEl) {
        poolBrickHitEl.hidden = true;
      }
      continue;
    }

    const poolRect = poolEl.getBoundingClientRect();
    const brickRect = brick.root.getBoundingClientRect();
    const slotRect = poolSlot.getBoundingClientRect();

    poolBrickHitEl.style.left = `${brickRect.left - slotRect.left}px`;
    poolBrickHitEl.style.top = `${brickRect.top - slotRect.top}px`;
    poolBrickHitEl.style.width = `${brickRect.width}px`;
    poolBrickHitEl.style.height = `${brickRect.height}px`;
    poolBrickHitEl.hidden = false;
  }

  updatePoolFrontFrame();
}

function updatePoolMassVisibility() {
  const hideMass = isPoolMode();
  for (const controller of vesselControllers) {
    if (controller.massRow) {
      controller.massRow.hidden = hideMass;
    }
    if (controller.massControl) {
      controller.massControl.hidden = hideMass;
    }
  }
}

function getPoolObjectUA(fluidState, specificHeat) {
  const massKg = Math.max(MIN_MASS_G, fluidState.massG) / 1000;
  const thermalCapacityJK = massKg * specificHeat;
  return thermalCapacityJK / POOL_TEMP_EQUILIBRATION_TIME_S;
}

function processPoolThermalForIndex(poolIndex, dt) {
  const poolObject = getPoolBrickOnPool(poolIndex);
  if (!poolObject) {
    return false;
  }

  const poolWaterState = getPoolWaterState(poolIndex);
  const { fluidState, specificHeat, boilingPointC } = poolObject;
  const objectTemp = getFluidTempC(fluidState, specificHeat);
  const poolTemp = getPoolWaterTempC(poolIndex);
  const deltaT = poolTemp - objectTemp;

  if (Math.abs(deltaT) <= 0.02) {
    return false;
  }

  const ua = getPoolObjectUA(fluidState, specificHeat);
  let transferJ = ua * deltaT * dt;

  if (transferJ > 0) {
    const maxObjectHeatJ = getMaxHeatJ(
      fluidState.massG,
      specificHeat,
      boilingPointC
    );
    transferJ = Math.min(transferJ, Math.max(0, maxObjectHeatJ - fluidState.heatJ));
    transferJ = Math.min(transferJ, poolWaterState.heatJ);
  } else {
    transferJ = Math.max(transferJ, -fluidState.heatJ);
  }

  if (Math.abs(transferJ) <= 0) {
    return false;
  }

  fluidState.heatJ += transferJ;
  poolWaterState.heatJ -= transferJ;
  clampFluidHeat(fluidState, specificHeat, boilingPointC);
  return true;
}

function processPoolThermal(dt) {
  if (!isPoolMode()) {
    return false;
  }

  let changed = false;

  for (let poolIndex = 0; poolIndex < sim.poolCount; poolIndex += 1) {
    if (processPoolThermalForIndex(poolIndex, dt)) {
      changed = true;
    }
  }

  return changed;
}

function getActiveHeatSourceCount() {
  return isPoolMode() ? sim.poolCount : sim.burnerCount;
}

function isHeatSourceIndexActive(index) {
  return index >= 0 && index < getActiveHeatSourceCount();
}

function findPoolIndexAt(clientX, clientY, marginPx = 16) {
  for (let poolIndex = 0; poolIndex < sim.poolCount; poolIndex += 1) {
    const poolRect = getPoolElement(poolIndex)?.getBoundingClientRect();
    if (!poolRect) {
      continue;
    }

    if (
      clientX >= poolRect.left - marginPx &&
      clientX <= poolRect.right + marginPx &&
      clientY >= poolRect.top - marginPx &&
      clientY <= poolRect.bottom + marginPx
    ) {
      return poolIndex;
    }
  }

  return null;
}

function isPointerOverPool(clientX, clientY, marginPx = 16) {
  return findPoolIndexAt(clientX, clientY, marginPx) !== null;
}

function isSolidBrickNearPoolBottom(rootEl, poolIndex) {
  const poolEl = getPoolElement(poolIndex);
  if (!isPoolMode() || !poolEl || !rootEl) {
    return false;
  }

  const poolRect = poolEl.getBoundingClientRect();
  const brickRect = rootEl.getBoundingClientRect();
  const brickCenterX = (brickRect.left + brickRect.right) / 2;
  const poolBrickCenterX =
    poolRect.left + poolRect.width * POOL_BRICK_CENTER_X_RATIO;
  const targetBottomY = poolRect.top + poolRect.height * POOL_BRICK_FLOOR_Y_RATIO;

  const horizontalClose =
    Math.abs(brickCenterX - poolBrickCenterX) < poolRect.width * 0.42;
  const verticalClose =
    Math.abs(brickRect.bottom - targetBottomY) < poolRect.height * 0.14;

  return horizontalClose && verticalClose;
}

function shouldSnapSolidBrickToPool(clientX, clientY, rootEl = null) {
  const poolIndex = findPoolIndexAt(clientX, clientY);
  if (!isPoolMode() || poolIndex === null) {
    return false;
  }

  if (rootEl && isSolidBrickNearPoolBottom(rootEl, poolIndex)) {
    return true;
  }

  const poolRect = getPoolElement(poolIndex)?.getBoundingClientRect();
  if (!poolRect) {
    return true;
  }

  return clientY >= poolRect.top + poolRect.height * 0.5;
}

function getPoolSnapPosition(
  poolElement,
  vesselWidth = VESSEL_DISPLAY_WIDTH,
  vesselHeight = VESSEL_DISPLAY_HEIGHT,
  solidBrickKey = null
) {
  const sceneRect = workspaceEl.getBoundingClientRect();
  const poolRect = poolElement?.getBoundingClientRect();

  if (!poolRect) {
    return { left: 0, top: 0 };
  }

  const waterCenterX =
    poolRect.left -
    sceneRect.left +
    poolRect.width * POOL_WATER_CENTER_X_RATIO;

  if (solidBrickKey) {
    const brickCenterX =
      poolRect.left -
      sceneRect.left +
      poolRect.width * POOL_BRICK_CENTER_X_RATIO;
    const poolFloorY =
      poolRect.top - sceneRect.top + poolRect.height * POOL_BRICK_FLOOR_Y_RATIO;
    return {
      left: brickCenterX - vesselWidth / 2,
      top: poolFloorY - vesselHeight + POOL_BRICK_BOTTOM_INSET,
      anchorCenter: false,
    };
  }

  const poolIndex = Math.max(0, pools.indexOf(poolElement));

  return {
    left: waterCenterX - vesselWidth / 2,
    top:
      poolRect.top -
      sceneRect.top +
      poolRect.height * getPoolWaterSurfaceYRatio(poolIndex) -
      vesselHeight +
      POOL_SNAP_OFFSET_Y,
  };
}

function getHeatSourceSnapPosition(
  index,
  vesselWidth = VESSEL_DISPLAY_WIDTH,
  vesselHeight = VESSEL_DISPLAY_HEIGHT,
  solidBrickKey = null
) {
  if (isPoolMode()) {
    return getPoolSnapPosition(
      getPoolElement(index),
      vesselWidth,
      vesselHeight,
      solidBrickKey
    );
  }

  return getBurnerSnapPosition(burners[index], vesselWidth, vesselHeight);
}

function findNearestHeatSource(
  left,
  top,
  vesselWidth,
  vesselHeight,
  solidBrickKey = null
) {
  let nearest = null;

  for (let index = 0; index < getActiveHeatSourceCount(); index += 1) {
    if (isPoolMode() && !canSnapToPool(solidBrickKey)) {
      continue;
    }

    const snapPos = getHeatSourceSnapPosition(
      index,
      vesselWidth,
      vesselHeight,
      solidBrickKey
    );

    let centerX = left + vesselWidth / 2;
    let centerY = top + vesselHeight / 2;
    let snapCenterX = snapPos.anchorCenter
      ? snapPos.left
      : snapPos.left + vesselWidth / 2;
    let snapCenterY = snapPos.anchorCenter
      ? snapPos.top
      : snapPos.top + vesselHeight / 2;
    let snapRadius = SNAP_RADIUS;

    if (solidBrickKey && isPoolMode()) {
      centerX = left + vesselWidth / 2;
      centerY = top + vesselHeight;
      snapCenterX = snapPos.left + vesselWidth / 2;
      snapCenterY = snapPos.top + vesselHeight;
      snapRadius = POOL_BRICK_SNAP_RADIUS;
    }

    const distance = Math.hypot(centerX - snapCenterX, centerY - snapCenterY);

    if (distance <= snapRadius && (!nearest || distance < nearest.distance)) {
      nearest = { index, snapPos, distance };
    }
  }

  return nearest;
}

function formatPathNumber(value) {
  const rounded = Math.round(value * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function lerpPathData(fromD, toD, t) {
  const fromNums = fromD.match(/-?\d*\.?\d+/g);
  const toNums = toD.match(/-?\d*\.?\d+/g);
  if (!fromNums || !toNums || fromNums.length !== toNums.length) {
    return toD;
  }

  let index = 0;
  return fromD.replace(/-?\d*\.?\d+/g, () => {
    const value =
      Number(fromNums[index]) +
      (Number(toNums[index]) - Number(fromNums[index])) * t;
    index += 1;
    return formatPathNumber(value);
  });
}

function getFluidPathData(massG, densityGPerL) {
  const volume = massG / densityGPerL;
  if (volume <= 0) {
    return null;
  }

  if (volume <= VOLUME_AT_REFERENCE) {
    const t = volume / VOLUME_AT_REFERENCE;
    return FLUID_PATH_KEYFRAMES.reference.map((pathD, index) =>
      lerpPathData(FLUID_PATH_KEYFRAMES.empty[index], pathD, t)
    );
  }

  if (volume <= VOLUME_AT_VESSEL_MAX) {
    const t =
      (volume - VOLUME_AT_REFERENCE) /
      (VOLUME_AT_VESSEL_MAX - VOLUME_AT_REFERENCE);
    return FLUID_PATH_KEYFRAMES.reference.map((pathD, index) =>
      lerpPathData(pathD, FLUID_PATH_KEYFRAMES.full[index], t)
    );
  }

  return FLUID_PATH_KEYFRAMES.full.slice();
}

function getSolidBrickDisplaySize(massG, brickKey) {
  const ref = getSolidBrickReferenceSize(brickKey);
  const massScale = Math.cbrt(
    Math.max(MIN_MASS_G, massG) / REFERENCE_FLUID_MASS_G
  );
  const width = Math.max(8, Math.round(ref.width * massScale));
  const height = Math.max(5, Math.round(width * BRICK_ASPECT_RATIO));

  return { width, height };
}

/** Pevný rámeček úchopu – statistiky a posuvník se při změně hmotnosti neposouvají. */
function getSolidBrickHandleSize(brickKey) {
  return getSolidBrickDisplaySize(MAX_FLUID_MASS_G, brickKey);
}

function updateSolidBrickVisualSize(visual, massG, brickKey) {
  if (!visual) return;

  const { width, height } = getSolidBrickDisplaySize(massG, brickKey);

  visual.width = width;
  visual.height = height;
  visual.style.width = `${width}px`;
  visual.style.height = `${height}px`;
}

function updateFluidVolume(visual, massG, densityGPerL) {
  const doc = visual?.contentDocument;
  if (!doc) return;

  const fluid = doc.getElementById("fluid");
  if (!fluid) return;

  const pathData = getFluidPathData(massG, densityGPerL);
  if (!pathData) {
    fluid.style.display = "none";
    return;
  }

  const paths = fluid.querySelectorAll("path");

  fluid.style.display = "";
  fluid.removeAttribute("transform");

  paths.forEach((path, index) => {
    if (pathData[index]) {
      path.setAttribute("d", pathData[index]);
    }
  });
}

function updateHeatOutput() {
  heatOutputPanels.forEach((panel) => {
    const labelEl = panel.querySelector(".heat-output__label");
    const valueEl = panel.querySelector(".heat-output__value");
    const panelIndex = Number(panel.dataset.burnerIndex);
    const isPoolPanel = panel.classList.contains("heat-outputs--pool");

    if (isPoolMode() !== isPoolPanel) {
      panel.hidden = true;
      return;
    }

    if (!isPoolMode() && panelIndex >= sim.burnerCount) {
      panel.hidden = true;
      return;
    }

    if (isPoolMode() && panelIndex >= sim.poolCount) {
      panel.hidden = true;
      return;
    }

    const controller = vesselControllers.find(
      (item) => item.fluidState.snappedBurnerIndex === panelIndex
    );

    if (!controller) {
      panel.hidden = true;
      return;
    }

    if (isPoolPanel && controller.solidBrickKey) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    if (labelEl) {
      labelEl.textContent = HEAT_OUTPUT_LABELS[controller.fluidKey];
    }
    if (valueEl) {
      valueEl.textContent = formatHeat(controller.fluidState.heatDeliveredJ);
    }
  });
}

function burnerLabel(singular, plural) {
  return sim.burnerCount === 2 ? plural : singular;
}

function hasVesselOnActiveHeatSource() {
  return vesselControllers.some(
    (controller) =>
      controller.fluidState.snappedBurnerIndex !== null &&
      isHeatSourceIndexActive(controller.fluidState.snappedBurnerIndex) &&
      controller.fluidState.massG >= MIN_MASS_G
  );
}

function refreshBurnerControls() {
  const canUse = hasVesselOnActiveHeatSource();

  if (!isPoolMode()) {
    if (sim.burnerOn && !canUse) {
      sim.burnerOn = false;
      if (burnerToggle) {
        burnerToggle.setAttribute("aria-pressed", "false");
      }
      setBurnerFlame();
      updateAllMassSliderLocks();
    }

    if (burnerToggle) {
      burnerToggle.disabled = !canUse;
      burnerToggle.setAttribute("aria-disabled", canUse ? "false" : "true");
    }
  }

  updateBurnerControlLabels();
}

function isVesselReceivingHeat(fluidState, specificHeat, boilingPointC) {
  if (!isFluidHeating(fluidState) || sim.powerW <= 0) {
    return false;
  }
  if (isPoolMode()) {
    return false;
  }
  return sim.burnerOn;
}

function updateBurnerControlLabels() {
  if (powerLabel && !isPoolMode()) {
    powerLabel.textContent = `${burnerLabel("Výkon hořáku", "Výkon hořáků")}: ${formatWatts(sim.powerW)}`;
  }

  if (burnerToggle && !isPoolMode()) {
    burnerToggle.textContent = sim.burnerOn
      ? burnerLabel("Vypnout hořák", "Vypnout hořáky")
      : burnerLabel("Zapnout hořák", "Zapnout hořáky");
  }
}

function updateBurnerCountButtons() {
  burnerCountButtons.forEach((button) => {
    const count = Number(button.dataset.burnerCount);
    const isActive = count === sim.burnerCount;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setBurnerCount(count) {
  sim.burnerCount = count === 2 ? 2 : 1;

  if (burnersEl) {
    burnersEl.classList.toggle("burners--dual", sim.burnerCount === 2);
  }

  if (sim.burnerCount === 1) {
    for (const controller of vesselControllers) {
      if (controller.fluidState.snappedBurnerIndex === 1) {
        controller.unsnap({ relocateAside: true });
      }
    }
  }

  updateBurnerCountButtons();
  setBurnerFlame();
  updateHeatOutput();
  refreshBurnerControls();

  for (const controller of vesselControllers) {
    if (
      controller.fluidState.snappedBurnerIndex !== null &&
      controller.fluidState.snappedBurnerIndex < sim.burnerCount
    ) {
      controller.onResize();
    }
    controller.refreshStatsSide();
  }
}

function updatePoolCountButtons() {
  poolCountButtons.forEach((button) => {
    const count = Number(button.dataset.poolCount);
    const isActive = count === sim.poolCount;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function setPoolCount(count) {
  sim.poolCount = count === 2 ? 2 : 1;

  if (poolsEl) {
    poolsEl.classList.toggle("pools--dual", sim.poolCount === 2);
  }

  if (sim.poolCount === 1) {
    for (const controller of vesselControllers) {
      if (
        isPoolMode() &&
        controller.fluidState.snappedBurnerIndex === 1
      ) {
        controller.unsnap({ relocateAside: true });
      }
    }
  }

  updatePoolCountButtons();
  updatePoolWaterInfo();
  updateHeatOutput();
  syncPoolVisual();
  updatePoolBrickHitLayer();
  updatePoolFrontFrame();

  for (const controller of vesselControllers) {
    if (
      controller.fluidState.snappedBurnerIndex !== null &&
      controller.fluidState.snappedBurnerIndex < sim.poolCount
    ) {
      controller.onResize();
    }
    controller.refreshStatsSide();
  }
}

function updateDisplays() {
  for (const controller of vesselControllers) {
    controller.updateDisplay();
  }
  updateHeatOutput();
  updatePoolWaterInfo();
  syncPoolVisual();
}

function setBurnerFlame() {
  burners.forEach((burnerEl, index) => {
    const svg = burnerEl?.contentDocument?.documentElement;
    if (!svg) return;

    if (isPoolMode() || index >= sim.burnerCount) {
      svg.style.setProperty("--flame-power", "0");
      return;
    }

    const heating = vesselControllers.some(
      (controller) =>
        controller.fluidState.snappedBurnerIndex === index &&
        controller.fluidState.massG >= MIN_MASS_G
    );
    const effectiveW =
      heating &&
      vesselControllers.some((controller) =>
        isVesselReceivingHeat(
          controller.fluidState,
          controller.specificHeat,
          controller.boilingPointC
        ) && controller.fluidState.snappedBurnerIndex === index
      )
        ? sim.powerW
        : 0;
    svg.style.setProperty("--flame-power", String(effectiveW / MAX_POWER_W));
  });

  if (setupEl) {
    setupEl.classList.remove("setup--pool-heating");
  }
}

function updatePowerLabel() {
  updateBurnerControlLabels();
}

function updatePowerSliderA11y() {
  if (!powerSlider) return;
  powerSlider.setAttribute("aria-valuenow", String(sim.powerW));
  powerSlider.setAttribute("aria-valuetext", formatWatts(sim.powerW));
}

function updateAllMassSliderLocks() {
  for (const controller of vesselControllers) {
    controller.updateMassSliderLock();
  }
}

function updateHeatSourceUI() {
  if (setupEl) {
    setupEl.dataset.heatSource = sim.heatSource;
  }
  if (workspaceControlsEl) {
    workspaceControlsEl.dataset.heatSource = sim.heatSource;
  }
  if (burnersEl) {
    burnersEl.hidden = isPoolMode();
  }
  if (poolSetupEl) {
    poolSetupEl.hidden = !isPoolMode();
  }

  heatSourceButtons.forEach((button) => {
    const isActive = button.dataset.heatSource === sim.heatSource;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  updateCoolingAvailability();
  updatePoolCountButtons();
  updatePoolFrontFrame();
}

function updateCoolingAvailability() {
  const pool = isPoolMode();

  coolingButtons.forEach((button) => {
    button.disabled = pool;
    button.setAttribute("aria-disabled", pool ? "true" : "false");
  });

  if (pool && sim.coolingOn) {
    sim.coolingOn = false;
    updateCoolingButtons();
    updateHeatLostVisibility();
    updateCoolingAmbientInfo();
  }
}

function setHeatSource(source) {
  const next = source === "pool" ? "pool" : "burner";
  if (sim.heatSource === next) {
    return;
  }

  const bricksLeavingPool =
    sim.heatSource === "pool" && next === "burner"
      ? vesselControllers
          .filter(
            (controller) =>
              controller.solidBrickKey &&
              controller.fluidState.snappedBurnerIndex !== null
          )
          .map((controller) => ({
            controller,
            poolIndex: controller.fluidState.snappedBurnerIndex,
          }))
      : [];

  const vesselsLeavingBurner =
    sim.heatSource === "burner" && next === "pool"
      ? vesselControllers
          .filter(
            (controller) =>
              controller.fluidState.snappedBurnerIndex !== null &&
              controller.fluidState.snappedBurnerIndex < sim.burnerCount &&
              controller.fluidState.massG >= MIN_MASS_G
          )
          .map((controller) => ({
            controller,
            sourceIndex: controller.fluidState.snappedBurnerIndex,
          }))
      : [];

  sim.heatSource = next;
  setBurnerOn(false);

  if (next === "pool") {
    resetPoolWaterState();
    setPoolCount(sim.burnerCount === 2 ? 2 : 1);
  }

  for (const controller of vesselControllers) {
    if (controller.fluidState.snappedBurnerIndex !== null) {
      controller.unsnap();
    }
  }

  updateHeatSourceUI();

  if (next === "pool") {
    for (const { controller, sourceIndex } of vesselsLeavingBurner) {
      const poolIndex = Math.min(sourceIndex, sim.poolCount - 1);

      if (controller.solidBrickKey) {
        controller.snapToBurner(poolIndex);
      } else {
        controller.relocateBesidePool(poolIndex);
      }
    }
  }

  if (next === "burner") {
    setBurnerCount(sim.poolCount === 2 ? 2 : 1);

    for (const { controller, poolIndex } of bricksLeavingPool) {
      const burnerIndex = Math.min(poolIndex, sim.burnerCount - 1);
      controller.snapToBurner(burnerIndex);
    }
  }

  updateHeatOutput();
  updatePoolWaterInfo();
  updatePoolMassVisibility();
  syncPoolVisual();
  updatePoolBrickHitLayer();
  updatePoolWaterOverlay();
  updatePoolFrontFrame();
  refreshBurnerControls();
  setBurnerFlame();
}

function setBurnerOn(on) {
  if (on && !hasVesselOnActiveHeatSource()) {
    return;
  }

  sim.burnerOn = on;

  if (burnerToggle) {
    burnerToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }

  updateBurnerControlLabels();
  setBurnerFlame();
  updateAllMassSliderLocks();
  refreshBurnerControls();
}

function setPowerW(watts) {
  sim.powerW = Math.max(0, Math.min(MAX_POWER_W, watts));
  if (powerSlider && Number(powerSlider.value) !== sim.powerW) {
    powerSlider.value = String(sim.powerW);
  }
  updatePowerLabel();
  updatePowerSliderA11y();
  setBurnerFlame();
}

function unsnapOtherVesselsOnBurner(burnerIndex, activeController) {
  for (const controller of vesselControllers) {
    if (
      controller !== activeController &&
      controller.fluidState.snappedBurnerIndex === burnerIndex
    ) {
      controller.unsnap({ relocateAside: true });
    }
  }
}

function createVesselController({
  root,
  handle,
  visual,
  massSlider,
  massEl,
  massRow = null,
  massControl = null,
  tempBadge,
  tempLabel,
  heatRow,
  heatLostEl,
  fluidState,
  fluidKey,
  specificHeat,
  densityGPerL = null,
  boilingPointC,
  solidBrickKey = null,
  initialLeft = null,
  initialTop = null,
}) {
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activePointerId = null;

  const defaultVesselWidth = solidBrickKey
    ? getSolidBrickDisplaySize(fluidState.massG, solidBrickKey).width
    : VESSEL_DISPLAY_WIDTH;
  const defaultVesselHeight = solidBrickKey
    ? getSolidBrickDisplaySize(fluidState.massG, solidBrickKey).height
    : VESSEL_DISPLAY_HEIGHT;

  function getVesselSize() {
    if (solidBrickKey) {
      return getSolidBrickHandleSize(solidBrickKey);
    }

    return {
      width: visual?.offsetWidth || VESSEL_DISPLAY_WIDTH,
      height: visual?.offsetHeight || VESSEL_DISPLAY_HEIGHT,
    };
  }

  function restoreSolidBrickLayout() {
    if (!solidBrickKey || !visual || !handle) {
      return;
    }

    const handleSize = getSolidBrickHandleSize(solidBrickKey);
    handle.style.width = `${handleSize.width}px`;
    handle.style.height = `${handleSize.height}px`;
    updateSolidBrickVisualSize(visual, fluidState.massG, solidBrickKey);
  }

  function clampPosition(left, top) {
    const { width } = getVesselSize();
    return {
      left: Math.max(0, Math.min(left, workspaceEl.clientWidth - width)),
      top: Math.max(0, top),
    };
  }

  function place(left, top) {
    const { left: x, top: y } = clampPosition(left, top);
    root.style.left = `${x}px`;
    root.style.top = `${y}px`;
    return { left: x, top: y };
  }

  function updatePoolBrickAppearance() {
    const immersed =
      isPoolMode() &&
      solidBrickKey &&
      fluidState.snappedBurnerIndex !== null &&
      isHeatSourceIndexActive(fluidState.snappedBurnerIndex);
    root.classList.toggle("vessel-draggable--pool-immersive", immersed);

    if (solidBrickKey) {
      restoreSolidBrickLayout();
    }

    syncPoolVisual();
    updatePoolMassVisibility();
    updatePoolBrickHitLayer();
    updatePoolWaterOverlay();
  }

  function updateStatsSide(burnerIndex) {
    root.classList.toggle(
      "vessel-draggable--stats-left",
      (!isPoolMode() && burnerIndex === 0 && sim.burnerCount === 2) ||
        (isPoolMode() && burnerIndex === 0 && sim.poolCount === 2)
    );
  }

  function snapToBurner(burnerIndex) {
    if (!isHeatSourceIndexActive(burnerIndex)) {
      return;
    }

    unsnapOtherVesselsOnBurner(burnerIndex, controller);
    const { width, height } = getVesselSize();
    const snapPos = getHeatSourceSnapPosition(
      burnerIndex,
      width,
      height,
      solidBrickKey
    );
    place(snapPos.left, snapPos.top);
    root.classList.add("is-snapped");
    fluidState.snappedBurnerIndex = burnerIndex;
    updatePoolBrickAppearance();
    updateStatsSide(burnerIndex);
    setBurnerFlame();
    updateHeatOutput();
    updateMassSliderLock();
    refreshBurnerControls();
  }

  function relocateBesidePool(poolIndex = 0) {
    const { width, height } = getVesselSize();
    const beside = getFluidVesselPlacementBesidePool(width, height, poolIndex);
    place(beside.left, beside.top);
  }

  function unsnap(options = {}) {
    const previousBurnerIndex = fluidState.snappedBurnerIndex;
    root.classList.remove("is-snapped");
    root.classList.remove("vessel-draggable--stats-left");
    root.classList.remove("vessel-draggable--pool-immersive");
    fluidState.snappedBurnerIndex = null;
    updatePoolBrickAppearance();

    if (options.relocateAside && previousBurnerIndex !== null) {
      const { width, height } = getVesselSize();
      const snapPos = getHeatSourceSnapPosition(
        previousBurnerIndex,
        width,
        height,
        solidBrickKey
      );
      place(Math.max(16, snapPos.left - 220), snapPos.top);
    }

    setBurnerFlame();
    updateHeatOutput();
    updateMassSliderLock();
    refreshBurnerControls();
  }

  function updateMassSliderLock() {
    if (!massSlider) return;
    const locked = isFluidHeating(fluidState) && !isPoolMode() && sim.burnerOn;
    massSlider.disabled = locked;
    massSlider.setAttribute("aria-disabled", locked ? "true" : "false");
  }

  function findSnapTarget(left, top) {
    const { width: vesselWidth, height: vesselHeight } = getVesselSize();
    return findNearestHeatSource(
      left,
      top,
      vesselWidth,
      vesselHeight,
      solidBrickKey
    );
  }

  function applyFluidVolume() {
    if (!densityGPerL) return;
    updateFluidVolume(visual, fluidState.massG, densityGPerL);
  }

  function applySolidBrickSize() {
    if (!solidBrickKey) return;
    updateSolidBrickVisualSize(visual, fluidState.massG, solidBrickKey);
    if (fluidState.snappedBurnerIndex !== null) {
      snapToBurner(fluidState.snappedBurnerIndex);
    }
  }

  function setMassG(grams) {
    if (isFluidHeating(fluidState) && sim.burnerOn) {
      return;
    }

    fluidState.massG = Math.max(
      MIN_MASS_G,
      Math.min(MAX_FLUID_MASS_G, grams)
    );
    if (massSlider && Number(massSlider.value) !== fluidState.massG) {
      massSlider.value = String(fluidState.massG);
    }
    if (massSlider) {
      massSlider.setAttribute("aria-valuenow", String(fluidState.massG));
      massSlider.setAttribute("aria-valuetext", formatMass(fluidState.massG));
    }
    applyFluidVolume();
    applySolidBrickSize();
    clampFluidHeat(fluidState, specificHeat, boilingPointC);
    controller.updateDisplay();
    syncPoolVisual();
    setBurnerFlame();
  }

  function updateDisplay() {
    if (massEl) {
      massEl.textContent = formatMass(fluidState.massG);
    }
    if (tempBadge) {
      const tempC = getFluidTempC(fluidState, specificHeat);
      tempBadge.textContent = formatFluidTemp(tempC);
      tempBadge.setAttribute(
        "aria-label",
        `${tempLabel}: ${formatFluidTemp(tempC)}`
      );
    }
    if (heatLostEl && sim.coolingOn) {
      heatLostEl.textContent = formatHeat(fluidState.heatLostJ);
    }
  }

  function setDragPosition(clientX, clientY) {
    setSupplyDropHighlight(isPointInSupply(clientX, clientY));
    root.style.left = `${clientX - dragOffsetX}px`;
    root.style.top = `${clientY - dragOffsetY}px`;
  }

  function finishDropOnWorkspace() {
    const workspaceRect = workspaceEl.getBoundingClientRect();
    const rect = root.getBoundingClientRect();
    const left = rect.left - workspaceRect.left;
    const top = rect.top - workspaceRect.top;

    root.classList.add("vessel-draggable--no-transition");
    root.classList.remove("is-dragging");
    const placed = place(left, top);
    requestAnimationFrame(() => {
      root.classList.remove("vessel-draggable--no-transition");
    });
    return placed;
  }

  function beginDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;

    const wasSnappedToActiveHeatSource =
      fluidState.snappedBurnerIndex !== null &&
      isHeatSourceIndexActive(fluidState.snappedBurnerIndex);

    const wasPoolBrick =
      solidBrickKey &&
      isPoolMode() &&
      wasSnappedToActiveHeatSource;
    const poolHitEl = event.target.closest?.(".pool-brick-hit");
    const fromPoolHit =
      wasPoolBrick &&
      poolHitEl &&
      Number(poolHitEl.dataset.poolIndex) === fluidState.snappedBurnerIndex;

    const clickX = event.clientX;
    const clickY = event.clientY;

    if (fromPoolHit) {
      const hitRect = poolHitEl.getBoundingClientRect();
      const ratioX = (clickX - hitRect.left) / hitRect.width;
      const ratioY = (clickY - hitRect.top) / hitRect.height;

      unsnap();
      root.classList.add("is-dragging");

      const visualRect = visual.getBoundingClientRect();
      dragOffsetX = ratioX * visualRect.width;
      dragOffsetY = ratioY * visualRect.height;
      setDragPosition(clickX, clickY);
    } else {
      const dragAnchor = solidBrickKey ? handle : root;
      const rect = dragAnchor.getBoundingClientRect();
      dragOffsetX = clickX - rect.left;
      dragOffsetY = clickY - rect.top;

      if (fluidState.snappedBurnerIndex !== null) {
        unsnap();
      }

      root.classList.add("is-dragging");
      setDragPosition(clickX, clickY);
    }

    activePointerId = event.pointerId;
    handle.setPointerCapture(event.pointerId);

    if (sim.burnerOn && wasSnappedToActiveHeatSource) {
      setBurnerOn(false);
    } else {
      setBurnerFlame();
    }

    event.preventDefault();
  }

  function onPointerDown(event) {
    beginDrag(event);
  }

  function onPointerMove(event) {
    if (activePointerId !== event.pointerId) return;
    setDragPosition(event.clientX, event.clientY);
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (activePointerId !== event.pointerId) return;

    handle.releasePointerCapture(event.pointerId);
    activePointerId = null;
    setSupplyDropHighlight(false);

    if (isPointInSupply(event.clientX, event.clientY)) {
      root.classList.remove("is-dragging");
      destroyVessel(controller);
      return;
    }

    let { left: placedLeft, top: placedTop } = finishDropOnWorkspace();

    if (
      isPoolMode() &&
      !solidBrickKey &&
      isPointerOverPool(event.clientX, event.clientY)
    ) {
      const { width, height } = getVesselSize();
      const beside = getFluidVesselPlacementBesidePool(width, height);
      ({ left: placedLeft, top: placedTop } = place(beside.left, beside.top));
      return;
    }

    let snapTarget = findSnapTarget(placedLeft, placedTop);
    const poolIndexAtPointer = findPoolIndexAt(event.clientX, event.clientY);
    const nearPoolBottom =
      solidBrickKey &&
      isPoolMode() &&
      poolIndexAtPointer !== null &&
      isSolidBrickNearPoolBottom(root, poolIndexAtPointer);

    if (nearPoolBottom) {
      const { width, height } = getVesselSize();
      snapTarget = {
        index: poolIndexAtPointer,
        snapPos: getHeatSourceSnapPosition(
          poolIndexAtPointer,
          width,
          height,
          solidBrickKey
        ),
        distance: 0,
      };
    }

    const allowSnap =
      snapTarget &&
      (!isPoolMode() ||
        (solidBrickKey &&
          shouldSnapSolidBrickToPool(event.clientX, event.clientY, root)));

    if (allowSnap) {
      snapToBurner(snapTarget.index);
    }
  }

  if (heatRow) {
    heatRow.hidden = !sim.coolingOn;
  }

  updatePoolMassVisibility();

  const controller = {
    root,
    heatRow,
    massRow,
    massControl,
    solidBrickKey,
    fluidState,
    fluidKey,
    specificHeat,
    boilingPointC,
    snapToBurner,
    unsnap,
    relocateBesidePool,
    beginDrag,
    updateDisplay,
    updateMassSliderLock,
    setMassG,
    refreshStatsSide() {
      if (fluidState.snappedBurnerIndex === null) {
        root.classList.remove("vessel-draggable--stats-left");
        return;
      }
      updateStatsSide(fluidState.snappedBurnerIndex);
    },
    onResize() {
      if (fluidState.snappedBurnerIndex !== null) {
        snapToBurner(fluidState.snappedBurnerIndex);
        return;
      }
      const left = parseFloat(root.style.left) || 0;
      const top = parseFloat(root.style.top) || 0;
      place(left, top);
    },
  };

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);
  handle.addEventListener("pointercancel", (event) => {
    setSupplyDropHighlight(false);
    onPointerUp(event);
  });

  const applyMass = () => setMassG(Number(massSlider.value));
  massSlider?.addEventListener("input", applyMass);
  massSlider?.addEventListener("change", applyMass);

  if (densityGPerL) {
    visual?.addEventListener("load", applyFluidVolume);
    if (visual?.contentDocument) {
      applyFluidVolume();
    }
  }

  setMassG(Number(massSlider?.value ?? fluidState.massG));
  updateMassSliderLock();

  if (initialLeft !== null) {
    const { width, height } = getVesselSize();
    const top =
      initialTop ??
      getHeatSourceSnapPosition(0, width, height, solidBrickKey).top;
    place(initialLeft, top);
  }

  return controller;
}

function updateCoolingButtons() {
  coolingButtons.forEach((button) => {
    const isOn = button.dataset.cooling === "on";
    const isActive = isOn === sim.coolingOn;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function updateHeatLostVisibility() {
  for (const controller of vesselControllers) {
    if (controller.heatRow) {
      controller.heatRow.hidden = !sim.coolingOn;
    }
  }
}

function updateCoolingAmbientInfo() {
  if (coolingAmbientInfo) {
    coolingAmbientInfo.hidden = !sim.coolingOn;
  }
  if (coolingAmbientValue) {
    coolingAmbientValue.textContent = formatFluidTemp(AMBIENT_TEMP_C);
  }
}

function setCoolingOn(on) {
  if (on && isPoolMode()) {
    return;
  }

  sim.coolingOn = on;
  updateCoolingButtons();
  updateHeatLostVisibility();
  updateCoolingAmbientInfo();
}

function initHeatSourceControls() {
  heatSourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setHeatSource(button.dataset.heatSource);
    });
  });

  updateHeatSourceUI();
  updatePoolWaterInfo();
  updatePoolMassVisibility();
  initPoolBrickHitControls();
}

function initPoolBrickHitControls() {
  poolBrickHitEls.forEach((poolBrickHitEl) => {
    poolBrickHitEl.addEventListener("pointerdown", (event) => {
      const poolIndex = Number(poolBrickHitEl.dataset.poolIndex);
      const controller = getPoolBrickOnPool(poolIndex);
      if (controller) {
        controller.beginDrag(event);
      }
    });
  });
}

/** Na tabletu zabrání posunu stránky při táhnutí po prázdné ploše. */
function initWorkspaceTouchLock() {
  if (!workspaceEl) {
    return;
  }

  const touchAllowedSelector =
    "input, button, select, textarea, label, .heat-source-btn, .cooling-btn, .burner-count-btn, .pool-count-btn, .burner-toggle, .vessel-mass-control, .vessel-mass-control__slider, .power-control";

  const shouldAllowTouch = (target) =>
    target instanceof Element && Boolean(target.closest(touchAllowedSelector));

  const blockTouchScroll = (event) => {
    if (shouldAllowTouch(event.target)) {
      return;
    }
    event.preventDefault();
  };

  workspaceEl.addEventListener("touchstart", blockTouchScroll, { passive: false });
  workspaceEl.addEventListener("touchmove", blockTouchScroll, { passive: false });
}

function initBurnerCountControls() {
  burnerCountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setBurnerCount(Number(button.dataset.burnerCount));
    });
  });

  setBurnerCount(1);
}

function initPoolCountControls() {
  poolCountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPoolCount(Number(button.dataset.poolCount));
    });
  });

  setPoolCount(1);
}

function initCoolingControls() {
  coolingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setCoolingOn(button.dataset.cooling === "on");
    });
  });

  setCoolingOn(false);
}

function initBurnerControls() {
  if (burners.length === 0) return;

  const applyFromSlider = () => setPowerW(Number(powerSlider.value));

  burners.forEach((burnerEl) => {
    burnerEl.addEventListener("load", setBurnerFlame);
  });
  powerSlider?.addEventListener("input", applyFromSlider);
  powerSlider?.addEventListener("change", applyFromSlider);

  burnerToggle?.addEventListener("click", () => {
    if (!hasVesselOnActiveHeatSource()) {
      return;
    }
    setBurnerOn(!sim.burnerOn);
  });

  updatePowerLabel();
  updatePowerSliderA11y();
  setBurnerOn(false);
  refreshBurnerControls();
  setPowerW(Number(powerSlider?.value ?? sim.powerW));

  burners.forEach((burnerEl) => {
    if (burnerEl.contentDocument) {
      setBurnerFlame();
    }
  });
}

function startThermalSimulation() {
  let lastTime = performance.now();

  function tick(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    let changed = false;
    let shouldShutOffBurner = false;

    for (const controller of vesselControllers) {
      const { fluidState, specificHeat, boilingPointC } = controller;
      if (fluidState.massG < MIN_MASS_G) {
        continue;
      }

      let heatGain = 0;
      let heatLoss = 0;
      const tempC = getFluidTempC(fluidState, specificHeat);
      const heatingOnBurner = isVesselReceivingHeat(
        fluidState,
        specificHeat,
        boilingPointC
      );

      if (heatingOnBurner && !isPoolMode()) {
        heatGain = sim.powerW * dt;
      }

      if (sim.coolingOn && tempC > AMBIENT_TEMP_C) {
        heatLoss = VESSEL_COOLING_UA_W_PER_K * (tempC - AMBIENT_TEMP_C) * dt;
      }

      if (heatGain > 0 || heatLoss > 0) {
        if (heatGain > 0) {
          fluidState.heatDeliveredJ += heatGain;
          fluidState.heatJ += heatGain;
          clampFluidHeat(fluidState, specificHeat, boilingPointC);
          if (
            !isPoolMode() &&
            hasReachedBoilingOrMelting(
              fluidState,
              specificHeat,
              boilingPointC
            )
          ) {
            shouldShutOffBurner = true;
          }
        }

        if (heatLoss > 0) {
          const heatBeforeCooling = fluidState.heatJ;
          fluidState.heatJ = Math.max(0, fluidState.heatJ - heatLoss);
          clampFluidHeat(fluidState, specificHeat, boilingPointC);
          fluidState.heatLostJ += heatBeforeCooling - fluidState.heatJ;
        }

        changed = true;
      } else if (
        !isPoolMode() &&
        heatingOnBurner &&
        hasReachedBoilingOrMelting(fluidState, specificHeat, boilingPointC)
      ) {
        shouldShutOffBurner = true;
      }
    }

    if (shouldShutOffBurner && !isPoolMode()) {
      setBurnerOn(false);
    }

    if (processPoolThermal(dt)) {
      changed = true;
    }

    if (isPoolMode()) {
      setBurnerFlame();
    }

    if (changed) {
      updateDisplays();
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

if (workspaceEl && setupEl) {
  initSupplyStrip();
  initWorkspaceTouchLock();

  window.addEventListener("resize", () => {
    for (const controller of vesselControllers) {
      controller.onResize();
    }
    updatePoolWaterOverlay();
    updatePoolBrickHitLayer();
    updatePoolFrontFrame();
  });
}

initHeatSourceControls();
pools.forEach((poolEl) => {
  poolEl.addEventListener("load", syncPoolVisual);
});
initBurnerCountControls();
initPoolCountControls();
initCoolingControls();
initBurnerControls();
startThermalSimulation();
