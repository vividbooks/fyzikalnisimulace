(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- Akvárium (souřadnice předlohy → viewBox 1200 × 800) ---------- */
  const S = 0.46;
  const OX = 85;
  const OY = 35;
  const A = (px, py) => ({ x: OX + S * px, y: OY + S * py });

  // Rozvržení: 'iso' (akvárium v perspektivě, polička vlevo) nebo 'flat' (2D akvárium, polička nahoře)
  const FLAT = document.body.dataset.layout === 'flat';
  const AQ2 = { x1: 80, x2: 1120, top: 290, surface: 390, bottom: 690, r: 26 };

  const C_L = FLAT ? { x: AQ2.x1, y: AQ2.top } : A(619.7, 244.0);
  const C_F = FLAT ? { x: (AQ2.x1 + AQ2.x2) / 2, y: AQ2.top } : A(1203.4, 576.7);
  const C_R = FLAT ? { x: AQ2.x2, y: AQ2.top } : A(2391.5, 346.8);
  const C_B = FLAT ? { x: (AQ2.x1 + AQ2.x2) / 2 + 1, y: AQ2.top } : A(1811.5, 10.6);
  const WO = FLAT ? AQ2.surface - AQ2.top : 317 * S;   // hladina pod horním okrajem
  const FO = FLAT ? AQ2.bottom - AQ2.top - 4 : 945 * S;   // dno pod horním okrajem

  // kapaliny stejné jako v simulaci Hydrostatická tlaková síla
  const LIQUIDS = {
    water: { rho: 1000, gen: 'vody', volume: '#58A1FF', volOp: 0.7, surface: '#206CE8', edge: '#163C78' },
    gasoline: { rho: 700, gen: 'benzínu', volume: '#F6EA9A', volOp: 0.85, surface: '#E0CC5A', edge: '#7A6A1E' },
    glycerol: { rho: 1300, gen: 'glycerolu', volume: '#8EBEFF', volOp: 0.8, surface: '#5B9AF0', edge: '#22508F' },
  };
  let liquid = 'water';
  let RHO_W = LIQUIDS.water.rho;
  const G = 1500;       // px/s²
  const C1 = 1.6;       // lineární odpor vody
  const CA = 0.3;       // součinitel přidané hmotnosti
  const ENTRY_LOSS = 0.4; // část rychlosti, která zůstane po dopadu na hladinu
  const C2 = 0.012;
  const G_REAL = 10;    // N/kg pro výpočet sil
  const COL_FG = '#E11D48';
  const COL_FVZ = '#0B6B2E';
  // společné měřítko pro všechny předměty, aby délky šipek odpovídaly velikosti sil
  const PX_PER_N_ISO = 80;  // px na 1 N
  const ARROW_MIN = 28;  // i malá nenulová síla musí být vidět
  const ARROW_MAX = 1200;
  const PX_PER_N = FLAT ? 60 : PX_PER_N_ISO;
  // délky obou šipek jednoho předmětu; u velmi malých sil se zvětší obě stejným poměrem,
  // aby byla vidět, ale zůstal zachovaný poměr F_G : F_vz
  function arrowLens(fg, fvz) {
    let lg = fg * PX_PER_N;
    let lv = fvz * PX_PER_N;
    const m = Math.max(lg, lv);
    if (m > 0 && m < ARROW_MIN) {
      const k = ARROW_MIN / m;
      lg *= k;
      lv *= k;
    }
    const fix = (l) => (l <= 0.05 ? 0 : Math.min(ARROW_MAX, Math.max(10, l)));
    return [fix(lg), fix(lv)];
  }
  let forcesOn = false;     // kvadratický odpor vody

  const lerpY = (P, Q, x) => P.y + ((x - P.x) / (Q.x - P.x)) * (Q.y - P.y);
  const yTop = (x) => (x <= C_B.x ? lerpY(C_L, C_B, x) : lerpY(C_B, C_R, x));
  const yBot = (x) => (x <= C_F.x ? lerpY(C_L, C_F, x) : lerpY(C_F, C_R, x));

  /* ---------- Předměty ---------- */
  const cube = (k, top, left, right, extra = '') => {
    const ar = 44 * k, al = 34 * k, v = 50 * k;
    const PR = [0.98 * ar, -0.19 * ar];
    const PL = [-0.87 * al, -0.5 * al];
    const dx = -(PL[0] + PR[0]) / 2;
    const p = (pt) => `${(pt[0] + dx).toFixed(1)} ${pt[1].toFixed(1)}`;
    const T0 = [0, -v], TR = [PR[0], PR[1] - v], TL = [PL[0], PL[1] - v], TB = [PL[0] + PR[0], PL[1] + PR[1] - v];
    return `<path d="M${p([0, 0])} L${p(PL)} L${p(TL)} L${p(T0)} Z" fill="${left}"/>` +
      `<path d="M${p([0, 0])} L${p(PR)} L${p(TR)} L${p(T0)} Z" fill="${right}"/>` +
      `<path d="M${p(T0)} L${p(TR)} L${p(TB)} L${p(TL)} Z" fill="${top}"/>` + extra;
  };

  const ITEMS = [
    {
      id: 'jablko', name: 'Jablko', m: 150, V: 200, w: 76, h: 67,
      svg: '<g transform="scale(0.30) translate(-162 -893)">' +
        '<path d="M287.513 763.265C285.959 806.925 254.846 875.634 219.161 895.266C200.876 905.333 180.631 884.469 158.241 883.681C133.472 882.803 109.802 900.73 91.1796 887.146C60.1296 864.524 36.3674 795.671 37.8443 754.415C40.1864 688.365 99.7653 668.432 165.815 670.774C231.866 673.116 289.874 697.221 287.532 763.271L287.513 763.265Z" fill="#F03B50"/>' +
        '<path d="M110 740C118 715 140 702 160 700" stroke="#ffffff" stroke-opacity="0.35" stroke-width="16" stroke-linecap="round" fill="none"/>' +
        '<path d="M159.037 691.648C159.037 691.648 146.76 653.386 167.418 625.172" stroke="#FFDD00" stroke-width="19.0484" stroke-miterlimit="10" stroke-linecap="round" fill="none"/>' +
        '<path d="M160.502 723.142C160.502 723.142 117.807 674.819 65.3449 746.423" stroke="#FF8158" stroke-width="19.0484" stroke-miterlimit="10" stroke-linecap="round" fill="none"/>' +
        '</g>',
    },
    {
      id: 'kamen', name: 'Kámen', m: 440, V: 200, w: 112, h: 60,
      svg: '<g transform="scale(1.19)"><path d="M-44 -6C-50 -22 -36 -44 -14 -48C6 -52 30 -46 40 -32C50 -18 44 -2 28 0C8 2 -30 4 -44 -6Z" fill="#8E9196"/>' +
        '<path d="M-40 -10C-20 -2 14 -2 40 -14C44 -4 36 0 28 0C8 2 -30 4 -44 -6Z" fill="#6E7176"/>' +
        '<path d="M-28 -34C-18 -42 0 -44 12 -40" stroke="#B9BCC1" stroke-width="6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="18" cy="-24" r="3" fill="#74777C"/><circle cx="-12" cy="-20" r="2.5" fill="#74777C"/></g>',
    },
    {
      id: 'drevo', name: 'Dřevěná kostka', m: 75, V: 125, w: 74, h: 60,
      svg: cube(1, '#F2C98A', '#D9A35C', '#C18640',
        '<path d="M-14 -40 l34 -6 M-12 -30 l30 -5" stroke="#B07A3A" stroke-width="2" stroke-linecap="round" opacity="0.6" transform="translate(8 0)"/>'),
    },
    {
      id: 'klic', name: 'Klíč', m: 16, V: 2, w: 88, h: 40,
      svg: '<g transform="scale(0.14) translate(-312 -288)"><path d="M434.353 150.919L156.619 57.9865L63.0866 33.2924L0 27.4619V60.7447L318.131 199.027" fill="#D9D9D9"/><path d="M434.353 117.631L363.246 109.264L342.326 79.9128L291.141 76.5864L266.835 48.977L177.927 48.4457L156.86 11.1389L125.208 7.48447L63.0866 0L0 27.4569L318.131 165.735" fill="#B0B0B0"/><path d="M457.979 123.794C366.484 123.794 292.305 160.676 292.305 206.155C292.305 251.64 366.484 288.517 457.979 288.517C549.479 288.517 623.654 251.64 623.654 206.155C623.654 160.676 549.479 123.794 457.979 123.794ZM530.99 222.219C517.643 222.219 505.843 219.004 498.465 214.046C505.843 209.094 517.643 205.874 530.99 205.874C544.337 205.874 556.141 209.094 563.52 214.046C556.141 219.004 544.337 222.219 530.99 222.219Z" fill="#D9D9D9"/><path d="M457.979 91.126C366.484 91.126 292.305 127.994 292.305 173.483C292.305 218.967 366.484 255.84 457.979 255.84C549.479 255.84 623.654 218.967 623.654 173.483C623.654 127.994 549.479 91.126 457.979 91.126ZM530.99 222.224C517.643 222.224 505.843 219.004 498.465 214.047C505.843 209.094 517.643 205.874 530.99 205.874C544.337 205.874 556.141 209.094 563.52 214.047C556.141 219.004 544.337 222.224 530.99 222.224Z" fill="#B0B0B0"/><path d="M563.52 214.051C568.505 210.706 571.49 206.576 571.49 202.089C571.49 190.974 553.356 181.96 530.991 181.96C508.625 181.96 490.496 190.974 490.496 202.089C490.496 206.576 493.481 210.706 498.466 214.051C505.844 209.098 517.643 205.869 530.991 205.869C544.338 205.869 556.142 209.098 563.52 214.051Z" fill="#6E6E6D"/><path d="M308.55 134.032L55.5566 22.9521" stroke="#858585" stroke-width="9.24008" stroke-linecap="round" stroke-linejoin="round"/><path d="M329.547 121.147L205.176 66.3809" stroke="#858585" stroke-width="9.24008" stroke-linecap="round" stroke-linejoin="round"/></g>',
    },
    {
      // 100 cm³ → hrana 4,6 cm (měřítko ~10 px na 1 cm)
      id: 'led', name: 'Kostka ledu', m: 92, V: 100, w: 68, h: 55,
      svg: cube(0.91, '#F2FBFF', '#CDEBFA', '#A9D8F2',
        '<path d="M-12 -33 l12 -20" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.9"/>'),
    },
    {
      id: 'vejce', name: 'Vajíčko', m: 65, V: 60, w: 66, h: 46,
      svg: '<path d="M-32 -22C-32 -38 -12 -46 4 -44C22 -42 34 -32 34 -22C34 -8 20 0 0 0C-20 0 -32 -8 -32 -22Z" fill="#F3E3CB"/>' +
        '<path d="M-24 -6C-10 2 18 2 30 -10C30 -4 20 0 0 0C-12 0 -20 -2 -24 -6Z" fill="#E2CBAA"/>' +
        '<ellipse cx="-10" cy="-32" rx="10" ry="5" fill="#ffffff" opacity="0.6" transform="rotate(-18 -10 -32)"/>',
    },
    {
      id: 'korek', name: 'Korková zátka', short: 'Korek', m: 7, V: 30, w: 38, h: 44,
      svg: '<path d="M-17 -40V-5A17 5 0 0 0 17 -5V-40Z" fill="#C68F52"/>' +
        '<ellipse cx="0" cy="-40" rx="17" ry="5" fill="#DDAE74"/>' +
        '<circle cx="-7" cy="-26" r="2" fill="#9C6B37"/><circle cx="6" cy="-16" r="2.2" fill="#9C6B37"/><circle cx="8" cy="-31" r="1.6" fill="#9C6B37"/><circle cx="-4" cy="-11" r="1.5" fill="#9C6B37"/>',
    },
    {
      id: 'kachna', name: 'Gumová kachnička', short: 'Kachnička', m: 25, V: 200, w: 82, h: 80,
      svg: '<g transform="scale(0.18) translate(-224 -482)"><path d="M85.9434 163.046C71.1916 157.059 35.3232 149.502 22.5552 216.787C9.79074 284.069 -47.1799 476.344 223.659 473.33C483.432 470.439 477.166 258.967 367.521 226.152C323.272 212.911 322.295 177.219 322.295 177.219L177.66 186.478C160.306 187.59 142.921 184.936 126.69 178.702L85.9434 163.046Z" fill="#FFDD00" stroke="#FF8157" stroke-width="17.65" stroke-miterlimit="10"/><path d="M226.638 320.879C142.55 311.344 12.9463 250.173 48.8675 352.091" fill="#FFDD00" stroke="#FF8157" stroke-width="17.65" stroke-miterlimit="10" stroke-linecap="round"/><path opacity="0.2" d="M351.257 223.706C372.444 231.814 382.946 267.213 259.463 276.772C135.976 286.328 26.91 170.628 159.003 186.549C291.092 202.466 351.257 223.706 351.257 223.706Z" fill="#1D1D1B"/><path d="M397.81 107.389C410.381 173.188 367.223 236.717 301.424 249.284C235.624 261.851 172.095 218.7 159.528 152.901C146.958 87.0981 190.112 23.5687 255.915 11.0019C321.711 -1.56487 385.24 41.5859 397.81 107.389Z" fill="#FFDD00" stroke="#FF8157" stroke-width="17.65" stroke-miterlimit="10"/><path d="M412.781 145.163C412.781 145.163 425.002 135.441 421.37 116.422C417.737 97.4022 384.495 91.0764 366.146 103.731C366.146 103.731 347.201 91.1611 328.863 94.6629C310.517 98.1682 255.364 163.258 264.278 191.48C273.187 219.699 390.278 167.413 390.278 167.413L412.781 145.163Z" fill="#EF3A50"/><path d="M264.07 192.224C270.276 211.809 298.795 222.904 332.658 212.215C366.521 201.522 434.59 180.074 414.498 143.076C414.498 143.076 388.016 138.981 364.089 153.762C340.159 168.542 302.794 199.613 276.461 194.434L264.07 192.224Z" fill="#813A50"/><path d="M361.363 53.2057C367.219 65.243 365.666 78.0675 357.893 81.8481C350.117 85.6323 339.068 78.9394 333.211 66.9021C327.355 54.8648 328.912 42.0403 336.685 38.2597C344.458 34.4755 355.51 41.1684 361.363 53.2057Z" fill="#1D1D1B"/><path d="M270.915 91.0475C276.772 103.085 275.218 115.909 267.445 119.693C259.665 123.474 248.62 116.781 242.76 104.744C236.904 92.7066 238.46 79.8821 246.237 76.1015C254.01 72.3173 265.059 79.0102 270.915 91.0475Z" fill="#1D1D1B"/></g>',
    },
    {
      // neznámý předmět – černá koule, hmotnost a objem si nastaví uživatel
      id: 'neznamy', name: 'Neznámý předmět', short: 'Neznámý', m: 240, V: 300, w: 60, h: 60, custom: true, svg: '',
    },
  ];
  function updateDamping() {
    ITEMS.forEach((it) => {
      // plovoucí předměty tlumíme skoro kriticky, aby se jen pohoupaly a nevyskakovaly
      it.cLin = it.rho < RHO_W ? Math.max(C1, 1.5 * Math.sqrt((G * RHO_W) / (it.rho * it.h))) : C1;
    });
  }
  // tvar neznámé koule podle objemu (poloměr roste s třetí odmocninou)
  function sphereShape(it) {
    // stejné měřítko jako ostatní předměty (~10 px na 1 cm): průměr koule d = ∛(6V/π) cm
    const r = 5 * Math.cbrt((6 * it.V) / Math.PI);
    it.w = 2 * r;
    it.h = 2 * r;
    it.svg = `<circle cx="0" cy="${(-r).toFixed(1)}" r="${r.toFixed(1)}" fill="#1D1D1B"/>` +
      `<ellipse cx="${(-r * 0.38).toFixed(1)}" cy="${(-r * 1.42).toFixed(1)}" rx="${(r * 0.3).toFixed(1)}" ry="${(r * 0.17).toFixed(1)}" ` +
      `fill="#ffffff" opacity="0.35" transform="rotate(-35 ${(-r * 0.38).toFixed(1)} ${(-r * 1.42).toFixed(1)})"/>` +
      `<text x="0" y="${(-r * 0.62).toFixed(1)}" text-anchor="middle" font-size="${(r * 1.05).toFixed(1)}" font-weight="600" fill="#ffffff" opacity="0.85">?</text>`;
  }
  ITEMS.forEach((it) => {
    it.rho = (it.m / it.V) * 1000;
    if (it.custom) sphereShape(it);
  });
  updateDamping();

  /* ---------- Polička ---------- */
  const SHELF_X = [95, 255];
  const SHELF_Y = FLAT ? [150] : [150, 300, 450, 600, 750];
  ITEMS.forEach((it, i) => {
    it.slot = FLAT
      ? { x: 95 + i * (1010 / (ITEMS.length - 1)), y: SHELF_Y[0] - 1 }
      : { x: SHELF_X[i % 2], y: SHELF_Y[Math.floor(i / 2)] - 1 };
  });

  /* ---------- DOM ---------- */
  const stage = document.getElementById('stage');
  const hintEl = document.getElementById('hintEl');
  const btnReset = document.getElementById('btnReset');
  const card = {
    root: document.getElementById('objCard'),
    name: document.getElementById('objName'),
    m: document.getElementById('objMass'),
    V: document.getElementById('objVol'),
    rho: document.getElementById('objRho'),
    verdict: document.getElementById('objVerdict'),
    forces: document.getElementById('objForces'),
    fg: document.getElementById('objFG'),
    fvz: document.getElementById('objFvz'),
  };

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const fmt = (v) => {
    const r = Math.round(v);
    return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  /* ---------- Sestavení scény ---------- */
  const defs = el('defs', {}, stage);
  defs.innerHTML =
    // pod vodou: viděno skrz hladinu (tmavší modrá #206CE8) …
    '<filter id="uw-surface" color-interpolation-filters="sRGB">' +
    '<feColorMatrix id="uwSurfaceMx" type="matrix" values="0.55 0 0 0 0.056  0 0.55 0 0 0.19  0 0 0.55 0 0.41  0 0 0 1 0"/>' +
    '</filter>' +
    // … nebo skrz přední stěnu (světlejší modrá #58A1FF)
    '<filter id="uw-front" color-interpolation-filters="sRGB">' +
    '<feColorMatrix id="uwFrontMx" type="matrix" values="0.62 0 0 0 0.13  0 0.62 0 0 0.24  0 0 0.62 0 0.38  0 0 0 1 0"/>' +
    '</filter>' +
    // světlá linka hladiny přesně ve tvaru předmětu
    '<filter id="waterline" color-interpolation-filters="sRGB">' +
    '<feFlood flood-color="#EEF6FF"/><feComposite in2="SourceAlpha" operator="in"/>' +
    '</filter>';

  const L = {};
  L.shelf = el('g', {}, stage);
  L.back = el('g', {}, stage);
  L.ripples = el('g', {}, stage);
  L.water = el('g', {}, stage);
  L.front = el('g', {}, stage);
  L.top = el('g', {}, stage);
  L.forces = el('g', { class: 'forces' }, stage);
  L.drops = el('g', {}, stage);

  const T = `translate(${OX} ${OY}) scale(${S})`;
  if (FLAT) {
    const { x1, x2, top, surface, bottom, r } = AQ2;
    const wet = `M${x1} ${surface}H${x2}V${bottom - r}Q${x2} ${bottom} ${x2 - r} ${bottom}H${x1 + r}Q${x1} ${bottom} ${x1} ${bottom - r}Z`;
    L.back.innerHTML =
      `<path d="${wet}" class="liq-volume" fill="#58A1FF" fill-opacity="0.7"/>` +
      `<rect x="${x1}" y="${surface}" width="${x2 - x1}" height="7" class="liq-surface" fill="#206CE8" fill-opacity="0.8"/>` +
      '<path class="liq-edge" d="" fill="none"/>' +
      `<g id="densityLabel" font-size="26" fill="#334155" text-anchor="middle"></g>`;
    L.front.innerHTML =
      `<path d="M${x1} ${top}V${bottom - r}Q${x1} ${bottom} ${x1 + r} ${bottom}H${x2 - r}Q${x2} ${bottom} ${x2} ${bottom - r}V${top}" ` +
      'fill="none" stroke="#0D0C0D" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
  } else {
  L.back.innerHTML =
    `<g transform="${T}">` +
    '<path d="M2384.54 349.119L1811.54 10.6191L619.662 244.009M1811.54 10.6191V329.119" stroke="#0D0C0D" stroke-width="21.2381" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M619.666 560.694V1199.01C619.666 1199.01 629.351 1256.41 661.353 1280.9C693.355 1305.4 1097.77 1540.77 1097.77 1540.77C1097.77 1540.77 1157.57 1602.39 1310.6 1573.1C1463.63 1543.81 2343.54 1373.52 2343.54 1373.52L2385.88 1341.76L2391.45 1290.57V663.483C2391.45 663.483 2365.19 653.621 2302.5 615.818C2286.33 606.066 2266.18 594.618 2220.42 564.22C2188.43 542.982 2135.08 512.512 2095.25 489.228C2027.12 449.407 1956.91 413.638 1904.71 382.418C1855.23 352.826 1815.93 331.712 1815.93 331.712L619.666 560.694Z" class="liq-volume" fill="#58A1FF" fill-opacity="0.7"/>' +
    '<path d="M618.664 561.076L774.633 646.195L977.489 758.506L1203.4 882.801L1428.42 841.369L1751.95 782.919L2105.2 717.459L2392.45 663.865L2229.53 569.483L2004.39 439.325L1816.32 330.094L1559.88 378.822L1146.28 457.919L810.037 524.168L618.664 561.076Z" class="liq-surface" fill="#206CE8" fill-opacity="0.8"/>' +
    // zadní hrany pod hladinou – prosvítají vodou
    '<path d="M1811.5 335V965.6M622 1199L1811.5 965.6L2389 1300" class="liq-edge" stroke="#163C78" stroke-opacity="0.55" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '</g>';
  L.front.innerHTML =
    `<g transform="${T}" stroke="#0D0C0D" stroke-width="21.2381" stroke-linecap="round" stroke-linejoin="round" fill="none">` +
    '<path d="M2328.71 1378.22L1272.09 1580.47C1236.69 1587.93 1203.39 1560.92 1203.39 1524.74V576.729L2391.45 346.791V1300.89C2391.45 1338.26 2365.27 1370.52 2328.71 1378.22Z"/>' +
    '<path d="M1114.06 1551.52C1145.92 1567.01 1183.61 1599.24 1272.09 1580.47"/>' +
    '<path d="M619.662 244.009L1203.4 576.736V1503.69C1203.4 1545.81 1159.25 1573.36 1121.42 1554.85L676.442 1289.99C641.697 1272.99 619.662 1237.7 619.662 1199.02V244.009Z"/>' +
    '</g>';
  }

  // polička
  let shelfHtml = '';
  const shelfX = FLAT ? 30 : 22;
  const shelfW = FLAT ? 1140 : 306;
  for (const y of SHELF_Y) {
    shelfHtml += `<rect x="${shelfX}" y="${y}" width="${shelfW}" height="14" rx="4" fill="#C9A36B"/>`;
    shelfHtml += `<rect x="${shelfX}" y="${y + 10}" width="${shelfW}" height="4" rx="2" fill="#A47F4A"/>`;
  }
  ITEMS.forEach((it) => {
    const label = FLAT && it.short ? it.short : it.name;
    shelfHtml += `<text x="${it.slot.x}" y="${it.slot.y + 40}" text-anchor="middle" font-size="${FLAT ? 15 : 18}" fill="#475569">${label}</text>`;
  });
  L.shelf.innerHTML = shelfHtml;

  // předměty
  for (const it of ITEMS) {
    const ca = el('clipPath', { id: `ca-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipA = el('path', {}, ca);
    const cb = el('clipPath', { id: `cb-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipB = el('path', {}, cb);
    const cs = el('clipPath', { id: `cs-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipS = el('path', {}, cs);
    const cf = el('clipPath', { id: `cf-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipF = el('path', {}, cf);
    const cl = el('clipPath', { id: `cl-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipL = el('path', {}, cl);

    it.g = el('g', { class: 'item', 'data-id': it.id }, L.top);
    it.hit = el('rect', { fill: 'transparent' }, it.g);
    const a = el('g', { 'clip-path': `url(#ca-${it.id})` }, it.g);
    const b = el('g', { 'clip-path': `url(#cb-${it.id})` }, it.g);
    const b1 = el('g', { 'clip-path': `url(#cs-${it.id})`, filter: 'url(#uw-surface)' }, b);
    const b2 = el('g', { 'clip-path': `url(#cf-${it.id})`, filter: 'url(#uw-front)' }, b);
    const l = el('g', { 'clip-path': `url(#cl-${it.id})`, filter: 'url(#waterline)', opacity: 0.85 }, it.g);
    it.layers = [a, b1, b2, l];
    applyShape(it);

    it.phase = 'shelf';
    it.x = it.slot.x;
    it.y = it.slot.y;
    it.vy = 0;
    it.y0 = 0;
    it.wet = false;
    it.sub = 0;
    it.arrows = {
      g: el('g', { opacity: 0 }, L.forces),
    };
    it.arrows.fg = makeArrow(it.arrows.g, COL_FG, 'G');
    it.arrows.fvz = makeArrow(it.arrows.g, COL_FVZ, 'vz');
    placeItem(it);
  }

  /* ---------- Šipky sil ---------- */
  function makeArrow(parent, color, sub) {
    const g = el('g', {}, parent);
    const shaft = el('path', { fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    // otevřený hrot (dvě čárky)
    const head = el('path', { fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    const text = el('text', { 'font-size': 20, fill: color }, g);
    text.innerHTML = `<tspan font-style="italic">F</tspan><tspan font-size="14" dy="5">${sub}</tspan>`;
    return { g, shaft, head, text };
  }

  function setArrow(a, x, y, len, dir) {
    if (len <= 0) { a.g.setAttribute('opacity', 0); return; }
    a.g.setAttribute('opacity', 1);
    const hl = Math.min(11, len * 0.6);
    const hw = Math.min(8, hl * 0.8);
    const yEnd = y + dir * len;
    const yBack = y + dir * (len - hl);
    a.shaft.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}V${yEnd.toFixed(1)}`);
    a.head.setAttribute('d', `M${(x - hw).toFixed(1)} ${yBack.toFixed(1)}L${x.toFixed(1)} ${yEnd.toFixed(1)}L${(x + hw).toFixed(1)} ${yBack.toFixed(1)}`);
    a.text.setAttribute('x', (x + 9).toFixed(1));
    // u krátkých šipek drž popisky od sebe (F_vz nad středem, F_G pod ním)
    const ty = dir > 0 ? Math.max(yEnd - 2, y + 26) : Math.min(yEnd + 14, y - 10);
    a.text.setAttribute('y', ty.toFixed(1));
  }

  const forceFG = (it) => (it.m / 1000) * G_REAL;
  const forceFvz = (it) => RHO_W * (it.V * 1e-6) * it.sub * G_REAL;
  const fmtN = (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1)).replace('.', ',');

  function updateForces() {
    for (const it of ITEMS) {
      // tíhová síla je vidět všude (i na poličce), vztlaková jen v kapalině
      const show = forcesOn;
      it.arrows.g.setAttribute('opacity', show ? 1 : 0);
      if (!show) continue;
      const cx = it.x;
      const cy = it.y - it.h / 2;
      const fg = forceFG(it);
      const fvz = inLiquid(it) ? forceFvz(it) : 0;
      const [lg, lv] = arrowLens(fg, fvz);
      setArrow(it.arrows.fg, cx, cy, lg, 1);
      setArrow(it.arrows.fvz, cx, cy, lv, -1);
    }
    // výsledek (plave / klesne) jen když je vybraný předmět v kapalině
    if (selected) {
      const want = isSettled(selected);
      if (want === card.verdict.hidden) showCard(selected);
    }
    if (selected && forcesOn) {
      card.forces.hidden = false;
      card.fg.textContent = fmtN(forceFG(selected));
      card.fvz.textContent = fmtN(inLiquid(selected) ? forceFvz(selected) : 0);
    } else {
      card.forces.hidden = true;
    }
  }

  // výsledek (plave / klesne) ukazujeme až po ustálení předmětu v kapalině
  function isSettled(it) { return it.phase === 'water' && (it.calm || 0) > 0.4; }

  function inLiquid(it) { return it.phase === 'water' || it.phase === 'fall' || it.phase === 'hold'; }

  function applyShape(it) {
    it.layers.forEach((g) => { g.innerHTML = it.svg; });
    it.hit.setAttribute('x', -it.w / 2 - 8);
    it.hit.setAttribute('y', -it.h - 30);
    it.hit.setAttribute('width', it.w + 16);
    it.hit.setAttribute('height', it.h + 36);
  }

  function placeItem(it) {
    it.g.setAttribute('transform', `translate(${it.x.toFixed(2)} ${it.y.toFixed(2)})`);
    let wl = 1000;
    if (inLiquid(it)) wl = it.y0 + WO - it.y;
    // hladina protíná předmět v elipse (pohled shora šikmo) – vidíme její přední oblouk
    const W = it.w / 2 + 8;
    // oblouk nesmí klesnout pod ponořenou část (jinak u mělce ponořených předmětů zmizí)
    const ry = FLAT ? '0' : Math.max(1, Math.min(W * 0.3, Math.max(0, -wl) * 0.55)).toFixed(2);
    const y1 = wl.toFixed(2);
    const y2 = (wl + 3).toFixed(2);
    it.clipA.setAttribute('d', `M${-W} -600H${W}V${y1}A${W} ${ry} 0 0 1 ${-W} ${y1}Z`);
    it.clipB.setAttribute('d', `M${-W} ${y1}A${W} ${ry} 0 0 0 ${W} ${y1}V600H${-W}Z`);
    // hranice mezi pohledem skrz hladinu a skrz přední stěnu = přední hrana hladiny
    const e = (lx) => (yBot(it.x + lx) + WO - it.y).toFixed(2);
    const fx = C_F.x - it.x;
    const mid = fx > -W && fx < W ? `L${fx.toFixed(2)} ${e(fx)}` : '';
    const midRev = mid;
    it.clipS.setAttribute('d', `M${-W} -600H${W}V${e(W)}${midRev}L${-W} ${e(-W)}Z`);
    it.clipF.setAttribute('d', `M${-W} ${e(-W)}${mid}L${W} ${e(W)}V600H${-W}Z`);
    it.clipL.setAttribute('d', `M${-W} ${y1}A${W} ${ry} 0 0 0 ${W} ${y1}V${y2}A${W} ${ry} 0 0 1 ${-W} ${y2}Z`);
  }

  /* ---------- Karta předmětu ---------- */
  let selected = null;
  function showCard(it) {
    selected = it;
    card.root.classList.toggle('obj-card--empty', !it);
    if (!it) {
      card.name.textContent = 'Vyber předmět na poličce';
      return;
    }
    card.name.textContent = it.name;
    card.m.textContent = fmt(it.m);
    card.V.textContent = fmt(it.V);
    card.rho.textContent = fmt(Math.round(it.rho / 10) * 10);
    customCtrl.hidden = !it.custom;
    if (it.custom) {
      massSlider.value = it.m;
      volSlider.value = it.V;
      massOut.textContent = `${fmt(it.m)} g`;
      volOut.textContent = `${fmt(it.V)} cm³`;
      [massSlider, volSlider].forEach(setFill);
    }
    if (isSettled(it)) {
      const floats = it.rho < RHO_W;
      card.verdict.hidden = false;
      card.verdict.className = `obj-card__verdict ${floats ? 'obj-card__verdict--float' : 'obj-card__verdict--sink'}`;
      card.verdict.innerHTML = floats
        ? `Plave — ponořeno ${Math.round((it.rho / RHO_W) * 100)} % objemu`
        : 'Klesne ke dnu';
    } else {
      card.verdict.hidden = true;
    }
  }

  /* ---------- Neznámý předmět: nastavení hmotnosti a objemu ---------- */
  const customCtrl = document.getElementById('customCtrl');
  const massSlider = document.getElementById('customMass');
  const volSlider = document.getElementById('customVol');
  const massOut = document.getElementById('customMassValue');
  const volOut = document.getElementById('customVolValue');
  function setFill(inp) {
    const min = Number(inp.min), max = Number(inp.max);
    inp.style.setProperty('--fill', `${((Number(inp.value) - min) / (max - min)) * 100}%`);
  }
  function onCustomInput() {
    const it = ITEMS.find((i) => i.custom);
    it.m = Number(massSlider.value);
    it.V = Number(volSlider.value);
    it.rho = (it.m / it.V) * 1000;
    it.calm = 0;
    sphereShape(it);
    applyShape(it);
    updateDamping();
    if (it.phase === 'water' && !drag) it.phase = 'water';
    placeItem(it);
    showCard(it);
  }
  massSlider.addEventListener('input', onCustomInput);
  volSlider.addEventListener('input', onCustomInput);

  /* ---------- Hod do vody ---------- */
  function columnFor(it, rx, ry) {
    const xmin = C_L.x + it.w / 2 + 14;
    const xmax = C_R.x - it.w / 2 - 14;
    const x = Math.min(xmax, Math.max(xmin, rx));
    const m = 16 + it.w * 0.12;
    let top = yTop(x) + m;
    let bot = yBot(x) - m;
    if (top > bot) { const mid = (top + bot) / 2; top = mid; bot = mid; }
    let y0;
    if (ry >= top && ry <= bot) y0 = ry;
    else if (ry > bot) y0 = bot;
    else y0 = (top + bot) / 2;
    return { x, y0 };
  }

  // klepnutím hozený předmět dopadne co nejdál od ostatních
  function freeSpot(it) {
    const others = ITEMS.filter((o) => o !== it && (o.phase === 'water' || o.phase === 'fall'));
    let best = null;
    let bestD = -1;
    for (let k = 0; k < 24; k++) {
      const rx = C_L.x + 120 + Math.random() * (C_R.x - C_L.x - 240);
      const col = columnFor(it, rx, yTop(rx) + Math.random() * (yBot(rx) - yTop(rx)));
      let d = 1e9;
      for (const o of others) d = Math.min(d, Math.hypot(o.x - col.x, (o.y0 - col.y0) * 2));
      if (d > bestD) { bestD = d; best = col; }
    }
    return best;
  }

  // předmět spadne do vody jen tehdy, když je puštěn nad otvorem akvária
  // (nad horní hranou přední stěny); jinak se vrátí na poličku
  function overAquarium(x, y) {
    // 2D: kdekoli nad akváriem i v něm (předmět spadne / vyplave z místa puštění)
    // (puštění zpátky na poličku – pás u poličky – vrací předmět na místo)
    if (FLAT) return x > AQ2.x1 && x < AQ2.x2 && y > SHELF_Y[0] + 45 && y <= AQ2.bottom;
    return x > C_L.x + 10 && x < C_R.x - 10 && y <= yBot(x);
  }

  function moveToLayer(it, layer) {
    if (it.g.parentNode !== layer) layer.appendChild(it.g);
  }

  function throwTo(it, col, arc) {
    it.y0 = col.y0;
    const startY = col.y0 - 70;
    if (!arc) {
      // puštěný předmět jen padá dolů (případně se trochu posune do strany, aby se vešel do akvária)
      if (Math.abs(it.x - col.x) < 1) startFall(it, 0);
      else tween(it, { x: col.x, y: it.y }, 160, 0, () => startFall(it, 0));
      return;
    }
    tween(it, { x: col.x, y: Math.min(startY, it.y < startY ? it.y : startY) }, arc ? 620 : 260, arc ? 110 : 0, () => startFall(it, arc ? 180 : 0));
  }

  function startFall(it, vy) {
    it.phase = 'fall';
    it.vy = vy;
    moveToLayer(it, L.water);
    sortWater();
  }

  function sortWater() {
    const list = ITEMS.filter((i) => i.g.parentNode === L.water).sort((a, b) => a.y0 - b.y0);
    list.forEach((i) => L.water.appendChild(i.g));
  }

  function tween(it, to, dur, lift, done) {
    it.phase = 'tween';
    it.tw = { fx: it.x, fy: it.y, tx: to.x, ty: to.y, t0: performance.now(), dur, lift, done };
  }

  function goHome(it) {
    it.wet = false;
    moveToLayer(it, L.top);
    tween(it, { x: it.slot.x, y: it.slot.y }, 450, 60, () => { it.phase = 'shelf'; placeItem(it); });
  }

  /* ---------- Šplouchnutí ---------- */
  const drops = [];
  const ripples = [];
  function splash(x, y, strength) {
    const n = Math.round(6 + strength * 10);
    for (let i = 0; i < n; i++) {
      const c = el('circle', { r: (2.5 + Math.random() * 3.5).toFixed(1), fill: LIQUIDS[liquid].volume }, L.drops);
      drops.push({ c, x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 260 * (0.5 + strength),
        vy: -(140 + Math.random() * 300 * (0.4 + strength)), y0: y });
    }
    addRipple(x, y, 1);
  }
  function addRipple(x, y, k) {
    for (let j = 0; j < 2; j++) {
      const r = el('ellipse', {
        cx: 0, cy: 0, rx: 1, ry: 1, fill: 'none', stroke: '#DCEBFF', 'stroke-width': 3,
        'vector-effect': 'non-scaling-stroke',
      }, L.ripples);
      ripples.push({ r, x, y, t: -j * 0.18, k });
    }
  }

  /* ---------- Smyčka ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;

    for (const it of ITEMS) {
      if (it.phase === 'tween') {
        const tw = it.tw;
        const t = Math.min(1, (now - tw.t0) / tw.dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        it.x = tw.fx + (tw.tx - tw.fx) * e;
        it.y = tw.fy + (tw.ty - tw.fy) * e - Math.sin(Math.PI * t) * tw.lift;
        placeItem(it);
        if (t >= 1) { it.phase = 'idle'; tw.done(); }
      } else if (it.phase === 'fall' || it.phase === 'water') {
        const sY = it.y0 + WO;
        const fl = it.y0 + FO - 6;
        const prev = it.y;
        const s = Math.max(0, Math.min(1, (it.y - sY) / it.h));
        it.sub = s;
        let a = G * (1 - (s * RHO_W) / it.rho);
        if (s > 0) a -= (it.cLin * it.vy + C2 * it.vy * Math.abs(it.vy)) * s;
        // přidaná hmotnost strhávané vody – lehké předměty se nevymrští nad hladinu
        a /= 1 + CA * s * (RHO_W / it.rho);
        it.vy += a * dt;
        it.y += it.vy * dt;
        if (it.y > fl) {
          it.y = fl;
          it.vy = it.vy > 50 ? -it.vy * 0.2 : 0;
        }
        if (prev < sY && it.y >= sY) it.vy *= ENTRY_LOSS;
        if (prev < sY && it.y >= sY && it.vy > 40) {
          splash(it.x, sY, Math.min(1, it.vy / 330) * Math.min(1.2, it.m / 200 + 0.4));
        }
        if (!it.wet && it.y >= sY) {
          it.wet = true;
          it.phase = 'water';
        }
        // ustálení: předmět v kapalině se skoro nehýbe aspoň 0,4 s
        if (it.phase === 'water' && Math.abs(it.vy) < 6) it.calm = (it.calm || 0) + dt;
        else it.calm = 0;
        placeItem(it);
      }
    }

    updateForces();

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy += G * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > d.y0 + 4 && d.vy > 0) { d.c.remove(); drops.splice(i, 1); continue; }
      d.c.setAttribute('cx', d.x.toFixed(1));
      d.c.setAttribute('cy', d.y.toFixed(1));
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt;
      if (r.t < 0) { r.r.setAttribute('opacity', 0); continue; }
      const life = 1.1;
      if (r.t > life) { r.r.remove(); ripples.splice(i, 1); continue; }
      const rad = 10 + r.t * 70 * r.k;
      r.r.setAttribute('transform', FLAT
        ? `matrix(1 0 0 0.16 ${r.x.toFixed(1)} ${r.y.toFixed(1)})`
        : `matrix(0.982 -0.19 -0.74 -0.42 ${r.x.toFixed(1)} ${r.y.toFixed(1)})`);
      r.r.setAttribute('rx', rad.toFixed(1));
      r.r.setAttribute('ry', rad.toFixed(1));
      r.r.setAttribute('opacity', (0.9 * (1 - r.t / life)).toFixed(2));
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Ovládání myší / dotykem ---------- */
  function toSvg(e) {
    const pt = stage.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(stage.getScreenCTM().inverse());
  }

  let drag = null;
  let interacted = false;
  function hideHint() {
    if (interacted) return;
    interacted = true;
    hintEl.classList.add('is-hidden');
  }

  stage.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.item');
    if (!g) return;
    const it = ITEMS.find((i) => i.id === g.dataset.id);
    if (!it || it.phase === 'tween') return;
    hideHint();
    e.preventDefault();
    const p = toSvg(e);
    const from = it.phase;
    it.calm = 0;
    drag = { it, dx: it.x - p.x, dy: it.y - p.y, sx: p.x, sy: p.y, moved: false, from,
      mode: 'free', lastY: it.y, lastT: performance.now(), vy: 0 };
    if (from === 'water' || from === 'fall') {
      // předmět v kapalině držíme v akváriu – jde ho ponořit pod hladinu
      drag.mode = 'aq';
      it.phase = 'hold';
      it.vy = 0;
    } else {
      it.phase = 'drag';
      it.wet = false;
      moveToLayer(it, L.top);
    }
    g.classList.add('is-dragging');
    stage.setPointerCapture(e.pointerId);
    showCard(it);
    placeItem(it);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toSvg(e);
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
    const it = drag.it;
    let x = p.x + drag.dx;
    let y = p.y + drag.dy;
    if (drag.mode === 'aq') {
      if (y < it.y0 - 40) {
        // vytažen nad akvárium → volné přenášení
        drag.mode = 'free';
        it.phase = 'drag';
        it.wet = false;
        moveToLayer(it, L.top);
      } else {
        const col = columnFor(it, x, it.y0);
        x = col.x;
        it.y0 = col.y0;
        y = Math.min(y, it.y0 + FO - 6);
        it.sub = Math.max(0, Math.min(1, (y - (it.y0 + WO)) / it.h));
        const now = performance.now();
        const dt = Math.max(0.008, (now - drag.lastT) / 1000);
        drag.vy = (y - drag.lastY) / dt;
        drag.lastY = y;
        drag.lastT = now;
      }
    }
    it.x = x;
    it.y = y;
    placeItem(it);
  });

  function endDrag(e) {
    if (!drag) return;
    const { it, moved, from } = drag;
    const lastVy = drag.vy || 0;
    drag = null;
    it.g.classList.remove('is-dragging');
    try { stage.releasePointerCapture(e.pointerId); } catch (_) { /* nic */ }

    if (it.phase === 'hold') {
      // puštění v akváriu – dál už jen fyzika (lehké vyplavou, těžké klesnou)
      it.vy = Math.max(-500, Math.min(500, lastVy));
      it.phase = it.y >= it.y0 + WO ? 'water' : 'fall';
      it.wet = it.phase === 'water';
      sortWater();
      return;
    }
    if (!moved) {
      if (from === 'shelf') {
        // klepnutím na předmět na poličce se jen zobrazí informace o něm
        it.phase = 'shelf';
        moveToLayer(it, L.top);
        placeItem(it);
      } else {
        // klepnutí na předmět ve vodě → nech ho být
        it.wet = true;
        it.phase = 'water';
        moveToLayer(it, L.water);
        sortWater();
      }
      return;
    }
    const cx = it.x;
    const cy = it.y;
    if (overAquarium(cx, cy)) {
      throwTo(it, columnFor(it, cx, cy), false);
    } else {
      goHome(it);
    }
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  btnReset.addEventListener('click', () => {
    hideHint();
    for (const it of ITEMS) {
      if (it.phase !== 'shelf') goHome(it);
    }
  });

  /* ---------- Kapalina ---------- */
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mixMatrix = (color, k) => {
    const c = hex(color);
    const a = (1 - k).toFixed(3);
    return `${a} 0 0 0 ${(c[0] * k).toFixed(3)}  0 ${a} 0 0 ${(c[1] * k).toFixed(3)}  0 0 ${a} 0 ${(c[2] * k).toFixed(3)}  0 0 0 1 0`;
  };
  const densityEl = document.getElementById('liquidDensity');
  const densityNote = document.getElementById('liquidNote');

  // ve 2D je hustota kapaliny přímo nad akváriem (SVG text se zlomkem)
  function drawDensityLabel(L2) {
    const g = document.getElementById('densityLabel');
    if (!g) return;
    const cx = (AQ2.x1 + AQ2.x2) / 2;
    const y = AQ2.top - 22;
    g.innerHTML = '';
    const t = el('text', { x: cx, y, 'text-anchor': 'start' }, g);
    t.innerHTML = `hustota ${L2.gen}: <tspan font-style="italic">ρ</tspan> = ${fmt(L2.rho)}`;
    const w = t.getComputedTextLength();
    const fw = 30;
    const x0 = cx - (w + 8 + fw) / 2;
    t.setAttribute('x', x0);
    const fx = x0 + w + 8 + fw / 2;
    el('text', { x: fx, y: y - 13, 'font-size': 17, 'text-anchor': 'middle' }, g).textContent = 'kg';
    el('line', { x1: fx - fw / 2, x2: fx + fw / 2, y1: y - 8, y2: y - 8, stroke: '#334155', 'stroke-width': 1.6 }, g);
    el('text', { x: fx, y: y + 9, 'font-size': 17, 'text-anchor': 'middle' }, g).textContent = 'm³';
  }

  function setLiquid(next) {
    if (!LIQUIDS[next]) return;
    liquid = next;
    const L2 = LIQUIDS[next];
    RHO_W = L2.rho;
    updateDamping();
    stage.querySelector('.liq-volume').setAttribute('fill', L2.volume);
    stage.querySelector('.liq-volume').setAttribute('fill-opacity', L2.volOp);
    stage.querySelector('.liq-surface').setAttribute('fill', L2.surface);
    stage.querySelector('.liq-edge').setAttribute('stroke', L2.edge);
    document.getElementById('uwSurfaceMx').setAttribute('values', mixMatrix(L2.surface, 0.45));
    document.getElementById('uwFrontMx').setAttribute('values', mixMatrix(L2.volume, 0.38));
    const txt = `hustota ${L2.gen}: <i class="qty">ρ</i> = ${fmt(L2.rho)} <span class="unit-frac" aria-label="kilogramů na metr krychlový"><span class="unit-frac__num">kg</span><span class="unit-frac__den">m³</span></span>`;
    densityEl.innerHTML = txt;
    if (FLAT) drawDensityLabel(L2);
    densityNote.innerHTML = `Hustota ${L2.gen}: <i class="qty">ρ</i><sub>k</sub> = ${fmt(L2.rho)}&nbsp;<span class="unit-frac" aria-label="kilogramů na metr krychlový"><span class="unit-frac__num">kg</span><span class="unit-frac__den">m³</span></span>`;
    document.querySelectorAll('button[data-liquid]').forEach((btn) => {
      const on = btn.dataset.liquid === next;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    // předměty ve vodě se podle nové kapaliny znovu rozhodnou, jestli plavou
    ITEMS.forEach((it) => { it.calm = 0; });
    if (selected) showCard(selected);
  }
  document.querySelectorAll('button[data-liquid]').forEach((btn) => {
    btn.addEventListener('click', () => { hideHint(); setLiquid(btn.dataset.liquid); });
  });
  setLiquid('water');
  // šířka textu se změní po načtení písma – popisek hustoty překresli
  if (FLAT && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => drawDensityLabel(LIQUIDS[liquid]));
  }

  document.querySelectorAll('button[data-forces]').forEach((btn) => {
    btn.addEventListener('click', () => {
      hideHint();
      forcesOn = btn.dataset.forces === 'on';
      document.querySelectorAll('button[data-forces]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      document.getElementById('forceLegend').hidden = !forcesOn;
    });
  });

  window.__plavaniSim = { setLiquid, ITEMS, throwTo, columnFor };
})();
