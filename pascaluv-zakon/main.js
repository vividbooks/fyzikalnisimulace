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
  const DROPS_PER_SEC = 26;

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

  /* Čárkovaná čára výšky proudů — ukazuje, že všechny proudy vystříknou stejně vysoko. */
  const levelLine = el(
    "line",
    { x1: toX(80), x2: toX(220), y1: 0, y2: 0, stroke: "#3B82F6", "stroke-width": 3, "stroke-dasharray": "10 9", opacity: 0, "stroke-linecap": "round" },
    jetsEl.parentNode
  );
  jetsEl.parentNode.insertBefore(levelLine, jetsEl);

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
    const len = 60 + (state.force / F_MAX) * 90;
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

  /* Souvislý proud z každé dírky (dvě čáry: sytější obrys + světlejší jádro). */
  const streams = HOLES_BX.map((bx) => {
    const x = toX(bx);
    const outer = el("path", { stroke: "#3B82F6", "stroke-width": 16, "stroke-linecap": "round", fill: "none", opacity: 0 }, jetsEl);
    const inner = el("path", { stroke: "#9CC8FF", "stroke-width": 7, "stroke-linecap": "round", fill: "none", opacity: 0 }, jetsEl);
    return { x, outer, inner, phase: Math.random() * 6 };
  });

  function renderStreams(t) {
    const h = jetHeight();
    streams.forEach((st) => {
      if (h < 6) {
        st.outer.setAttribute("opacity", "0");
        st.inner.setAttribute("opacity", "0");
        return;
      }
      const top = HOLE_Y - h + 6;
      const w = 2.2 * Math.sin(t * 9 + st.phase);
      const d = `M${st.x} ${HOLE_Y - 2}C${st.x + w} ${HOLE_Y - h * 0.35} ${st.x - w} ${HOLE_Y - h * 0.7} ${st.x} ${top}`;
      st.outer.setAttribute("d", d);
      st.inner.setAttribute("d", d);
      const op = Math.min(1, state.pressure * 1.2).toFixed(2);
      st.outer.setAttribute("opacity", op);
      st.inner.setAttribute("opacity", op);
    });
  }

  const dropPool = [];
  function dropEl(i) {
    if (!dropPool[i]) {
      dropPool[i] = el("circle", { fill: "#59A2FF", stroke: "#2F6FD1", "stroke-width": 1.2 }, jetsEl);
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

    const h = jetHeight();
    if (h > 8) {
      const y = HOLE_Y - h;
      levelLine.setAttribute("y1", y.toFixed(1));
      levelLine.setAttribute("y2", y.toFixed(1));
      levelLine.setAttribute("opacity", String(Math.min(0.85, state.pressure)));
    } else {
      levelLine.setAttribute("opacity", "0");
    }
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
          /* Kapka startuje u vrcholu proudu a padá dolů do stran (koruna fontány). */
          const up = Math.sqrt(2 * G * Math.min(h, 18));
          state.drops.push({
            x: toX(bx) + (Math.random() - 0.5) * 6,
            y: HOLE_Y - h + 8,
            vx: (Math.random() - 0.5) * 120,
            vy: -up * Math.random(),
            r: 3 + Math.random() * 2.4,
          });
        }
      });
    }

    const topY = HOLE_Y + 4;
    state.drops = state.drops.filter((d) => {
      d.vy += G * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      return !(d.vy > 0 && d.y > topY) && d.y < 700;
    });

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
