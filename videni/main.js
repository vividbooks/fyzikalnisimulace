const MAX_EDGE = 1600;
const PHOTOS = [
  { src: "assets/vzorek.png", label: "Zátiší" },
  { src: "assets/pastelky.png", label: "Pastelky", transparent: true },
  { src: "assets/mic-trava.jpg?v=long-grass-1", label: "Míč v trávě" },
  { src: "assets/semafor.png", label: "Semafor", transparent: true },
  { src: "assets/papriky.jpg", label: "Papriky" },
  { src: "assets/vlci-maky.jpg", label: "Květiny" },
  { src: "assets/papousek.jpg", label: "Papoušek" },
];

const view = document.getElementById("view");
const app = document.querySelector(".app");
const stage = document.querySelector(".stage");
const ctx = view.getContext("2d", { willReadFrequently: true });
const fileInput = document.getElementById("file-input");
const zoomBtn = document.getElementById("zoom-btn");
const photoPrevBtn = document.getElementById("photo-prev");
const photoNextBtn = document.getElementById("photo-next");

const sourceButtons = {
  photo: document.getElementById("src-photo"),
  upload: document.getElementById("src-upload"),
};

const rgBlindBtn = document.getElementById("mode-rg-blind");
const channelScrubs = {
  red: document.querySelector('.channel-scrub[data-channel="red"]'),
  green: document.querySelector('.channel-scrub[data-channel="green"]'),
  blue: document.querySelector('.channel-scrub[data-channel="blue"]'),
};

const state = {
  source: "photo",
  photoIndex: 0,
  intensity: { red: 100, green: 100, blue: 100 },
  savedIntensity: { red: 100, green: 100, blue: 100 },
  locked: { red: false, green: false, blue: false },
  rgBlind: false,
  pixels: null,
  zoomed: false,
};

function setSourceActive(name) {
  state.source = name;
  app.classList.toggle("is-upload", name === "upload");
  for (const [key, button] of Object.entries(sourceButtons)) {
    const active = key === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function channelGain(name) {
  return state.intensity[name] / 100;
}

function render() {
  const source = state.pixels;
  if (!source) return;

  const { width, height } = source;
  const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
  const data = output.data;

  if (state.rgBlind) {
    // Deuteranopia (Viénot 1999): red and green collapse into gray, brown or yellow.
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      data[i] = clampByte(0.367322 * r + 0.860646 * g - 0.227968 * b);
      data[i + 1] = clampByte(0.280085 * r + 0.672501 * g + 0.047413 * b);
      data[i + 2] = clampByte(-0.01182 * r + 0.04294 * g + 0.968881 * b);
    }
  } else {
    const redGain = channelGain("red");
    const greenGain = channelGain("green");
    const blueGain = channelGain("blue");
    if (redGain !== 1 || greenGain !== 1 || blueGain !== 1) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        if (redGain !== 1) data[i] = clampByte(data[i] * redGain);
        if (greenGain !== 1) data[i + 1] = clampByte(data[i + 1] * greenGain);
        if (blueGain !== 1) data[i + 2] = clampByte(data[i + 2] * blueGain);
      }
    }
  }

  if (view.width !== width || view.height !== height) {
    view.width = width;
    view.height = height;
  }

  ctx.putImageData(output, 0, 0);
  fitViewToStage();
}

function fitViewToStage() {
  const source = state.pixels;
  if (!source) return;

  const style = getComputedStyle(stage);
  const gap = parseFloat(style.columnGap || style.gap) || 0;
  const navSpace =
    state.source === "photo"
      ? photoPrevBtn.offsetWidth + photoNextBtn.offsetWidth + gap * 2
      : 0;
  const maxW =
    stage.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight) -
    navSpace;
  const maxH =
    stage.clientHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);

  if (maxW < 1 || maxH < 1) return;

  const scale = Math.min(maxW / source.width, maxH / source.height);
  view.style.width = `${Math.max(1, Math.floor(source.width * scale))}px`;
  view.style.height = `${Math.max(1, Math.floor(source.height * scale))}px`;
}

function setZoomed(zoomed) {
  state.zoomed = zoomed;
  app.classList.toggle("is-zoomed", zoomed);
  zoomBtn.setAttribute("aria-pressed", String(zoomed));
  zoomBtn.setAttribute(
    "aria-label",
    zoomed
      ? "Opustit celou obrazovku"
      : "Zobrazit obrázek přes celou obrazovku prohlížeče"
  );
  requestAnimationFrame(() => fitViewToStage());
}

async function toggleFullscreen() {
  const active = document.fullscreenElement || document.webkitFullscreenElement;

  if (active === app) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    return;
  }

  try {
    if (app.requestFullscreen) {
      await app.requestFullscreen();
    } else if (app.webkitRequestFullscreen) {
      app.webkitRequestFullscreen();
    } else {
      setZoomed(true);
    }
  } catch {
    setZoomed(true);
  }
}

function imageDataFromCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function fitSize(width, height) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function pixelsFromImage(image) {
  const size = fitSize(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size.width, size.height);
  return imageDataFromCanvas(canvas);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Obrázek se nepodařilo načíst."));
    image.src = src;
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Obrázek se nepodařilo načíst."));
    reader.readAsDataURL(file);
  });
}

async function imageFromFile(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (_) {
      try {
        return await createImageBitmap(file);
      } catch (_) {
        /* fallback below */
      }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } catch (_) {
    const dataUrl = await readFileAsDataURL(file);
    return loadImage(dataUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

let loadingPhoto = false;

async function showPhoto(index = state.photoIndex) {
  if (loadingPhoto) return;
  const nextIndex = (index + PHOTOS.length) % PHOTOS.length;
  const photo = PHOTOS[nextIndex];
  loadingPhoto = true;
  try {
    setSourceActive("photo");
    const image = await loadImage(photo.src);
    state.photoIndex = nextIndex;
    state.pixels = pixelsFromImage(image);
    view.classList.toggle("is-clear-bg", Boolean(photo.transparent));
    view.setAttribute("aria-label", photo.label);
    render();
  } finally {
    loadingPhoto = false;
  }
}

function showNextPhoto() {
  if (state.source !== "photo") return;
  showPhoto(state.photoIndex + 1).catch(() => {});
}

function showPrevPhoto() {
  if (state.source !== "photo") return;
  showPhoto(state.photoIndex - 1).catch(() => {});
}

async function showFile(file) {
  const image = await imageFromFile(file);
  setSourceActive("upload");
  state.pixels = pixelsFromImage(image);
  view.classList.remove("is-clear-bg");
  if (image.close) image.close();
  render();
}

function setChannelDisabled(disabled) {
  for (const scrub of Object.values(channelScrubs)) {
    scrub.classList.toggle("is-disabled", disabled);
    scrub.setAttribute("aria-disabled", String(disabled));
    scrub.tabIndex = disabled ? -1 : 0;
  }
}

function lockLabel(name, locked) {
  const color =
    name === "red" ? "červenou" : name === "green" ? "zelenou" : "modrou";
  return locked
    ? `Odemknout ${color}`
    : `Zamknout ${color} na 0 %`;
}

function syncChannelUi(name) {
  const scrub = channelScrubs[name];
  const locked = state.locked[name];
  const value = state.intensity[name];
  const lockBtn = scrub.querySelector(".channel-lock");
  scrub.classList.toggle("is-locked", locked);
  scrub.querySelector(".channel-val").textContent = String(value);
  scrub.setAttribute("aria-valuenow", String(value));
  lockBtn.setAttribute("aria-pressed", String(locked));
  lockBtn.setAttribute("aria-label", lockLabel(name, locked));
}

function setChannelIntensity(name, value) {
  if (state.rgBlind || state.locked[name]) return;
  const next = Math.max(0, Math.min(100, Math.round(value)));
  if (next === state.intensity[name]) return;
  state.intensity[name] = next;
  syncChannelUi(name);
  render();
}

function toggleChannelLock(name) {
  if (state.rgBlind) return;
  if (state.locked[name]) {
    state.locked[name] = false;
    state.intensity[name] = state.savedIntensity[name];
  } else {
    state.savedIntensity[name] = state.intensity[name];
    state.locked[name] = true;
    state.intensity[name] = 0;
  }
  syncChannelUi(name);
  render();
}

function bindChannelScrub(name) {
  const scrub = channelScrubs[name];
  let dragging = false;
  let startX = 0;
  let startValue = 0;
  let pointerId = null;

  function applyValue(value) {
    setChannelIntensity(name, value);
  }

  function stopDragging() {
    if (!dragging) return;
    dragging = false;
    pointerId = null;
    window.removeEventListener("pointermove", onPointerMove, true);
    window.removeEventListener("pointerup", onPointerUp, true);
    window.removeEventListener("pointercancel", onPointerUp, true);
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    applyValue(startValue + Math.round((event.clientX - startX) / 2));
  }

  function onPointerUp(event) {
    if (!dragging || event.pointerId !== pointerId) return;
    stopDragging();
  }

  scrub.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.rgBlind || state.locked[name]) return;
    if (event.target.closest(".channel-scrub-arrow, .channel-lock")) return;
    dragging = true;
    pointerId = event.pointerId;
    startX = event.clientX;
    startValue = state.intensity[name];
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
  });

  scrub.querySelector(".channel-lock").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleChannelLock(name);
  });

  scrub.querySelector(".channel-scrub-arrow-dec").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyValue(state.intensity[name] - 1);
  });
  scrub.querySelector(".channel-scrub-arrow-inc").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyValue(state.intensity[name] + 1);
  });

  scrub.addEventListener("keydown", (event) => {
    if (state.rgBlind) return;
    if (event.key === " " || event.key === "Enter") {
      if (event.target.closest(".channel-lock")) return;
      event.preventDefault();
      toggleChannelLock(name);
      return;
    }
    if (state.locked[name]) return;
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      applyValue(state.intensity[name] - step);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      applyValue(state.intensity[name] + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      applyValue(0);
    } else if (event.key === "End") {
      event.preventDefault();
      applyValue(100);
    }
  });

  scrub.addEventListener("wheel", (event) => {
    if (state.rgBlind || state.locked[name]) return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    applyValue(state.intensity[name] + (event.deltaY > 0 ? -step : step));
  }, { passive: false });

  syncChannelUi(name);
}

function toggleRgBlind() {
  state.rgBlind = !state.rgBlind;
  rgBlindBtn.classList.toggle("is-on", state.rgBlind);
  rgBlindBtn.setAttribute("aria-pressed", String(state.rgBlind));
  setChannelDisabled(state.rgBlind);
  render();
}

for (const name of Object.keys(channelScrubs)) {
  bindChannelScrub(name);
}

rgBlindBtn.addEventListener("click", toggleRgBlind);

sourceButtons.photo.addEventListener("click", () => {
  showPhoto().catch(() => {});
});

photoPrevBtn.addEventListener("click", showPrevPhoto);
photoNextBtn.addEventListener("click", showNextPhoto);

zoomBtn.addEventListener("click", () => {
  toggleFullscreen();
});

document.addEventListener("fullscreenchange", syncFullscreenState);
document.addEventListener("webkitfullscreenchange", syncFullscreenState);

function syncFullscreenState() {
  const active = document.fullscreenElement || document.webkitFullscreenElement;
  setZoomed(active === app);
}

let loadingFile = false;

function onFileChosen() {
  const file = fileInput.files && fileInput.files[0];
  if (!file || loadingFile) return;
  fileInput.value = "";
  loadingFile = true;
  showFile(file)
    .catch(() => {})
    .finally(() => {
      loadingFile = false;
    });
}

fileInput.addEventListener("change", onFileChosen);
fileInput.addEventListener("input", onFileChosen);

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.closest(".channel-scrub"))
  ) {
    return;
  }

  if (
    event.key === "Escape" &&
    (document.fullscreenElement === app || document.webkitFullscreenElement === app)
  ) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    return;
  }

  if (event.key === "ArrowLeft") {
    showPrevPhoto();
    return;
  }
  if (event.key === "ArrowRight") {
    showNextPhoto();
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "s") toggleRgBlind();
});

new ResizeObserver(() => {
  fitViewToStage();
}).observe(stage);

window.addEventListener("resize", () => {
  fitViewToStage();
});

showPhoto().catch(() => {});
