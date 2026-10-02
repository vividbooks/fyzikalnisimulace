(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- Fyzika ---------- */
  const G = 10;              // N/kg
  const WORKER_MASS = 100;   // kg

  /* ---------- Geometrie (jednotky viewBoxu 1200 × 800) ---------- */
  const X_L = 330;
  const X_R = 870;
  const W_PER_SQRT = 150;    // šířka válce = 150 · √S
  const Y_TOP = 450;         // horní okraj válců
  const Y_BOT = 752;         // dno válců / spodek spojovací trubky
  const PIPE_H = 62;
  const PIPE_TOP = Y_BOT - PIPE_H;
  const LIFT0 = 92;          // mezera mezi plošinou a okrajem válce v klidu
  const ROD = 230;           // spodek plošiny → píst v kapalině
  const PLAT_T = 16;         // tloušťka plošiny
  const DISK_MIN = Y_TOP + 22;
  const ROD_W = 26;
  const WALL = 12;
  const ELL = 0.085;         // poměr ry / šířka (perspektiva)

  const WORKER_SCALE = 0.36;
  const WORKER_W = 200 * WORKER_SCALE;

  const COL = {
    wall: '#1D1D1B',
    inside: '#1D1D1B',
    liquid: '#58A1FF',
    disk: '#565655',
    rod: '#848484',
    red: '#EF3A50',
    redDark: '#B91C35',
  };

  /* Dělník podle předlohy (souřadnice původního SVG, chodidla ve 925 / 753). */
  const WORKER_BODY = [
    ['M956.012 494.939L974.861 540.845L996.502 593.558C999.497 600.556 1007.62 603.77 1014.59 600.719C1021.1 597.87 1024.35 590.518 1022.07 583.789L1003.27 528.534L979.062 457.412L972.677 450.194', true],
    ['M930.197 515.726C899.793 515.726 875.107 540.412 875.107 570.816C875.107 601.22 899.793 625.906 930.197 625.906C960.601 625.906 985.287 601.22 985.287 570.816C985.287 540.412 960.601 515.726 930.197 515.726Z', false],
    ['M988.991 580.012L975.923 455.698C975.923 455.698 959.576 431.416 924.757 431.416C889.933 431.416 870.132 459.412 870.132 459.412L866.893 582.111', true],
    ['M980.16 506.504C980.16 506.504 959.053 526.407 868.958 507.852', true],
    ['M957.407 439.965C957.407 439.965 963.846 471.454 958.996 512.811', true],
    ['M893.182 439.717C893.182 439.717 901.504 461.801 898.081 512.563', true],
    ['M931.921 589.006L934.501 619.306L951.799 735.369C952.075 744.448 959.084 751.665 968.754 752.129C978.428 752.589 985.005 746.781 983.844 735.315C983.844 735.315 983.009 674.783 984.556 648.218C985.632 629.759 989.033 589.597 988.991 580.012', true],
    ['M866.893 582.111C866.893 582.111 874.95 605.696 878.277 618C882.008 631.787 886.917 670.805 886.917 670.805L894.86 738.554C895.504 749.283 904.977 753.453 913.068 753.453C921.103 753.453 926.756 745.035 927.004 735.953C927.004 735.953 930.381 680.797 930.668 659.506C931.007 634.286 932.466 577.917 932.466 577.917', true],
    ['M880.995 397.435C880.995 421.99 900.903 441.901 925.457 441.901C950.016 441.901 969.923 421.99 969.923 397.435C969.923 372.881 950.016 352.97 925.457 352.97C900.903 352.97 880.995 372.881 880.995 397.435Z', true],
    ['M893.187 494.939L865.726 532.669L852.696 594.56C849.702 601.558 841.582 604.772 834.608 601.721C828.099 598.871 824.849 591.52 827.125 584.791L837.465 519.437L870.136 458.159L876.522 450.941', true],
  ];
  const WORKER_HAT = 'M983.402 352.973L888.072 385.046L882.189 387.181L873.655 363.43L947.542 339.523L955.761 361.501';

  function workerMarkup(hatRed, mirror) {
    let s = `<g transform="scale(${mirror ? -WORKER_SCALE : WORKER_SCALE} ${WORKER_SCALE}) translate(-925 -753)" stroke="#1D1D1B" stroke-width="7.08" stroke-linecap="round" stroke-linejoin="round">`;
    for (const [d, stroked] of WORKER_BODY) {
      s += `<path d="${d}" fill="white"${stroked ? '' : ' stroke="none"'}/>`;
    }
    s += hatRed
      ? `<path d="${WORKER_HAT}" fill="#F03B50" stroke="#F03B50"/>`
      : `<path d="${WORKER_HAT}" fill="white"/>`;
    // nápis na montérkách (zrcadlený dělník má text otočený zpět, aby byl čitelný)
    s += `<text x="${mirror ? -927 : 927}" y="561" transform="${mirror ? 'scale(-1 1)' : ''}" text-anchor="middle" font-size="29" font-weight="600" fill="#1D1D1B" stroke="none">100 kg</text>`;
    s += '</g>';
    return s;
  }

  /* ---------- DOM ---------- */
  const stage = document.getElementById('stage');
  const hintEl = document.getElementById('hintEl');
  const resultEl = document.getElementById('resultEl');
  const btnRun = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');
  const inputs = {
    areaL: document.getElementById('areaL'),
    areaR: document.getElementById('areaR'),
    workersL: document.getElementById('workersL'),
    workersR: document.getElementById('workersR'),
  };
  const outputs = {
    areaL: document.getElementById('areaLValue'),
    areaR: document.getElementById('areaRValue'),
    workersL: document.getElementById('workersLValue'),
    workersR: document.getElementById('workersRValue'),
  };
  const infoEls = { L: document.getElementById('infoL'), R: document.getElementById('infoR') };

  const state = {
    S: { L: 4, R: 1 },
    n: { L: 3, R: 1 },
    off: { L: 0, R: 0 },     // posun pístu dolů (kladný = dolů)
    phase: 'idle',           // idle | running | done
    anim: null,
    interacted: false,
  };

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const fmt = (v) => {
    const r = Math.round(v * 10) / 10;
    const [i, d] = String(r).split('.');
    const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return d ? `${int},${d}` : int;
  };

  const width = (side) => W_PER_SQRT * Math.sqrt(state.S[side]);
  const cx = (side) => (side === 'L' ? X_L : X_R);
  const force = (side) => state.n[side] * WORKER_MASS * G;
  const pressure = (side) => force(side) / state.S[side];

  /* ---------- Scéna ---------- */
  const layers = {};
  const parts = { L: {}, R: {} };

  function buildScene() {
    stage.innerHTML = '';
    layers.inside = el('g', {}, stage);
    layers.liquid = el('path', { fill: COL.liquid }, stage);
    layers.labels = el('g', { 'font-size': 34, 'font-weight': 600, fill: '#fff', 'text-anchor': 'middle' }, stage);
    layers.mech = el('g', {}, stage);
    layers.walls = el('path', {
      fill: 'none', stroke: COL.wall, 'stroke-width': WALL,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, stage);
    layers.top = el('g', {}, stage);

    for (const side of ['L', 'R']) {
      const w = width(side);
      const x = cx(side);
      const ry = w * ELL;
      const p = parts[side];

      // tmavý vnitřek válce nad pístem + ústí válce
      p.inside = el('rect', { x: x - w / 2, width: w, y: Y_TOP, fill: COL.inside }, layers.inside);
      el('ellipse', { cx: x, cy: Y_TOP, rx: w / 2, ry, fill: COL.inside }, layers.inside);

      // píst v kapalině + táhlo
      p.mech = el('g', {}, layers.mech);
      p.diskSide = el('rect', { x: x - w / 2 + 4, width: w - 8, height: 12, fill: COL.disk }, p.mech);
      p.diskBot = el('ellipse', { cx: x, rx: w / 2 - 4, ry, fill: COL.disk }, p.mech);
      p.disk = el('ellipse', { cx: x, rx: w / 2 - 4, ry, fill: '#6b6b6a', stroke: COL.disk, 'stroke-width': 5 }, p.mech);
      p.rod = el('rect', { x: x - ROD_W / 2, width: ROD_W, fill: COL.rod }, p.mech);

      // plošina + dělníci
      p.top = el('g', {}, layers.top);
      const prx = w / 2 + 10;
      const pry = prx * ELL * 2;
      el('rect', { x: x - prx, y: 0, width: prx * 2, height: PLAT_T, fill: COL.redDark }, p.top);
      el('ellipse', { cx: x, cy: PLAT_T, rx: prx, ry: pry, fill: COL.redDark }, p.top);
      el('ellipse', { cx: x, cy: 0, rx: prx, ry: pry, fill: COL.red }, p.top);
      p.workers = el('g', {}, p.top);
      placeWorkers(side, x, prx, pry);

      // popisek plochy v kapalině
      const t = el('text', { x, y: Y_BOT - 18 }, layers.labels);
      t.innerHTML = `<tspan font-style="italic">S</tspan><tspan font-size="22" dy="7">${side === 'L' ? 1 : 2}</tspan>`;
    }
    update();
  }

  function placeWorkers(side, x, prx, pry) {
    const n = state.n[side];
    const usable = prx * 2 - 18;
    const perRow = Math.max(1, Math.min(n, Math.floor((usable - WORKER_W) / 46) + 1));
    const rows = Math.ceil(n / perRow);
    let html = '';
    let idx = 0;
    // zadní řady kreslíme dřív
    for (let r = rows - 1; r >= 0; r--) {
      const inRow = r === rows - 1 ? n - perRow * (rows - 1) : perRow;
      const span = Math.min(usable - WORKER_W, (inRow - 1) * Math.max(46, WORKER_W * 0.9));
      const yFeet = rows > 1 ? pry * 0.5 - (r * pry) / (rows - 1) : 2;
      for (let k = 0; k < inRow; k++) {
        const wx = inRow === 1 ? x : x - span / 2 + (span * k) / (inRow - 1);
        const shift = rows > 1 && r % 2 === 1 ? 14 : 0;
        const hatRed = side === 'R' ? idx === 0 : idx % 3 === 1;
        html += `<g transform="translate(${(wx + shift).toFixed(1)} ${(yFeet).toFixed(1)})">${workerMarkup(hatRed, idx % 2 === 1)}</g>`;
        idx++;
      }
    }
    p_set(side, html);
  }

  function p_set(side, html) {
    parts[side].workers.innerHTML = html;
  }

  function update() {
    const geo = {};
    for (const side of ['L', 'R']) {
      const w = width(side);
      const x = cx(side);
      const ry = w * ELL;
      const p = parts[side];
      const platBottom = Y_TOP - LIFT0 + state.off[side];
      const platTop = platBottom - PLAT_T;
      const disk = platBottom + ROD;
      geo[side] = { w, x, disk };
      p.inside.setAttribute('height', Math.max(0, disk - Y_TOP));
      p.disk.setAttribute('cy', disk);
      p.diskBot.setAttribute('cy', disk + 12);
      p.diskSide.setAttribute('y', disk);
      p.rod.setAttribute('y', platTop + 4);
      p.rod.setAttribute('height', Math.max(0, disk - platTop - 4));
      p.top.setAttribute('transform', `translate(0 ${platTop})`);
      void ry;
    }

    const L = geo.L, R = geo.R;
    const L1 = L.x - L.w / 2, L2 = L.x + L.w / 2;
    const R1 = R.x - R.w / 2, R2 = R.x + R.w / 2;
    const ryL = L.w * ELL, ryR = R.w * ELL;
    layers.liquid.setAttribute('d',
      `M${L1} ${L.disk} H${L2} V${PIPE_TOP} H${R1} V${R.disk} H${R2} V${Y_BOT}` +
      ` A${R.w / 2} ${ryR} 0 0 1 ${R1} ${Y_BOT} H${L2}` +
      ` A${L.w / 2} ${ryL} 0 0 1 ${L1} ${Y_BOT} Z`);
    layers.walls.setAttribute('d',
      `M${L1} ${Y_TOP} V${Y_BOT} A${L.w / 2} ${ryL} 0 0 0 ${L2} ${Y_BOT} H${R1}` +
      ` A${R.w / 2} ${ryR} 0 0 0 ${R2} ${Y_BOT} V${Y_TOP}` +
      ` M${L2} ${Y_TOP} V${PIPE_TOP} H${R1} V${Y_TOP}`);
  }

  /* ---------- Panel / info ---------- */
  function syncInfo() {
    for (const side of ['L', 'R']) {
      const box = infoEls[side];
      box.querySelector('[data-k="S"]').textContent = fmt(state.S[side]);
      box.querySelector('[data-k="F"]').textContent = fmt(force(side));
      box.querySelector('[data-k="p"]').textContent = state.phase === 'idle' ? '?' : fmt(pressure(side));
    }
    outputs.areaL.textContent = `${state.S.L} m²`;
    outputs.areaR.textContent = `${state.S.R} m²`;
    outputs.workersL.textContent = String(state.n.L);
    outputs.workersR.textContent = String(state.n.R);
  }

  function setWinner(side) {
    infoEls.L.classList.toggle('is-winner', side === 'L');
    infoEls.R.classList.toggle('is-winner', side === 'R');
  }

  function hideHint() {
    if (state.interacted) return;
    state.interacted = true;
    hintEl.classList.add('is-hidden');
  }

  function reset() {
    if (state.anim) cancelAnimationFrame(state.anim.raf);
    state.anim = null;
    state.phase = 'idle';
    state.off.L = 0;
    state.off.R = 0;
    resultEl.hidden = true;
    setWinner(null);
    syncInfo();
    update();
  }

  /* ---------- Spuštění ---------- */
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function run() {
    hideHint();
    if (state.phase !== 'idle') reset();
    state.phase = 'running';
    syncInfo();

    const pL = pressure('L');
    const pR = pressure('R');
    const rel = Math.abs(pL - pR) / Math.max(pL, pR);

    if (rel < 1e-9) {
      // rovnováha – jen se lehce zhoupne a zůstane
      const t0 = performance.now();
      const dur = 1200;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const a = Math.sin(t * Math.PI * 3) * (1 - t) * 6;
        state.off.L = a * state.S.R / state.S.L;
        state.off.R = -a;
        update();
        if (t < 1) state.anim.raf = requestAnimationFrame(step);
        else finish(null, pL, pR);
      };
      state.anim = { raf: requestAnimationFrame(step) };
      return;
    }

    const down = pL > pR ? 'L' : 'R';
    const up = down === 'L' ? 'R' : 'L';
    const ratio = state.S[down] / state.S[up];
    const diskUp0 = Y_TOP - LIFT0 + ROD;
    const riseMax = diskUp0 - DISK_MIN;
    const dDown = Math.min(LIFT0, riseMax / ratio);
    const dUp = dDown * ratio;
    const dur = 1100 + 1700 * (1 - rel);

    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = easeInOut(t);
      state.off[down] = dDown * e;
      state.off[up] = -dUp * e;
      update();
      if (t < 1) state.anim.raf = requestAnimationFrame(step);
      else finish(down, pL, pR);
    };
    state.anim = { raf: requestAnimationFrame(step) };
  }

  function finish(down, pL, pR) {
    state.phase = 'done';
    state.anim = null;
    setWinner(down);
    const sym = pL > pR ? '>' : pL < pR ? '<' : '=';
    const pTxt = `<i class="qty">p</i><sub>1</sub> ${sym} <i class="qty">p</i><sub>2</sub>`;
    let msg;
    if (!down) msg = `${pTxt} — tlaky jsou stejné, lis zůstane v rovnováze.`;
    else if (down === 'L') msg = `${pTxt} — levý píst klesá, pravý stoupá.`;
    else msg = `${pTxt} — pravý píst klesá, levý stoupá.`;
    resultEl.innerHTML = msg;
    resultEl.hidden = false;
  }

  /* ---------- Události ---------- */
  function onInput() {
    hideHint();
    state.S.L = Number(inputs.areaL.value);
    state.S.R = Number(inputs.areaR.value);
    state.n.L = Number(inputs.workersL.value);
    state.n.R = Number(inputs.workersR.value);
    if (state.anim) cancelAnimationFrame(state.anim.raf);
    state.anim = null;
    state.phase = 'idle';
    state.off.L = 0;
    state.off.R = 0;
    resultEl.hidden = true;
    setWinner(null);
    syncInfo();
    buildScene();
  }

  Object.values(inputs).forEach((inp) => inp.addEventListener('input', onInput));
  btnRun.addEventListener('click', run);
  btnReset.addEventListener('click', () => { hideHint(); reset(); });

  syncInfo();
  buildScene();

  window.__hydraulSim = { state, run, reset };
})();
