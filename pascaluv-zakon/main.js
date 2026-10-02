(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Geometrie (jednotky viewBoxu 1100 × 640) ---------- */
  /** Láhev z podkladového SVG (255 × 87) zvětšená S×, levý horní roh v (BX, BY). */
  const S = 3.4;
  const BX = 130;
  const BY = 300;
  /** Dírky v horní hraně láhve (souřadnice podkladového SVG). */
  const HOLES_BX = [100, 150, 200];
  const HOLE_BY = 2.6;
  /** Oblast, kde lze láhev stisknout (válcová část, souřadnice SVG). */
  const PRESS_MIN_BX = 72;
  const PRESS_MAX_BX = 222;
  const BOTTOM_BY = 82.5;

  const F_MIN = 5;
  const F_MAX = 50;
  /** Výška proudu při největší síle (jednotky scény) a „tíhové zrychlení“ kapek ve scéně. */
  const JET_H_MAX = 290;
  const G = 1500;
  const DROPS_PER_SEC = 34;

  const toX = (bx) => BX + bx * S;
  const toY = (by) => BY + by * S;
  const HOLE_Y = toY(HOLE_BY);

  /* ---------- DOM ---------- */
  const stage = document.getElementById("stage");
  const bottleWrap = document.getElementById("bottleWrap");
  const bottleEl = document.getElementById("bottle");
  const holesEl = document.getElementById("holes");
  const jetsEl = document.getElementById("jets");
  const markerEl = document.getElementById("pressMarker");
  const posSlider = document.getElementById("posSlider");
  const posValueEl = document.getElementById("posValue");
  const forceSlider = document.getElementById("forceSlider");
  const forceValueEl = document.getElementById("forceValue");
  const btnPress = document.getElementById("btnPress");
  const hintEl = document.getElementById("hintEl");

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  bottleEl.setAttribute("transform", `translate(${BX} ${BY}) scale(${S})`);

  /* Dírky: tmavá elipsa s jemným okrajem. */
  HOLES_BX.forEach((bx) => {
    el("ellipse", { cx: toX(bx), cy: HOLE_Y, rx: 9, ry: 4, fill: "#1E3A5F" }, holesEl);
    el("ellipse", { cx: toX(bx), cy: HOLE_Y - 0.8, rx: 9, ry: 4, fill: "none", stroke: "#515151", "stroke-width": 2 }, holesEl);
  });


  /* Šipka síly zdola (stisk láhve) + popisek. */
  const arrowG = el("g", { class: "press-arrow" }, markerEl);
  const arrowShaft = el("rect", { x: -7, width: 14, rx: 4, fill: "#EF4444" }, arrowG);
  const arrowHead = el("path", { fill: "#EF4444" }, arrowG);
  const arrowLabel = el("text", { "text-anchor": "middle", "font-size": 26, "font-weight": 600, fill: "#EF4444" }, arrowG);

  /* ---------- Stav ---------- */
  const state = {
    pos: Number(posSlider.value) / 100,
    force: Number(forceSlider.value),
    pressing: false,
    pressure: 0, // 0..1 plynule sleduje stisk
    drops: [],
    emitAcc: [0, 0, 0],
    lastTs: 0,
    hintHidden: false,
  };

  function formatNumber(x) {
    return String(Math.round(x * 100) / 100).replace(".", ",");
  }

  function pressBx() {
    return PRESS_MIN_BX + state.pos * (PRESS_MAX_BX - PRESS_MIN_BX);
  }

  function updatePanel() {
    posValueEl.textContent = `${Math.round(state.pos * 100)} %`;
    forceValueEl.textContent = `${formatNumber(state.force)} N`;
    const fp = (state.pos * 100).toFixed(1);
    posSlider.style.setProperty("--fill", `${fp}%`);
    const ff = (((state.force - F_MIN) / (F_MAX - F_MIN)) * 100).toFixed(1);
    forceSlider.style.setProperty("--fill", `${ff}%`);
  }

  /* ---------- Vykreslení ---------- */
  function renderMarker() {
    const x = toX(pressBx());
    const squeeze = state.pressure * (state.force / F_MAX);
    const tipY = toY(BOTTOM_BY) + 6 - squeeze * 14;
    const len = 55 + (state.force / F_MAX) * 55;
    arrowG.setAttribute("transform", `translate(${x} 0)`);
    arrowShaft.setAttribute("y", String(tipY + 22));
    arrowShaft.setAttribute("height", String(len - 22));
    arrowHead.setAttribute("d", `M0 ${tipY}L-20 ${tipY + 28}H20Z`);
    arrowLabel.setAttribute("y", String(tipY + len + 30));
    arrowLabel.textContent = "";
    const fi = document.createElementNS(NS, "tspan");
    fi.setAttribute("font-style", "italic");
    fi.textContent = "F";
    arrowLabel.appendChild(fi);
    arrowLabel.appendChild(document.createTextNode(` = ${formatNumber(state.force)} N`));
    arrowG.setAttribute("opacity", state.pressing ? "1" : "0.55");

    /* Stisk: láhev se v místě stisku trochu promáčkne (zploštění kolem osy). */
    const k = 1 - squeeze * 0.06;
    const cy = toY(42);
    bottleWrap.setAttribute("transform", `translate(0 ${cy * (1 - k)}) scale(1 ${k})`);
  }

  /* ---------- Vodotrysk ----------
     Každá dírka: zužující se proud (výplň s přechodem), nahoře „koruna“, ze které voda
     padá ve dvou obloucích zpět na láhev, a kapky s drobným odstřikem při dopadu. */
  const defs = el("defs", null, stage);
  const grad = el("linearGradient", { id: "jetGrad", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  el("stop", { offset: "0", "stop-color": "#2F7BEF" }, grad);
  el("stop", { offset: "0.7", "stop-color": "#59A2FF" }, grad);
  el("stop", { offset: "1", "stop-color": "#A9D0FF" }, grad);

  const streams = HOLES_BX.map((bx) => {
    const x = toX(bx);
    const g = el("g", { opacity: 0 }, jetsEl);
    const arcs = [-1, 1].map((side) =>
      el("path", { stroke: "#6FAEFF", "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": "16 9", fill: "none", opacity: 0.8, "data-side": side }, g)
    );
    const body = el("path", { fill: "url(#jetGrad)" }, g);
    const shine = el("path", { stroke: "#FFFFFF", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-dasharray": "22 14", fill: "none", opacity: 0.75 }, g);
    const crown = el("ellipse", { fill: "#A9D0FF", opacity: 0.9 }, g);
    return { x, g, arcs, body, shine, crown, phase: Math.random() * 6 };
  });

  /** Vodorovná rychlost vody v koruně (jednotky/s) — určuje šířku „deštníku“. */
  const CROWN_VX = 95;

  function renderStreams(t) {
    const h = jetHeight();
    streams.forEach((st) => {
      if (h < 6) {
        st.g.setAttribute("opacity", "0");
        return;
      }
      st.g.setAttribute("opacity", Math.min(1, state.pressure * 1.3).toFixed(2));
      const x = st.x;
      const top = HOLE_Y - h;
      const w = 1.8 * Math.sin(t * 11 + st.phase);
      const wb = 9; // poloviční šířka u dírky
      const wt = 4.5; // poloviční šířka nahoře
      /* Zužující se proud s lehkým chvěním. */
      st.body.setAttribute(
        "d",
        `M${x - wb} ${HOLE_Y}` +
          `C${x - wb + w} ${HOLE_Y - h * 0.4} ${x - wt + w} ${top + h * 0.25} ${x - wt} ${top + 4}` +
          `Q${x} ${top - 3} ${x + wt} ${top + 4}` +
          `C${x + wt - w} ${top + h * 0.25} ${x + wb - w} ${HOLE_Y - h * 0.4} ${x + wb} ${HOLE_Y}Z`
      );
      st.shine.setAttribute("d", `M${x - 3 + w * 0.5} ${HOLE_Y - 8}L${x - 2} ${top + 14}`);
      /* Pohyb vody: čárkování proudu „teče“ nahoru, oblouky dolů. */
      const speed = Math.sqrt(2 * G * h) * 0.35;
      st.shine.setAttribute("stroke-dashoffset", ((t * speed) % 36).toFixed(1));
      st.crown.setAttribute("cx", x);
      st.crown.setAttribute("cy", top + 3);
      st.crown.setAttribute("rx", 7 + 2 * Math.sin(t * 14 + st.phase));
      st.crown.setAttribute("ry", 4.5);
      /* Padající oblouky: vrh vodorovný z vrcholu, dopad na horní hranu láhve. */
      const fallT = Math.sqrt((2 * (HOLE_Y - top)) / G);
      st.arcs.forEach((arc) => {
        const side = Number(arc.getAttribute("data-side"));
        let d = "";
        const n = 12;
        for (let i = 0; i <= n; i++) {
          const tt = (fallT * i) / n;
          const px = x + side * (6 + CROWN_VX * tt);
          const py = top + 3 + 0.5 * G * tt * tt;
          d += (i ? "L" : "M") + px.toFixed(1) + " " + Math.min(py, HOLE_Y).toFixed(1);
        }
        arc.setAttribute("d", d);
        arc.setAttribute("stroke-dashoffset", (-(t * 140) % 25).toFixed(1));
        arc.setAttribute("stroke-width", (2 + 3 * Math.min(1, h / 120)).toFixed(1));
      });
    });
  }

  const dropPool = [];
  function dropEl(i) {
    if (!dropPool[i]) {
      dropPool[i] = el("circle", { fill: "#59A2FF", stroke: "#2F6FD1", "stroke-width": 0.8, "fill-opacity": 0.9 }, jetsEl);
    }
    return dropPool[i];
  }

  function jetHeight() {
    return JET_H_MAX * (state.force / F_MAX) * state.pressure;
  }

  function renderDrops() {
    let i = 0;
    for (const d of state.drops) {
      const c = dropEl(i++);
      c.setAttribute("cx", d.x.toFixed(1));
      c.setAttribute("cy", d.y.toFixed(1));
      c.setAttribute("r", d.r.toFixed(1));
      c.style.display = "";
    }
    for (; i < dropPool.length; i++) dropPool[i].style.display = "none";

  }

  /* ---------- Simulace kapek ---------- */
  function tick(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(0.04, (ts - state.lastTs) / 1000);
    state.lastTs = ts;

    const target = state.pressing ? 1 : 0;
    state.pressure += (target - state.pressure) * Math.min(1, dt / 0.09);
    if (state.pressure < 0.002) state.pressure = 0;

    /* Pascalův zákon: tlak se šíří všemi směry stejně → ze všech dírek stejně rychlá voda. */
    const h = jetHeight();
    if (h > 4) {
      HOLES_BX.forEach((bx, k) => {
        state.emitAcc[k] += DROPS_PER_SEC * dt;
        while (state.emitAcc[k] >= 1) {
          state.emitAcc[k] -= 1;
          /* Kapka se oddělí v koruně a padá do strany po oblouku (s rozptylem). */
          const side = Math.random() < 0.5 ? -1 : 1;
          state.drops.push({
            x: toX(bx) + side * (4 + Math.random() * 6),
            y: HOLE_Y - h + 4 + Math.random() * 6,
            vx: side * (CROWN_VX * (0.6 + Math.random() * 0.8)),
            vy: -Math.random() * 90,
            r: 2.4 + Math.random() * 2.6,
            splash: true,
          });
        }
      });
    }

    const topY = HOLE_Y + 2;
    const splashes = [];
    state.drops = state.drops.filter((d) => {
      d.vy += G * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      const landed = d.vy > 0 && d.y > topY;
      if (landed && d.splash && Math.random() < 0.6) {
        /* Drobný odstřik po dopadu na láhev. */
        for (let i = 0; i < 2; i++) {
          splashes.push({
            x: d.x,
            y: topY - 1,
            vx: (Math.random() - 0.5) * 160,
            vy: -(60 + Math.random() * 110),
            r: 1.3 + Math.random() * 1.3,
            splash: false,
          });
        }
      }
      return !landed && d.y < 700;
    });
    if (splashes.length) state.drops.push(...splashes);
    if (state.drops.length > 900) state.drops.splice(0, state.drops.length - 900);

    renderMarker();
    renderStreams(ts / 1000);
    renderDrops();
    requestAnimationFrame(tick);
  }

  /* ---------- Ovládání ---------- */
  function hideHint() {
    if (state.hintHidden) return;
    state.hintHidden = true;
    hintEl.classList.add("is-hidden");
  }
  ["pointerdown", "keydown", "input"].forEach((type) =>
    document.addEventListener(type, hideHint, { capture: true, once: true })
  );

  function setPressing(on) {
    state.pressing = on;
    btnPress.classList.toggle("is-pressed", on);
  }

  posSlider.addEventListener("input", () => {
    state.pos = Number(posSlider.value) / 100;
    updatePanel();
  });
  forceSlider.addEventListener("input", () => {
    state.force = Number(forceSlider.value);
    updatePanel();
  });

  /* Tlačítko: stisk trvá, dokud ho uživatel drží (myš, dotyk i klávesnice). */
  btnPress.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btnPress.setPointerCapture(e.pointerId);
    setPressing(true);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) =>
    btnPress.addEventListener(t, () => setPressing(false))
  );
  btnPress.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      setPressing(true);
    }
  });
  btnPress.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") setPressing(false);
  });

  /* Klepnutí / držení přímo na láhvi: vybere místo stisku a tlačí. */
  function svgPoint(e) {
    const pt = stage.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = stage.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
  }

  function setPosFromPoint(p) {
    const bx = (p.x - BX) / S;
    const t = (bx - PRESS_MIN_BX) / (PRESS_MAX_BX - PRESS_MIN_BX);
    state.pos = Math.max(0, Math.min(1, t));
    posSlider.value = String(Math.round(state.pos * 100));
    updatePanel();
  }

  let draggingBottle = false;
  bottleWrap.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    draggingBottle = true;
    stage.setPointerCapture(e.pointerId);
    setPosFromPoint(svgPoint(e));
    setPressing(true);
  });
  stage.addEventListener("pointermove", (e) => {
    if (draggingBottle) setPosFromPoint(svgPoint(e));
  });
  ["pointerup", "pointercancel"].forEach((t) =>
    stage.addEventListener(t, () => {
      if (!draggingBottle) return;
      draggingBottle = false;
      setPressing(false);
    })
  );

  updatePanel();
  renderMarker();
  requestAnimationFrame(tick);

  window.__pascalSim = { state, setPressing };
})();
