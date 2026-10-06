(function () {
  const scriptEl = document.currentScript;
  const base = scriptEl && scriptEl.src ? scriptEl.src.replace(/[^/]+$/, "") : "../shared/";
  const TITLE_SELECTOR = [
    "h1.panel-title",
    "h1.page-title",
    "h1.hud-title",
    "h1.sim-panel-title",
    "h1.sim-subheader-title",
  ].join(",");

  const QR_ICON =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<rect x="3" y="3" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="14" y="3" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1.2" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M14 14h3v3h-3zM19 14h2v2h-2zM17 19h2v2h-2zM14 19h2v2h-2zM20 18h1v3h-3v-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  function loadStyles() {
    if (document.querySelector("link[data-sim-qr]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = base + "sim-qr.css";
    link.setAttribute("data-sim-qr", "");
    document.head.appendChild(link);
  }

  function loadQrLib(done) {
    if (typeof qrcode === "function") {
      done();
      return;
    }
    const existing = document.querySelector("script[data-sim-qr-lib]");
    if (existing) {
      existing.addEventListener("load", done);
      return;
    }
    const script = document.createElement("script");
    script.src = base + "qrcode.min.js";
    script.setAttribute("data-sim-qr-lib", "");
    script.onload = done;
    script.onerror = done;
    document.head.appendChild(script);
  }

  function simUrl() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/index\.html$/i, "/");
    return url.href;
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sim-qr-btn";
    btn.setAttribute("aria-label", "Zobrazit QR kód s adresou simulace");
    btn.title = "QR kód";
    btn.innerHTML = QR_ICON;
    btn.addEventListener("click", openOverlay);
    return btn;
  }

  function wrapWithButton(anchor) {
    if (!anchor || anchor.closest(".sim-title-row") || anchor.dataset.simQrBound === "1") {
      return;
    }
    const row = document.createElement("div");
    row.className = "sim-title-row";
    anchor.parentNode.insertBefore(row, anchor);
    row.appendChild(anchor);
    row.appendChild(createButton());
    anchor.dataset.simQrBound = "1";
  }

  function attachUnderBack(backLink) {
    if (
      !backLink ||
      backLink.closest(".sim-qr-under-back") ||
      backLink.dataset.simQrBound === "1"
    ) {
      return;
    }
    const col = document.createElement("div");
    col.className = "sim-qr-under-back";
    backLink.parentNode.insertBefore(col, backLink);
    col.appendChild(backLink);
    col.appendChild(createButton());
    backLink.dataset.simQrBound = "1";
  }

  function attachTitles(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const sceneStart = document.querySelector(".supply-strip__start");
    const sceneBack = sceneStart && sceneStart.querySelector(".hub-back-to-sims");
    if (sceneBack && sceneStart.querySelector(".scene-title")) {
      attachUnderBack(sceneBack);
    }
    scope.querySelectorAll(TITLE_SELECTOR).forEach(wrapWithButton);
    attachOptikaTitle();

    if (scope.querySelector && scope.querySelector(".sim-qr-btn")) return;

    const hustotaBack = document.querySelector(".global-actions > .hub-back-to-sims");
    if (hustotaBack) wrapWithButton(hustotaBack);
  }

  function attachOptikaTitle() {
    const root = document.getElementById("root");
    if (!root) return;
    const title = [...root.querySelectorAll("h1")].find(
      (heading) => heading.textContent.replace(/\s+/g, " ").trim() === "Geometrická optika",
    );
    if (!title) return;
    const next = title.nextElementSibling;
    if (next && next.classList.contains("sim-qr-btn")) return;
    title.insertAdjacentElement("afterend", createButton());
  }

  function makeQrSvg(url) {
    if (typeof qrcode !== "function") return "";
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs["UTF-8"]) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
    }
    const qr = qrcode(0, "M");
    qr.addData(url, "Byte");
    qr.make();
    return qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true, alt: url });
  }

  function closeOverlay() {
    const overlay = document.querySelector(".sim-qr-overlay");
    if (!overlay) return;
    overlay.remove();
    document.removeEventListener("keydown", onOverlayKey);
  }

  function onOverlayKey(ev) {
    if (ev.key === "Escape") closeOverlay();
  }

  function openOverlay(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    closeOverlay();

    const url = simUrl();
    const overlay = document.createElement("div");
    overlay.className = "sim-qr-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "QR kód simulace");

    overlay.innerHTML =
      '<div class="sim-qr-dialog">' +
      '<button type="button" class="sim-qr-close" aria-label="Zavřít">×</button>' +
      '<div class="sim-qr-code">' +
      makeQrSvg(url) +
      "</div>" +
      '<p class="sim-qr-url"></p>' +
      "</div>";

    overlay.querySelector(".sim-qr-url").textContent = url;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeOverlay();
    });
    overlay.querySelector(".sim-qr-close").addEventListener("click", closeOverlay);
    document.addEventListener("keydown", onOverlayKey);
    document.body.appendChild(overlay);
  }

  function start() {
    loadStyles();
    loadQrLib(() => {
      attachTitles(document);
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes && mutation.addedNodes.length) {
            attachTitles(document);
            break;
          }
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
