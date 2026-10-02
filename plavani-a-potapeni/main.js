(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- Akvárium (souřadnice předlohy → viewBox 1200 × 800) ---------- */
  const S = 0.46;
  const OX = 85;
  const OY = 35;
  const A = (px, py) => ({ x: OX + S * px, y: OY + S * py });

  const C_L = A(619.7, 244.0);
  const C_F = A(1203.4, 576.7);
  const C_R = A(2391.5, 346.8);
  const C_B = A(1811.5, 10.6);
  const WO = 317 * S;   // hladina pod horním okrajem
  const FO = 945 * S;   // dno pod horním okrajem

  const RHO_W = 1000;
  const G = 1500;       // px/s²
  const C1 = 0.8;       // lineární odpor vody
  const C2 = 0.012;     // kvadratický odpor vody

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
      id: 'jablko', name: 'Jablko', m: 180, V: 220, w: 86, h: 76,
      svg: '<g transform="scale(0.34) translate(-162 -893)">' +
        '<path d="M287.513 763.265C285.959 806.925 254.846 875.634 219.161 895.266C200.876 905.333 180.631 884.469 158.241 883.681C133.472 882.803 109.802 900.73 91.1796 887.146C60.1296 864.524 36.3674 795.671 37.8443 754.415C40.1864 688.365 99.7653 668.432 165.815 670.774C231.866 673.116 289.874 697.221 287.532 763.271L287.513 763.265Z" fill="#F03B50"/>' +
        '<path d="M110 740C118 715 140 702 160 700" stroke="#ffffff" stroke-opacity="0.35" stroke-width="16" stroke-linecap="round" fill="none"/>' +
        '<path d="M159.037 691.648C159.037 691.648 146.76 653.386 167.418 625.172" stroke="#FFDD00" stroke-width="19.0484" stroke-miterlimit="10" stroke-linecap="round" fill="none"/>' +
        '<path d="M160.502 723.142C160.502 723.142 117.807 674.819 65.3449 746.423" stroke="#FF8158" stroke-width="19.0484" stroke-miterlimit="10" stroke-linecap="round" fill="none"/>' +
        '</g>',
    },
    {
      id: 'kamen', name: 'Kámen', m: 780, V: 300, w: 94, h: 50,
      svg: '<path d="M-44 -6C-50 -22 -36 -44 -14 -48C6 -52 30 -46 40 -32C50 -18 44 -2 28 0C8 2 -30 4 -44 -6Z" fill="#8E9196"/>' +
        '<path d="M-40 -10C-20 -2 14 -2 40 -14C44 -4 36 0 28 0C8 2 -30 4 -44 -6Z" fill="#6E7176"/>' +
        '<path d="M-28 -34C-18 -42 0 -44 12 -40" stroke="#B9BCC1" stroke-width="6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="18" cy="-24" r="3" fill="#74777C"/><circle cx="-12" cy="-20" r="2.5" fill="#74777C"/>',
    },
    {
      id: 'drevo', name: 'Dřevěná kostka', m: 300, V: 500, w: 74, h: 60,
      svg: cube(1, '#F2C98A', '#D9A35C', '#C18640',
        '<path d="M-14 -40 l34 -6 M-12 -30 l30 -5" stroke="#B07A3A" stroke-width="2" stroke-linecap="round" opacity="0.6" transform="translate(8 0)"/>'),
    },
    {
      id: 'klic', name: 'Klíč', m: 16, V: 2, w: 78, h: 28,
      svg: '<g stroke="#5B6470" stroke-width="2.5" stroke-linejoin="round">' +
        '<path d="M-14 -20H34V-12H30V-6H25V-12H21V-4H16V-12H-14Z" fill="#C4C9D0"/>' +
        '<circle cx="-24" cy="-15" r="14" fill="#C4C9D0"/>' +
        '<circle cx="-28" cy="-15" r="5" fill="#ffffe6"/>' +
        '</g>',
    },
    {
      id: 'led', name: 'Kostka ledu', m: 92, V: 100, w: 54, h: 44,
      svg: cube(0.72, '#F2FBFF', '#CDEBFA', '#A9D8F2',
        '<path d="M-10 -26 l10 -16" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.9"/>'),
    },
    {
      id: 'vejce', name: 'Vajíčko', m: 60, V: 55, w: 66, h: 46,
      svg: '<path d="M-32 -22C-32 -38 -12 -46 4 -44C22 -42 34 -32 34 -22C34 -8 20 0 0 0C-20 0 -32 -8 -32 -22Z" fill="#F3E3CB"/>' +
        '<path d="M-24 -6C-10 2 18 2 30 -10C30 -4 20 0 0 0C-12 0 -20 -2 -24 -6Z" fill="#E2CBAA"/>' +
        '<ellipse cx="-10" cy="-32" rx="10" ry="5" fill="#ffffff" opacity="0.6" transform="rotate(-18 -10 -32)"/>',
    },
    {
      id: 'korek', name: 'Korková zátka', m: 6, V: 25, w: 38, h: 44,
      svg: '<path d="M-17 -40V-5A17 5 0 0 0 17 -5V-40Z" fill="#C68F52"/>' +
        '<ellipse cx="0" cy="-40" rx="17" ry="5" fill="#DDAE74"/>' +
        '<circle cx="-7" cy="-26" r="2" fill="#9C6B37"/><circle cx="6" cy="-16" r="2.2" fill="#9C6B37"/><circle cx="8" cy="-31" r="1.6" fill="#9C6B37"/><circle cx="-4" cy="-11" r="1.5" fill="#9C6B37"/>',
    },
    {
      id: 'kachna', name: 'Gumová kachnička', m: 25, V: 125, w: 86, h: 66,
      svg: '<path d="M-38 -22C-40 -4 -20 0 4 0C28 0 40 -8 40 -22C40 -34 30 -38 22 -36C14 -34 -6 -30 -20 -30C-28 -30 -34 -34 -42 -40C-42 -32 -38 -28 -38 -22Z" fill="#FFD43B"/>' +
        '<path d="M-36 -10C-20 -2 20 -2 38 -14C36 -4 24 0 4 0C-18 0 -32 -4 -36 -10Z" fill="#F2B90F"/>' +
        '<circle cx="18" cy="-50" r="16" fill="#FFD43B"/>' +
        '<path d="M31 -52Q46 -50 44 -43Q38 -40 30 -44Z" fill="#FF8A00"/>' +
        '<circle cx="22" cy="-54" r="3" fill="#1D1D1B"/>' +
        '<path d="M-16 -22Q0 -32 14 -20Q0 -12 -16 -22Z" fill="#F2B90F"/>',
    },
  ];
  ITEMS.forEach((it) => { it.rho = (it.m / it.V) * 1000; });

  /* ---------- Polička ---------- */
  const SHELF_X = [95, 255];
  const SHELF_Y = [205, 385, 565, 745];
  ITEMS.forEach((it, i) => {
    it.slot = { x: SHELF_X[i % 2], y: SHELF_Y[Math.floor(i / 2)] - 1 };
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
    '<filter id="underwater" color-interpolation-filters="sRGB">' +
    '<feColorMatrix type="matrix" values="0.58 0 0 0 0.12  0 0.58 0 0 0.25  0 0 0.6 0 0.4  0 0 0 1 0"/>' +
    '</filter>';

  const L = {};
  L.shelf = el('g', {}, stage);
  L.back = el('g', {}, stage);
  L.ripples = el('g', {}, stage);
  L.water = el('g', {}, stage);
  L.front = el('g', {}, stage);
  L.top = el('g', {}, stage);
  L.drops = el('g', {}, stage);

  const T = `translate(${OX} ${OY}) scale(${S})`;
  L.back.innerHTML =
    `<g transform="${T}">` +
    '<path d="M2384.54 349.119L1811.54 10.6191L619.662 244.009M1811.54 10.6191V329.119" stroke="#0D0C0D" stroke-width="21.2381" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M619.666 560.694V1199.01C619.666 1199.01 629.351 1256.41 661.353 1280.9C693.355 1305.4 1097.77 1540.77 1097.77 1540.77C1097.77 1540.77 1157.57 1602.39 1310.6 1573.1C1463.63 1543.81 2343.54 1373.52 2343.54 1373.52L2385.88 1341.76L2391.45 1290.57V663.483C2391.45 663.483 2365.19 653.621 2302.5 615.818C2286.33 606.066 2266.18 594.618 2220.42 564.22C2188.43 542.982 2135.08 512.512 2095.25 489.228C2027.12 449.407 1956.91 413.638 1904.71 382.418C1855.23 352.826 1815.93 331.712 1815.93 331.712L619.666 560.694Z" fill="#58A1FF" fill-opacity="0.7"/>' +
    '<path d="M618.664 561.076L774.633 646.195L977.489 758.506L1203.4 882.801L1428.42 841.369L1751.95 782.919L2105.2 717.459L2392.45 663.865L2229.53 569.483L2004.39 439.325L1816.32 330.094L1559.88 378.822L1146.28 457.919L810.037 524.168L618.664 561.076Z" fill="#206CE8" fill-opacity="0.8"/>' +
    '</g>';
  L.front.innerHTML =
    `<g transform="${T}" stroke="#0D0C0D" stroke-width="21.2381" stroke-linecap="round" stroke-linejoin="round" fill="none">` +
    '<path d="M2328.71 1378.22L1272.09 1580.47C1236.69 1587.93 1203.39 1560.92 1203.39 1524.74V576.729L2391.45 346.791V1300.89C2391.45 1338.26 2365.27 1370.52 2328.71 1378.22Z"/>' +
    '<path d="M1114.06 1551.52C1145.92 1567.01 1183.61 1599.24 1272.09 1580.47"/>' +
    '<path d="M619.662 244.009L1203.4 576.736V1503.69C1203.4 1545.81 1159.25 1573.36 1121.42 1554.85L676.442 1289.99C641.697 1272.99 619.662 1237.7 619.662 1199.02V244.009Z"/>' +
    '</g>';

  // polička
  let shelfHtml = '';
  for (const y of SHELF_Y) {
    shelfHtml += `<rect x="22" y="${y}" width="306" height="14" rx="4" fill="#C9A36B"/>`;
    shelfHtml += `<rect x="22" y="${y + 10}" width="306" height="4" rx="2" fill="#A47F4A"/>`;
  }
  ITEMS.forEach((it) => {
    shelfHtml += `<text x="${it.slot.x}" y="${it.slot.y + 40}" text-anchor="middle" font-size="18" fill="#475569">${it.name}</text>`;
  });
  L.shelf.innerHTML = shelfHtml;

  // předměty
  for (const it of ITEMS) {
    const ca = el('clipPath', { id: `ca-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipA = el('rect', { x: -300, width: 600, y: -600, height: 1200 }, ca);
    const cb = el('clipPath', { id: `cb-${it.id}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    it.clipB = el('rect', { x: -300, width: 600, y: 600, height: 0 }, cb);

    it.g = el('g', { class: 'item', 'data-id': it.id }, L.top);
    el('rect', { x: -it.w / 2 - 8, y: -it.h - 30, width: it.w + 16, height: it.h + 36, fill: 'transparent' }, it.g);
    const a = el('g', { 'clip-path': `url(#ca-${it.id})` }, it.g);
    a.innerHTML = it.svg;
    const b = el('g', { 'clip-path': `url(#cb-${it.id})`, filter: 'url(#underwater)' }, it.g);
    b.innerHTML = it.svg;
    // vodní linka kolem předmětu (jen přední polovina)
    it.ring = el('ellipse', {
      cx: 0, cy: 0, rx: it.w * 0.34, ry: it.w * 0.34, fill: 'none', stroke: '#E4F0FF',
      'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke', opacity: 0,
      'clip-path': `url(#cb-${it.id})`,
    }, it.g);

    it.phase = 'shelf';
    it.x = it.slot.x;
    it.y = it.slot.y;
    it.vy = 0;
    it.y0 = 0;
    it.wet = false;
    placeItem(it);
  }

  function placeItem(it) {
    it.g.setAttribute('transform', `translate(${it.x.toFixed(2)} ${it.y.toFixed(2)})`);
    let wl = 1000;
    if (it.phase === 'water' || it.phase === 'fall') wl = it.y0 + WO - it.y;
    it.clipA.setAttribute('y', -600);
    it.clipA.setAttribute('height', Math.max(0, wl + 600));
    it.clipB.setAttribute('y', wl);
    it.clipB.setAttribute('height', 600);
    const sub = wl < 0 && wl > -(it.h + 40);
    it.ring.setAttribute('opacity', sub ? 0.6 : 0);
    if (sub) it.ring.setAttribute('transform', `matrix(0.982 -0.19 -0.74 -0.42 0 ${wl.toFixed(2)})`);
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
    if (it.revealed) {
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
    else if (ry > bot) y0 = Math.min(bot, Math.max(top, ry - WO));
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
    return x > C_L.x + 10 && x < C_R.x - 10 && y <= yBot(x);
  }

  function moveToLayer(it, layer) {
    if (it.g.parentNode !== layer) layer.appendChild(it.g);
  }

  function throwTo(it, col, arc) {
    it.y0 = col.y0;
    const startY = col.y0 - 70;
    if (!arc && it.y < startY && Math.abs(it.x - col.x) < 1) {
      startFall(it, 0);
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
      const c = el('circle', { r: (2.5 + Math.random() * 3.5).toFixed(1), fill: '#58A1FF' }, L.drops);
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
        let a = G * (1 - (s * RHO_W) / it.rho);
        if (s > 0) a -= (C1 * it.vy + C2 * it.vy * Math.abs(it.vy)) * s;
        it.vy += a * dt;
        it.y += it.vy * dt;
        if (it.y > fl) {
          it.y = fl;
          it.vy = it.vy > 50 ? -it.vy * 0.2 : 0;
        }
        if (prev < sY && it.y >= sY && it.vy > 80) {
          splash(it.x, sY, Math.min(1, it.vy / 600) * Math.min(1.2, it.m / 200 + 0.4));
        }
        if (!it.wet && it.y >= sY) {
          it.wet = true;
          it.phase = 'water';
          if (!it.revealed) setTimeout(() => { it.revealed = true; if (selected === it) showCard(it); }, 900);
        }
        placeItem(it);
      }
    }

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
      r.r.setAttribute('transform', `matrix(0.982 -0.19 -0.74 -0.42 ${r.x.toFixed(1)} ${r.y.toFixed(1)})`);
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
    drag = { it, dx: it.x - p.x, dy: it.y - p.y, sx: p.x, sy: p.y, moved: false, from: it.phase };
    it.phase = 'drag';
    it.wet = false;
    moveToLayer(it, L.top);
    g.classList.add('is-dragging');
    stage.setPointerCapture(e.pointerId);
    showCard(it);
    placeItem(it);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toSvg(e);
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
    drag.it.x = p.x + drag.dx;
    drag.it.y = p.y + drag.dy;
    placeItem(drag.it);
  });

  function endDrag(e) {
    if (!drag) return;
    const { it, moved, from } = drag;
    drag = null;
    it.g.classList.remove('is-dragging');
    try { stage.releasePointerCapture(e.pointerId); } catch (_) { /* nic */ }

    if (!moved) {
      if (from === 'shelf') {
        // klepnutí → hoď do náhodného místa akvária
        throwTo(it, freeSpot(it), true);
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

  window.__plavaniSim = { ITEMS, throwTo, columnFor };
})();
