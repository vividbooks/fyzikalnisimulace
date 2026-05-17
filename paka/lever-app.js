    import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "https://esm.sh/react@18.3.1";
    import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
    import htm from "https://esm.sh/htm@3.1.1?deps=react@18.3.1";

    const html = htm.bind(React.createElement);
    /** Odkaz na přehled — stejný cíl jako dřívější navigace z `onBack`. */
    const LEVER_HUB_HREF = new URL("../index.html", import.meta.url).href;
    /** Stejný font stack jako geometry-app (Fenomen Sans z Supabase). */
    const FONT_STACK =
      "'Fenomen Sans', ui-sans-serif, system-ui, sans-serif";

    /**
     * Logická šířka scény pro souřadnice osového bodu — viewBox se dopočítá tak,
     * aby byla páka v celém rozsahu náklonu vždy vidět (včetně čísel háčků a podstavce).
     */
    const VIEW = { W: 960, H: 510 };

    /** Světlý režim — čitelná tyč, štítky a pozadí scény. */
    const COLORS = {
      bg: "#f1f5f9",
      beam: "#ef4444",
      pivot: "#db2777",
      pivotNeedle: "#fce7f3",
      beamCradle: "#64748b",
      rope: "#475569",
      baseOuter: "#475569",
      baseInner: "#334155",
      hole: "#ffffff",
      holeOccupied: "#be123c",
      holeLabelMuted: "#64748b",
      weight: "#64748b",
    };

    const SLOTS = 10;
    const IDX = [...Array(SLOTS).keys()];

    /** Celková délka tyče +100 % oproti původní hodnotě (`* 2`). Další `* 1.2` = +20 % rozestup háčků (bílé tečky). */
    const BEAM_HALF = 296 * 0.7 * 1.5 * 1.3 * 2 * 1.2;
    const BEAM_TH = 75;
    const HOLE_R = 9;
    const HOLE_DROP_HINT_DR = 8;
    /** Čísla nad dírou na tyči (stejná výška bez ohledu na závaží pod ní). */
    const HOLE_LABEL_GAP_ABOVE = 58;
    /** Když puštění je jen malý pohyb od sebrání → kliknutí (×), ne vrácení na háček. */
    const BEAM_DRAG_TAP_MAX_PX = 14;
    const HOLE_LABEL_FONT = 27;
    /** Maximum u vybrané díry (kurzor u tečky). */
    const HOLE_LABEL_NUM_PEAK = 66;
    /** Sousedé vlevo/vpravo od nejvýraznější díry — menší než plynulý „kopulec“. */
    const HOLE_LABEL_NEIGHBOR_DAMP = 0.38;
    /** Užší jádro → sousedé zůstanou menší, vybrané číslo výraznější. */
    const HOLE_LABEL_FOCUS_SIGMA = 54;
    /** Ikona přidat/odebrat u kurzoru — kruh + symbol (~50 % menší než původní). */
    const HOVER_BADGE_R = 11;
    /** Tmavý kruh pod + (cca 3× bílé kolečko) — výraznější nad dírou. */
    const HOVER_BADGE_ADD_HALO_R = HOVER_BADGE_R * 3;
    const HOVER_BADGE_STROKE_W = 1.2;
    const HOVER_BADGE_ICON_SW = 1.55;
    const HOVER_BADGE_PLUS_ARM = 4.75;
    const HOVER_BADGE_X_EXTENT = 4.1;
    const PIVOT = { x: VIEW.W / 2, y: 168 };
    const MAX_TILT = (60 * Math.PI) / 180;

    /** Závaží 2× oproti původní velikosti; provázky prodloužené, aby visela níž. */
    const WEIGHT_W = 70;
    const WEIGHT_H = 44;
    /** Zakulacení rohů závaží (menší než polovina výšky → ne celá pilulka). */
    const WEIGHT_CORNER_R = 8;
    /** Vzdálenost díra → horní hrana prvního závaží (dvakrát +20 % dolů oproti základu 42). */
    const ROPE_FROM_HOLE = 42 * 1.2 * 1.2;
    /** Mezera „provázku“ mezi závažími ve sloupci (svisle). */
    const ROPE_BETWEEN = 10;
    /** Odsazení pod blokem závaží před dalším kusem — menší = těsnější sloupec. */
    const STACK_AFTER_WEIGHT = 5;
    const ROPE_STROKE_W = 5.25;

    /**
     * Jednotka ramene háčku od čepu. Háček č. k (label {k}) má rameno k×jednotka — pak
     * např. 4 závaží na háčku 1 a 1 na háčku 4 dává stejný moment (4·1 = 1·4).
     */
    const HOOK_ARM_UNIT = (BEAM_HALF * 0.92) / SLOTS;

    function holeX(side, i) {
      const d = HOOK_ARM_UNIT * (i + 1);
      return side === "left" ? -d : d;
    }

    /** Střed díry v souřadnicích tyče — provázek vychází odsud (srovnat s <circle cy=0>). */
    function holeHangLocal(side, i) {
      return { lx: holeX(side, i), ly: 0 };
    }

    /** Středy závaží ve světových souřadnicích (visí svisle pod dírou). */
    function plumbStackCenters(side, i, n, theta) {
      const { lx, ly } = holeHangLocal(side, i);
      const anchor = toWorld(lx, ly, theta);
      const wx = anchor.x;
      let y = anchor.y;
      const out = [];
      for (let k = 0; k < n; k += 1) {
        const ropeLen = k === 0 ? ROPE_FROM_HOLE : ROPE_BETWEEN;
        y += ropeLen;
        const cy = y + WEIGHT_H / 2;
        out.push({ cx: wx, cy, top: y, bot: y + WEIGHT_H });
        y += WEIGHT_H + STACK_AFTER_WEIGHT;
      }
      return out;
    }

    function toWorld(lx, ly, theta) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      /* Stejná lineární část jako matice v <Beam>: matrix(cos,sin,-sin,cos,Px,Py). */
      return {
        x: PIVOT.x + lx * c - ly * s,
        y: PIVOT.y + lx * s + ly * c,
      };
    }

    /** Kurzor u tečky (střed díry na tyči ve scéně) → 0…1 — fisheye jen pro díry, ne pro čísla nahoře. */
    function hoverFocusAtHole(sx, sy, side, slotIdx, theta, sigma) {
      if (sx == null || sy == null) return 0;
      const hw = toWorld(holeX(side, slotIdx), 0, theta);
      const d = Math.hypot(hw.x - sx, hw.y - sy);
      let w = Math.exp(-(d * d) / (2 * sigma * sigma));
      return w * w * (3 - 2 * w);
    }

    /** Moment od tíhy díky rameni (× jednotková tíha v díře), kolem čepu: Σ n_i·x_i; vlevo x < 0. */
    function netMomentAboutPivot(L, R) {
      let tau = 0;
      for (let i = 0; i < SLOTS; i += 1) {
        tau += Number(L[i] || 0) * holeX("left", i);
        tau += Number(R[i] || 0) * holeX("right", i);
      }
      return tau;
    }

    function zeros() {
      return Array.from({ length: SLOTS }, () => 0);
    }

    /**
     * Referenční |τ|: po jednom jednotkovém závaží v každé díře na jedné straně (druhá strana prázdná).
     * Úhel škálujeme oproti tomu — ne proti celkové hmotnosti (ta by přidávání závaží na stejné straně uměle zmenšovalo sklon).
     */
    const TAU_REF_ONE_SIDE_UNITS = (() => {
      const L = zeros();
      const R = zeros();
      for (let i = 0; i < SLOTS; i += 1) R[i] = 1;
      const t = Math.abs(netMomentAboutPivot(L, R));
      return t > 1e-6 ? t : 1;
    })();

    /** τ = Σ n·x (x záporné vlevo): τ > 0 ⇒ převažuje pravá strana v souřadnicích tyče. */
    function targetTheta(L, R) {
      const tau = netMomentAboutPivot(L, R);
      if (Math.abs(tau) < 1e-9) return 0;
      const u = Math.max(
        -1,
        Math.min(1, tau / TAU_REF_ONE_SIDE_UNITS),
      );
      return u * MAX_TILT;
    }

    /** Špička u osy; měřítko 1,5× — výška podstavce je zahrnutá ve výpočtu viewBox (`SCENE_VIEW`). */
    const STAND_ASSET = {
      vbW: 48,
      vbH: 107,
      anchor: { x: 23.6105, y: 1.55 },
      scale: 3.04 * 1.5,
    };

    const PIVOT_STAND_GROUP_TY = PIVOT.y + BEAM_TH / 2 + 0.5;
    const STAND_FOOT_BOTTOM_Y =
      PIVOT_STAND_GROUP_TY +
      STAND_ASSET.scale * (STAND_ASSET.vbH - STAND_ASSET.anchor.y);
    function PivotStand() {
      const { anchor, scale } = STAND_ASSET;
      const ty = PIVOT_STAND_GROUP_TY;
      const t = `translate(${PIVOT.x},${ty}) scale(${scale}) translate(${-anchor.x},${-anchor.y})`;
      return html`
        <g transform=${t} style=${{ pointerEvents: "none" }}>
          <path
            fill="#E6E6E6"
            d="M23.6105 106.307C36.6502 106.307 47.221 95.7365 47.221 82.6968C47.221 69.6571 36.6502 59.0863 23.6105 59.0863C10.5708 59.0863 0 69.6571 0 82.6968C0 95.7365 10.5708 106.307 23.6105 106.307Z"
          />
          <path
            fill="#B2B2B2"
            d="M23.6117 100.406C33.3923 100.406 41.3211 92.4773 41.3211 82.6967C41.3211 72.9161 33.3923 64.9873 23.6117 64.9873C13.8311 64.9873 5.90234 72.9161 5.90234 82.6967C5.90234 92.4773 13.8311 100.406 23.6117 100.406Z"
          />
          <path
            fill="#813B50"
            d="M34.8826 92.9576C29.042 98.7982 19.5797 98.7982 13.7451 92.9576C10.341 89.5536 8.78112 84.7105 9.56713 79.9582L22.4879 1.55086C22.8265 -0.516952 25.8073 -0.516952 26.1459 1.55086L39.0666 79.9582C39.8526 84.7105 38.2927 89.5536 34.8887 92.9576H34.8826Z"
          />
          <path
            fill="#F03B50"
            d="M12.9257 80.8344C12.9257 80.8344 12.8712 80.8344 12.8471 80.8284C12.5568 80.786 12.3513 80.5139 12.3996 80.2177L21.7834 17.8993C21.8257 17.6091 22.1038 17.4035 22.394 17.4519C22.6843 17.4942 22.8898 17.7663 22.8415 18.0626L13.4577 80.3809C13.4154 80.647 13.1917 80.8344 12.9257 80.8344V80.8344Z"
          />
        </g>`;
    }

    /** Půlkruh pod čepem — v soustavě tyče (otáčí se s ní). */
    const CRADLE_R = 68;
    const NEEDLE_USER_TIP_X = 2.40835;
    const NEEDLE_USER_TIP_Y = 0.707408;
    const NEEDLE_SCALE = 4.7;
    /** Posun ručičky v pixelech (záporné = nahoru v soustavě tyče). */
    const NEEDLE_OFFSET_Y = -8;

    /** Zámeček nad osou: zamknuto ⇒ tyč setrvá v rovnováze (θ = 0) bez ohledu na závaží. */
    const BEAM_LOCK_CX = PIVOT.x;
    const BEAM_LOCK_CY = PIVOT.y - BEAM_TH / 2 - 102;
    const BEAM_LOCK_HIT_W = 78;
    const BEAM_LOCK_HIT_H = 94;
    /** Zvětšený zámek (vizuál + hit v jeho lokálních souřadnicích). */
    const BEAM_LOCK_UI_SCALE = 1.924;
    const BEAM_LOCK_TOP_Y =
      BEAM_LOCK_CY - (BEAM_LOCK_HIT_H * BEAM_LOCK_UI_SCALE) / 2;
    /** „Páka je v rovnováze“ — nad zámkem (`dominantBaseline: bottom`). */
    const BALANCE_LABEL_ABOVE_Y = BEAM_LOCK_TOP_Y - 16;

    /** Ohraničení viditelné scény: páka v ±MAX_TILT, štítky, podstavec; spodek navíc pro závaží. */
    const SCENE_PAD = 26;
    /** Odhad výšky štítu čísla nad dírou (dominantBaseline middle, max. font ~ HOLE_LABEL_NUM_PEAK). */
    const HOLE_LABEL_TOP_EXTENT = HOLE_LABEL_GAP_ABOVE + HOLE_LABEL_NUM_PEAK * 0.52;
    /** Volný prostor pod nejnižším prvkem (podstavec) pro visící závaží. */
    const SCENE_WEIGHT_MARGIN_BELOW = 220;
    /** Vizuální zvětšení celé páky/váhy bez změny geometrie v souřadnicích scény. */
    const SCENE_VISUAL_ZOOM = 1.05;
    /** Optický posun celé páky dolů ve viewportu SVG; nemění měřítko, jen výřez. */
    const SCENE_VISUAL_SHIFT_DOWN_FRAC = 0.06;
    /**
     * Při max. náklonu ční konce tyče + štítky velmi vysoko → rozšíří viewBox nahoru.
     * Pro zarovnání nahoře (`xMidYMin`) by pak klidová páka vizuálně klesla dolů.
     * Proto „ohnisko“ horního okraje držíme u klidové geometrie; při náklonu může přetékat ven (`overflow="visible"` na `<svg>`).
     */
    const SCENE_VIEWBOX_REST_TOP_PAD = 120;

    const SCENE_VIEW = (() => {
      const standTy = PIVOT_STAND_GROUP_TY;
      const { anchor, scale: sc, vbW, vbH } = STAND_ASSET;
      const standCorners = [
        [0, 0],
        [vbW, 0],
        [0, vbH],
        [vbW, vbH],
      ];

      const hullCore = (thetas) => {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const add = (wx, wy) => {
          minX = Math.min(minX, wx);
          maxX = Math.max(maxX, wx);
          minY = Math.min(minY, wy);
          maxY = Math.max(maxY, wy);
        };
        const hw = BEAM_TH / 2;
        for (const th of thetas) {
          for (const [lx, ly] of [
            [-BEAM_HALF, -hw],
            [BEAM_HALF, -hw],
            [BEAM_HALF, hw],
            [-BEAM_HALF, hw],
          ]) {
            const p = toWorld(lx, ly, th);
            add(p.x, p.y);
          }
          for (const lx of [-CRADLE_R, CRADLE_R, 0]) {
            for (const ly of [hw, hw + CRADLE_R]) {
              const p = toWorld(lx, ly, th);
              add(p.x, p.y);
            }
          }
          for (const side of ["left", "right"]) {
            for (let i = 0; i < SLOTS; i++) {
              const hx = holeX(side, i);
              const h = toWorld(hx, 0, th);
              add(h.x, h.y);
              add(h.x, h.y - HOLE_LABEL_TOP_EXTENT);
            }
          }
        }
        return { minX, minY, maxX, maxY };
      };

      const mergeStatics = (bb) => {
        const add = (wx, wy) => {
          bb.minX = Math.min(bb.minX, wx);
          bb.maxX = Math.max(bb.maxX, wx);
          bb.minY = Math.min(bb.minY, wy);
          bb.maxY = Math.max(bb.maxY, wy);
        };
        for (const [lx, ly] of standCorners) {
          const wx = PIVOT.x + sc * (lx - anchor.x);
          const wy = standTy + sc * (ly - anchor.y);
          add(wx, wy);
        }
        add(
          BEAM_LOCK_CX - (BEAM_LOCK_HIT_W * BEAM_LOCK_UI_SCALE) / 2,
          BEAM_LOCK_CY - (BEAM_LOCK_HIT_H * BEAM_LOCK_UI_SCALE) / 2,
        );
        add(
          BEAM_LOCK_CX + (BEAM_LOCK_HIT_W * BEAM_LOCK_UI_SCALE) / 2,
          BEAM_LOCK_CY + (BEAM_LOCK_HIT_H * BEAM_LOCK_UI_SCALE) / 2,
        );
        add(PIVOT.x - 280, BALANCE_LABEL_ABOVE_Y - 38);
        add(PIVOT.x + 280, BALANCE_LABEL_ABOVE_Y + 2);
        add(PIVOT.x, STAND_FOOT_BOTTOM_Y);
        add(PIVOT.x - 40, STAND_FOOT_BOTTOM_Y + 24);
        add(PIVOT.x + 40, STAND_FOOT_BOTTOM_Y + 24);
      };

      const bbFull = hullCore([MAX_TILT, -MAX_TILT, 0]);
      mergeStatics(bbFull);
      const bbRest = hullCore([0]);
      mergeStatics(bbRest);

      bbFull.minY = Math.max(
        bbFull.minY,
        bbRest.minY - SCENE_VIEWBOX_REST_TOP_PAD,
      );

      const maxY = bbFull.maxY + SCENE_WEIGHT_MARGIN_BELOW;
      const px = SCENE_PAD;
      const rawMinX = bbFull.minX - px;
      const rawMinY =
        bbFull.minY - px - (maxY - bbFull.minY + 2 * px) * SCENE_VISUAL_SHIFT_DOWN_FRAC;
      const rawW = bbFull.maxX - bbFull.minX + 2 * px;
      const rawH = maxY - bbFull.minY + 2 * px;
      const zoomedW = rawW / SCENE_VISUAL_ZOOM;
      const zoomedH = rawH / SCENE_VISUAL_ZOOM;
      return {
        minX: rawMinX + (rawW - zoomedW) / 2,
        minY: rawMinY + (rawH - zoomedH) / 2,
        w: zoomedW,
        h: zoomedH,
      };
    })();

    /** Mezera tlačítka „Sundat závaží“ pod spodek podstavce (obrazovka px). */
    const CLEAR_WEIGHTS_BELOW_FOOT_PX = 8;

    function hitBeamLock(px, py) {
      const dx = (px - BEAM_LOCK_CX) / BEAM_LOCK_UI_SCALE;
      const dy = (py - BEAM_LOCK_CY) / BEAM_LOCK_UI_SCALE;
      return (
        Math.abs(dx) <= BEAM_LOCK_HIT_W / 2 &&
        Math.abs(dy) <= BEAM_LOCK_HIT_H / 2
      );
    }

    /** Ikona zámečku nad páčkou (SVG, vyplněná a v barvě osy). */
    function BeamLockIcon({ locked }) {
      const b = COLORS.pivot;
      const shackle = locked
        ? html`<path
            key="lock-shackle-shut"
            d="M -14 5 L -14 -12 A 14 14 0 0 1 14 -12 L 14 5"
            fill="none"
            stroke=${b}
            strokeWidth=${4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />`
        : html`<path
            key="lock-shackle-open"
            d="M -14 5 L -14 -12 A 14 14 0 0 1 4 -21"
            fill="none"
            stroke=${b}
            strokeWidth=${4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />`;
      return html`
        <g
          key="beam-lock-icon-root"
          transform=${`translate(${BEAM_LOCK_CX},${BEAM_LOCK_CY}) scale(${BEAM_LOCK_UI_SCALE})`}
          style=${{ pointerEvents: "none", filter: "drop-shadow(0 2px 7px rgba(0,0,0,0.34))" }}
        >
          <title>
            ${
              locked
                ? "Osa zamčena v rovnováze. Kliknutím odemknout."
                : "Osa odemčena — páka reaguje na závaží. Kliknutím zamknout rovnováhu."
            }
          </title>
          ${shackle}
          <rect x="-20" y="4" width="40" height="31" rx="7" fill=${b} />
          <circle cx=${0} cy=${19} r=${3.4} fill="rgba(42, 34, 38, 0.36)" />
          <rect x=${-1.25} y=${19} width=${2.5} height=${8} rx=${1.1} fill="rgba(42, 34, 38, 0.36)" />
        </g>
      `;
    }

    function Beam({ theta, left, right, dropTargetHole, hoverPointer }) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      /** Stejná lineární část jako `toWorld` — jedna matrice místo translate+rotate(stupně). */
      const beamMat = `matrix(${c}, ${s}, ${-s}, ${c}, ${PIVOT.x}, ${PIVOT.y})`;
      const cyEdge = BEAM_TH / 2;
      const cradleD = `M ${-CRADLE_R} ${cyEdge} A ${CRADLE_R} ${CRADLE_R} 0 0 0 ${CRADLE_R} ${cyEdge} Z`;
      const holeFill = (n) =>
        Number(n || 0) > 0 ? COLORS.holeOccupied : COLORS.hole;
      const hintR = HOLE_R + HOLE_DROP_HINT_DR;
      const sx = hoverPointer?.sx;
      const sy = hoverPointer?.sy;
      const dropHalo =
        dropTargetHole &&
        html`<circle key="drop-hint-1"
          cx=${holeX(dropTargetHole.side, dropTargetHole.idx)} cy=${0} r=${hintR}
          fill="rgba(255,255,255,0.42)" stroke=${COLORS.pivot} strokeWidth=${2.75}
          style=${{ pointerEvents: "none" }}
        />`;
      return html`
        <g key="beam-assembly">
          <g transform=${beamMat}>
            <rect x=${-BEAM_HALF} y=${-BEAM_TH / 2}
              width=${BEAM_HALF * 2} height=${BEAM_TH}
              rx=${BEAM_TH / 2} ry=${BEAM_TH / 2}
              fill=${COLORS.beam} />
            ${dropHalo}
            ${IDX.map((i) => {
              const wL = hoverFocusAtHole(
                sx,
                sy,
                "left",
                i,
                theta,
                HOLE_LABEL_FOCUS_SIGMA,
              );
              const wR = hoverFocusAtHole(
                sx,
                sy,
                "right",
                i,
                theta,
                HOLE_LABEL_FOCUS_SIGMA,
              );
              const eL = Math.min(1, wL ** 1.08);
              const eR = Math.min(1, wR ** 1.08);
              const rL = HOLE_R * (1 + 0.52 * eL);
              const rR = HOLE_R * (1 + 0.52 * eR);
              return html`
                <g key=${`dh-${i}`}>
                  <circle
                    key=${`lh-${i}`}
                    cx=${holeX("left", i)}
                    cy=${0}
                    r=${rL}
                    fill=${holeFill(left[i])}
                    stroke=${eL > 0.07 ? COLORS.pivot : "none"}
                    strokeWidth=${1.3 + 2.8 * eL}
                    style=${{ pointerEvents: "none" }}
                  />
                  <circle
                    key=${`rh-${i}`}
                    cx=${holeX("right", i)}
                    cy=${0}
                    r=${rR}
                    fill=${holeFill(right[i])}
                    stroke=${eR > 0.07 ? COLORS.pivot : "none"}
                    strokeWidth=${1.3 + 2.8 * eR}
                    style=${{ pointerEvents: "none" }}
                  />
                </g>
              `;
            })}
            <path d=${cradleD} fill=${COLORS.beamCradle} style=${{ pointerEvents: "none" }} />
            <g
              transform=${`translate(0,${NEEDLE_OFFSET_Y}) scale(${NEEDLE_SCALE}) translate(${-NEEDLE_USER_TIP_X},${-NEEDLE_USER_TIP_Y})`}
              style=${{ pointerEvents: "none" }}>
              <path
                fill=${COLORS.pivotNeedle}
                d="M0.703315 0.707408C1.64652 -0.235803 3.17016 -0.235803 4.11337 0.707408C4.66358 1.25761 4.91148 2.03758 4.78451 2.80544L2.70461 15.442C2.6502 15.7746 2.17254 15.7746 2.11208 15.442L0.0321748 2.80544C-0.0947958 2.03758 0.159155 1.25761 0.703315 0.707408Z"
              />
            </g>
          </g>
        </g>`;
    }

    /** Čísla háčků — zvýraznění podle vzdálenosti od tečky; sousedé ±1 na stejné straně jsou záměrně menší. */
    function HoleSlotLabels({ theta, showHoleLabels, hoverHint }) {
      if (!showHoleLabels) return null;
      const ff = FONT_STACK;
      const texts = [];
      const sx = hoverHint?.sx;
      const sy = hoverHint?.sy;

      const raw = { left: [], right: [] };
      for (const side of ["left", "right"]) {
        for (let i = 0; i < SLOTS; i += 1) {
          let w = 0;
          if (sx != null && sy != null) {
            w = hoverFocusAtHole(sx, sy, side, i, theta, HOLE_LABEL_FOCUS_SIGMA);
          }
          raw[side].push(w);
        }
      }

      let bestS = "left";
      let bestI = 0;
      let bestW = -1;
      for (const side of ["left", "right"]) {
        for (let i = 0; i < SLOTS; i += 1) {
          const v = raw[side][i];
          if (v > bestW) {
            bestW = v;
            bestS = side;
            bestI = i;
          }
        }
      }

      for (const side of ["left", "right"]) {
        for (let i = 0; i < SLOTS; i += 1) {
          const a = toWorld(holeX(side, i), 0, theta);
          const lx = a.x;
          let ly = a.y - HOLE_LABEL_GAP_ABOVE;

          let w = raw[side][i];
          let wForSize = w;
          if (
            bestW > 1e-6 &&
            side === bestS &&
            Math.abs(i - bestI) === 1
          ) {
            wForSize = w * HOLE_LABEL_NEIGHBOR_DAMP;
          }
          const wSharp = Math.min(1, wForSize ** 1.35);
          const dSize = HOLE_LABEL_NUM_PEAK - HOLE_LABEL_FONT;
          ly -= dSize * 0.11 * wSharp;
          const fs = HOLE_LABEL_FONT + dSize * wSharp;
          const fw = 520 + Math.round((860 - 520) * wSharp);
          const sw = 2 + 5.5 * wSharp;
          const paintOrder = wSharp > 0.06 ? "stroke fill" : undefined;
          const fillPct = Math.round(w * 100);
          const fill = `color-mix(in oklab, ${COLORS.pivot} ${fillPct}%, ${COLORS.holeLabelMuted})`;

          texts.push(html`
            <text
              key=${`${side}-hl-${i}`}
              x=${lx}
              y=${ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill=${fill}
              stroke=${wSharp > 0.06 ? COLORS.bg : "none"}
              strokeWidth=${sw}
              paintOrder=${paintOrder}
              fontSize=${fs}
              fontWeight=${fw}
              fontFamily=${ff}
              style=${{ pointerEvents: "none" }}
            >
              ${i + 1}
            </text>
          `);
        }
      }

      return html`<g key="hole-slot-labels" style=${{ pointerEvents: "none" }}>${texts}</g>`;
    }

    /** Přidat (+ v kroužku) / odebrat (× v kroužku) — u kurzoru nad dírou / závažím. */
    function HoverActionBadge({ x, y, kind, rootKey = "hover-badge" }) {
      const isAdd = kind === "add";
      const iconColor = isAdd ? COLORS.pivot : COLORS.holeOccupied;
      const a = HOVER_BADGE_PLUS_ARM;
      const d = HOVER_BADGE_X_EXTENT;
      return html`
        <g
          key=${rootKey}
          transform=${`translate(${x},${y})`}
          style=${{ pointerEvents: "none" }}>
          ${
            isAdd
              ? html`<circle
                  r=${HOVER_BADGE_ADD_HALO_R}
                  fill=${COLORS.pivot}
                  fillOpacity=${0.92}
                  style=${{ pointerEvents: "none" }}
                />`
              : null
          }
          <circle
            r=${HOVER_BADGE_R + 0.65}
            fill="rgba(42, 34, 38, 0.12)"
            cx=${0.45}
            cy=${0.6}
            style=${{ pointerEvents: "none" }}
          />
          <circle
            r=${HOVER_BADGE_R}
            fill="rgba(255,255,255,0.98)"
            stroke=${COLORS.pivot}
            strokeWidth=${HOVER_BADGE_STROKE_W}
            style=${{ pointerEvents: "none" }}
          />
          ${
            isAdd
              ? html`<g
                  stroke=${iconColor}
                  strokeWidth=${HOVER_BADGE_ICON_SW}
                  strokeLinecap="round"
                  fill="none"
                  style=${{ pointerEvents: "none" }}>
                  <line x1=${-a} y1=${0} x2=${a} y2=${0} />
                  <line x1=${0} y1=${-a} x2=${0} y2=${a} />
                </g>`
              : html`<g
                  stroke=${iconColor}
                  strokeWidth=${HOVER_BADGE_ICON_SW}
                  strokeLinecap="round"
                  fill="none"
                  style=${{ pointerEvents: "none" }}>
                  <line x1=${-d} y1=${-d} x2=${d} y2=${d} />
                  <line x1=${d} y1=${-d} x2=${-d} y2=${d} />
                </g>`
          }
        </g>
      `;
    }

    function Stacks({ theta, counts, side }) {
      const groups = IDX.map((i) => {
        const n = Number(counts[i] || 0);
        if (n <= 0) return null;

        const { lx, ly } = holeHangLocal(side, i);
        const anchor = toWorld(lx, ly, theta);
        const wx = anchor.x;
        let y = anchor.y;
        let yBottomLast = anchor.y;
        const yTops = [];
        for (let k = 0; k < n; k += 1) {
          const ropeLen = k === 0 ? ROPE_FROM_HOLE : ROPE_BETWEEN;
          const yTopWeight = y + ropeLen;
          yTops.push(yTopWeight);
          yBottomLast = yTopWeight + WEIGHT_H;
          y = yTopWeight + WEIGHT_H + STACK_AFTER_WEIGHT;
        }
        const pieces = [
          html`<line key=${`rv-${side}-${i}`}
            x1=${wx} y1=${anchor.y} x2=${wx} y2=${yBottomLast}
            stroke=${COLORS.rope}
            strokeWidth=${ROPE_STROKE_W}
            strokeLinecap="round"
            style=${{ pointerEvents: "none" }}
          />`,
        ];
        for (let k = 0; k < n; k += 1) {
          const yTopWeight = yTops[k];
            pieces.push(html`
            <rect key=${`bk-${side}-${i}-${k}`}
              x=${wx - WEIGHT_W / 2}
              y=${yTopWeight}
              width=${WEIGHT_W}
              height=${WEIGHT_H}
              rx=${WEIGHT_CORNER_R}
              ry=${WEIGHT_CORNER_R}
              fill=${COLORS.weight}
            />`);
        }
        return html`<g key=${`stk-${side}-${i}`}>${pieces}</g>`;
      });
      return html`<g>${groups.filter(Boolean)}</g>`;
    }

    /**
     * Klepnutí → souřadnice ve viewBoxu. Nepoužíváme getScreenCTM().inverse() — s CSS škálováním
     * rodiče (i některých verzí Safari/tabletů) dává nesprávnou matici.
     */
    function clientToLocalSvg(clientX, clientY, svg) {
      if (!svg) return null;
      const vb = svg.viewBox?.baseVal;
      if (!vb || vb.width <= 0 || vb.height <= 0) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
      const dispW = vb.width * scale;
      const dispH = vb.height * scale;
      const tx = rect.left + (rect.width - dispW) / 2;
      /** Sladěno s `preserveAspectRatio="xMidYMid meet"` — svislé vycentrování ve viewportu SVG. */
      const ty = rect.top + (rect.height - dispH) / 2;
      return {
        x: vb.x + (clientX - tx) / scale,
        y: vb.y + (clientY - ty) / scale,
      };
    }

    /** Bod ve viewBoxu → client (viewport) px; sladěné s clientToLocalSvg. */
    function userToClientXY(ux, uy, svg) {
      if (!svg) return null;
      const vb = svg.viewBox?.baseVal;
      if (!vb || vb.width <= 0 || vb.height <= 0) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
      const dispW = vb.width * scale;
      const dispH = vb.height * scale;
      const tx = rect.left + (rect.width - dispW) / 2;
      const ty = rect.top + (rect.height - dispH) / 2;
      return {
        x: tx + (ux - vb.x) * scale,
        y: ty + (uy - vb.y) * scale,
      };
    }

    function LeverSimApp() {
      const [left, setLeft] = useState(() => zeros());
      const [right, setRight] = useState(() => zeros());
      const [dragPx, setDragPx] = useState(null);
      const [theta, setTheta] = useState(0);
      /** Kurzor: + u díry (add), × na závaží (remove). Při sloupci obojí. */
      const [hoverHint, setHoverHint] = useState(null);
      /** Zamknutá osa — tyč zůstane vodorovně (nezávisle na závažích). */
      const [beamLocked, setBeamLocked] = useState(true);

      const thetaRef = useRef(0);
      thetaRef.current = theta;

      const snapRef = useRef({ L: left, R: right });
      snapRef.current = { L: left, R: right };

      const dragRef = useRef(null);
      const balanceSvgRef = useRef(null);
      const stageRef = useRef(null);
      /** Místo pointerdown při tažení závaží z tyče — pro rozlišení kliku vs. přesunu. */
      const beamPickupClientRef = useRef(null);
      /** Pozice obalu tlačítka „Sundat závaží“ vůči `.stage` (px). */
      const [clearWeightsBtnPos, setClearWeightsBtnPos] = useState(null);

      useEffect(() => {
        let id;
        const loop = () => {
          const tgt = beamLocked
            ? 0
            : targetTheta(snapRef.current.L, snapRef.current.R);
          setTheta((prev) => {
            let n = prev + (tgt - prev) * 0.165;
            if (Math.abs(n - tgt) < 1e-6) n = tgt;
            return n;
          });
          id = requestAnimationFrame(loop);
        };
        id = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(id);
      }, [beamLocked]);

      const holesMeta = useMemo(() => {
        const list = [];
        const lyHole = 0;
        for (let i = 0; i < SLOTS; i += 1) {
          list.push({
            side: "left",
            idx: i,
            lx: holeX("left", i),
            ly: lyHole,
            r: HOLE_R + 44,
          });
          list.push({
            side: "right",
            idx: i,
            lx: holeX("right", i),
            ly: lyHole,
            r: HOLE_R + 44,
          });
        }
        return list;
      }, []);

      const clientToBalance = useCallback((clientX, clientY) => {
        return clientToLocalSvg(clientX, clientY, balanceSvgRef.current);
      }, []);

      const holeAt = useCallback(
        (x, y) => {
          const th = thetaRef.current;
          let best = null;
          let bestDist = Infinity;
          for (let q = 0; q < holesMeta.length; q += 1) {
            const h = holesMeta[q];
            const w = toWorld(h.lx, h.ly, th);
            const dist = Math.hypot(x - w.x, y - w.y);
            if (dist <= h.r && dist < bestDist) {
              bestDist = dist;
              best = { side: h.side, idx: h.idx };
            }
          }
          return best;
        },
        [holesMeta],
      );

      const columnAt = useCallback((x, y, L, R) => {
        const th = thetaRef.current;
        const hitR = Math.max(78, WEIGHT_W * 0.85);
        let best = null;
        let bestDist = Infinity;
        for (let i = SLOTS - 1; i >= 0; i -= 1) {
          for (const side of ["left", "right"]) {
            const cnt = Number((side === "left" ? L[i] : R[i]) || 0);
            if (!cnt) continue;
            const centers = plumbStackCenters(side, i, cnt, th);
            for (let k = centers.length - 1; k >= 0; k -= 1) {
              const { cx, cy } = centers[k];
              const dist = Math.hypot(x - cx, y - cy);
              if (dist < hitR && dist < bestDist) {
          bestDist = dist;
                best = { side, idx: i, cx, cy, k };
              }
            }
          }
        }
        return best;
      }, []);

      const refreshHoverHint = useCallback((clientX, clientY) => {
        const p = clientToLocalSvg(clientX, clientY, balanceSvgRef.current);
        if (!p) {
          setHoverHint(null);
          return;
        }
        if (dragRef.current) {
          setHoverHint(null);
          return;
        }
        const { L, R } = snapRef.current;
        const w = columnAt(p.x, p.y, L, R);
        const h = holeAt(p.x, p.y);
        const th = thetaRef.current;

        let add = null;
        let remove = null;

        if (h) {
          add = { side: h.side, idx: h.idx };
          const hw = toWorld(holeX(h.side, h.idx), 0, th);
          /* Nad dírou = +; × jen když je prst blíž závaží než středu díry. */
          if (
            w &&
            w.side === h.side &&
            w.idx === h.idx &&
            Math.hypot(p.x - w.cx, p.y - w.cy) < Math.hypot(p.x - hw.x, p.y - hw.y)
          ) {
            remove = { side: w.side, idx: w.idx, k: w.k };
          }
        } else if (w) {
          remove = { side: w.side, idx: w.idx, k: w.k };
          add = { side: w.side, idx: w.idx };
        }

        if (!add && !remove) {
          setHoverHint(null);
          return;
        }
        setHoverHint({ add, remove, clientX, clientY });
      }, [columnAt, holeAt]);

      function commitDrop(clientX, clientY) {
        const d = dragRef.current;
        const pickup = beamPickupClientRef.current;
        beamPickupClientRef.current = null;
        dragRef.current = null;
        setDragPx(null);
        if (!d) return;

        const movedMuch =
          !pickup ||
          Math.hypot(clientX - pickup.x, clientY - pickup.y) >= BEAM_DRAG_TAP_MAX_PX;

        const pBal = clientToBalance(clientX, clientY);
        const x = pBal ? pBal.x : -1;
        const y = pBal ? pBal.y : -1;

        const h = pBal ? holeAt(x, y) : null;
        if (h) {
          const sameSlot = h.side === d.side && h.idx === d.idx;
          if (sameSlot && !movedMuch) {
          return;
        }
          const set = h.side === "left" ? setLeft : setRight;
          set((prev) => {
            const a = [...prev];
            a[h.idx] += 1;
            return a;
          });
          return;
        }

        /* Klik na × nad závažím: puštění je mimo kruh díry → holeAt null, jinak se závaží zbytečně vrátilo. */
        if (!movedMuch) {
          return;
        }

        const set = d.side === "left" ? setLeft : setRight;
        set((prev) => {
          const a = [...prev];
          a[d.idx] += 1;
          return a;
        });
      }

      function clearAllWeights() {
        dragRef.current = null;
        beamPickupClientRef.current = null;
        setDragPx(null);
        setHoverHint(null);
        thetaRef.current = 0;
        setTheta(0);
        setLeft(zeros());
        setRight(zeros());
      }

      function onBalancePointerMove(e) {
        refreshHoverHint(e.clientX, e.clientY);
        if (!dragRef.current) return;
        const pickup = beamPickupClientRef.current;
        if (
          pickup &&
          Math.hypot(e.clientX - pickup.x, e.clientY - pickup.y) <
            BEAM_DRAG_TAP_MAX_PX
        ) {
          return;
        }
        const p = clientToBalance(e.clientX, e.clientY);
        if (!p) return;
        setDragPx({ x: p.x, y: p.y });
      }

      function onBalancePointerUp(e) {
        if (dragRef.current) {
          commitDrop(e.clientX, e.clientY);
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => refreshHoverHint(e.clientX, e.clientY));
        });
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (_) { /* nop */ }
      }

      function onBalancePointerCancel(e) {
        const d = dragRef.current;
        beamPickupClientRef.current = null;
        if (d) {
          dragRef.current = null;
          setDragPx(null);
          const set = d.side === "left" ? setLeft : setRight;
          set((prev) => {
            const a = [...prev];
            a[d.idx] += 1;
            return a;
          });
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => refreshHoverHint(e.clientX, e.clientY));
        });
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (_) { /* nop */ }
      }

      const showDropHints =
        dragPx != null && dragRef.current != null;
      const showHoleSlotNumbers = showDropHints || hoverHint != null;
      const dropTargetHole =
        showDropHints && dragPx ? holeAt(dragPx.x, dragPx.y) : null;

      const balanceGhost =
        dragPx &&
        dragRef.current &&
        html`<rect
          x=${dragPx.x - WEIGHT_W / 2}
          y=${dragPx.y - WEIGHT_H / 2}
          width=${WEIGHT_W}
          height=${WEIGHT_H}
          rx=${WEIGHT_CORNER_R}
          ry=${WEIGHT_CORNER_R}
          fill=${COLORS.weight}
          style=${{ pointerEvents: "none" }}
        />`;

      let hoverPointerLive = null;
      let hoverAddPos = null;
      let hoverRemovePos = null;
      if (hoverHint) {
        const p = clientToLocalSvg(
          hoverHint.clientX,
          hoverHint.clientY,
          balanceSvgRef.current,
        );
        if (p) {
          hoverPointerLive = { sx: p.x, sy: p.y };
          if (hoverHint.add) {
            const hw = toWorld(
              holeX(hoverHint.add.side, hoverHint.add.idx),
              0,
              theta,
            );
            hoverAddPos = { x: hw.x, y: hw.y };
          }
          if (hoverHint.remove) {
            const { side, idx, k } = hoverHint.remove;
            const cnt = Number(
              (side === "left" ? left[idx] : right[idx]) || 0,
            );
            if (cnt > 0 && k >= 0 && k < cnt) {
              const centers = plumbStackCenters(side, idx, cnt, theta);
              const c = centers[k];
              if (c) hoverRemovePos = { x: c.cx, y: c.cy };
            }
          }
        }
      }

      const hoverHud =
        hoverHint &&
        hoverPointerLive &&
        (hoverAddPos || hoverRemovePos) &&
        html`<g key="hover-hud-root" style=${{ pointerEvents: "none" }}>
          ${hoverAddPos &&
            html`<${HoverActionBadge}
              rootKey="hover-badge-add"
              x=${hoverAddPos.x}
              y=${hoverAddPos.y}
              kind="add"
            />`}
          ${hoverRemovePos &&
            html`<${HoverActionBadge}
              rootKey="hover-badge-remove"
              x=${hoverRemovePos.x}
              y=${hoverRemovePos.y}
              kind="remove"
            />`}
        </g>`;

      const totalWeights = useMemo(
        () =>
          IDX.reduce(
            (s, i) => s + Number(left[i] || 0) + Number(right[i] || 0),
            0,
          ),
        [left, right],
      );

      useLayoutEffect(() => {
        if (totalWeights <= 0) {
          setClearWeightsBtnPos(null);
          return;
        }
        const update = () => {
          const svg = balanceSvgRef.current;
          const main = stageRef.current;
          if (!svg || !main) return;
          const sp = userToClientXY(PIVOT.x, STAND_FOOT_BOTTOM_Y, svg);
          if (!sp) return;
          const mr = main.getBoundingClientRect();
          setClearWeightsBtnPos({
            left: sp.x - mr.left,
            top: sp.y - mr.top + CLEAR_WEIGHTS_BELOW_FOOT_PX,
          });
        };
        update();
        const ro = new ResizeObserver(update);
        if (stageRef.current) ro.observe(stageRef.current);
        window.addEventListener("resize", update);
        return () => {
          ro.disconnect();
          window.removeEventListener("resize", update);
        };
      }, [totalWeights]);

      const showBalancedLabel = useMemo(() => {
        if (beamLocked) return false;
        if (totalWeights === 0) return false;
        const tau = netMomentAboutPivot(left, right);
        const tauOk =
          Math.abs(tau) <
          Math.max(1.5, TAU_REF_ONE_SIDE_UNITS * 5e-5);
        const angleOk = Math.abs(theta) < 0.055;
        return tauOk && angleOk;
      }, [beamLocked, totalWeights, left, right, theta]);

      return html`
        <div class="app app--lever">
          <header class="sim-subheader">
            <a
              class="hub-back-to-sims"
              href=${LEVER_HUB_HREF}
              aria-label="Zpět na přehled simulací"
              >← Přehled simulací</a>
            <h1 class="sim-subheader-title">Páka</h1>
          </header>
          <main
            class="stage"
            ref=${(el) => {
              stageRef.current = el;
            }}
          >
            <div
              class="stage-svg-scale-wrap"
              style=${{ "--scene-ar": `${SCENE_VIEW.w} / ${SCENE_VIEW.h}` }}
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stage-svg"
              overflow="visible"
              viewBox=${`${SCENE_VIEW.minX} ${SCENE_VIEW.minY} ${SCENE_VIEW.w} ${SCENE_VIEW.h}`}
              preserveAspectRatio="xMidYMid meet"
              ref=${(el) => {
                balanceSvgRef.current = el;
              }}
              onPointerDown=${(e) => {
                const p = clientToLocalSvg(e.clientX, e.clientY, balanceSvgRef.current);
                if (!p) return;
                if (hitBeamLock(p.x, p.y)) {
                  setBeamLocked((v) => !v);
                  return;
                }
                const th = thetaRef.current;
                const c = columnAt(p.x, p.y, left, right);
                const h = holeAt(p.x, p.y);

                if (h) {
                  let addAtHole = true;
                  if (c) {
                    const hw = toWorld(holeX(h.side, h.idx), 0, th);
                    const dHole = Math.hypot(p.x - hw.x, p.y - hw.y);
                    const dWeight = Math.hypot(p.x - c.cx, p.y - c.cy);
                    if (c.side === h.side && c.idx === h.idx) {
                      addAtHole = dHole <= dWeight;
        } else {
                      addAtHole = dHole < dWeight;
                    }
                  }
                  if (addAtHole) {
                    const set = h.side === "left" ? setLeft : setRight;
                    set((prev) => {
                      const a = [...prev];
                      a[h.idx] += 1;
                      return a;
                    });
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() =>
                        refreshHoverHint(e.clientX, e.clientY),
                      );
                    });
                    return;
                  }
                }

                if (c) {
                  beamPickupClientRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                  };
                  dragRef.current = { side: c.side, idx: c.idx };
                  if (c.side === "left") {
                    setLeft((prev) => {
                      const a = [...prev];
                      a[c.idx] = Math.max(0, a[c.idx] - 1);
                      return a;
                    });
                  } else {
                    setRight((prev) => {
                      const a = [...prev];
                      a[c.idx] = Math.max(0, a[c.idx] - 1);
                      return a;
                    });
                  }
                  refreshHoverHint(e.clientX, e.clientY);
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch (_) { /* nop */ }
                  return;
                }
              }}
              onPointerMove=${onBalancePointerMove}
              onPointerUp=${onBalancePointerUp}
              onPointerCancel=${onBalancePointerCancel}
              onPointerLeave=${() => setHoverHint(null)}>
              <${PivotStand} />
              <${Beam}
                theta=${theta}
                left=${left}
                right=${right}
                dropTargetHole=${dropTargetHole}
                hoverPointer=${
                  hoverPointerLive
                    ? { sx: hoverPointerLive.sx, sy: hoverPointerLive.sy }
                    : null
                }
              />
              <${Stacks} theta=${theta} counts=${left} side="left" />
              <${Stacks} theta=${theta} counts=${right} side="right" />
              <${HoleSlotLabels}
                theta=${theta}
                showHoleLabels=${showHoleSlotNumbers}
                hoverHint=${
                  hoverPointerLive
                    ? { sx: hoverPointerLive.sx, sy: hoverPointerLive.sy }
                    : null
                }
              />
              ${showBalancedLabel &&
                html`<text
                  key="balance-status"
                  x=${PIVOT.x}
                  y=${BALANCE_LABEL_ABOVE_Y}
                  textAnchor="middle"
                  dominantBaseline="bottom"
                  fill=${COLORS.pivot}
                  stroke=${COLORS.bg}
                  strokeWidth=${6}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  fontSize=${38}
                  fontWeight=${800}
                  letterSpacing="-0.03em"
                  fontFamily=${FONT_STACK}
                  style=${{ pointerEvents: "none", filter: "drop-shadow(0 2px 10px rgba(219, 39, 119, 0.28))" }}
                  aria-live="polite"
                >
                  páka je v rovnováze
                </text>`}
              <${BeamLockIcon} locked=${beamLocked} />
              ${balanceGhost}
              ${hoverHud}
            </svg>
            </div>
            ${totalWeights > 0 &&
              clearWeightsBtnPos &&
              html`<div
                class="clear-weights-btn-wrap"
                style=${{
                  left: clearWeightsBtnPos.left,
                  top: clearWeightsBtnPos.top,
                }}
              >
                <button
                  type="button"
                  class="clear-weights-btn"
                  onClick=${clearAllWeights}
                >
                  Sundat závaží
                </button>
              </div>`}
          </main>
        </div>`;
    }
    createRoot(document.getElementById("root")).render(html`<${LeverSimApp} />`);
