const MAX_EDGE = 1600;
const PHOTO_SRC = "assets/vzorek.png";

const view = document.getElementById("view");
const app = document.querySelector(".app");
const stage = document.querySelector(".stage");
const ctx = view.getContext("2d", { willReadFrequently: true });
const fileInput = document.getElementById("file-input");
const zoomBtn = document.getElementById("zoom-btn");

const sourceButtons = {
  photo: document.getElementById("src-photo"),
  upload: document.getElementById("src-upload"),
};

const channelButtons = {
  red: document.getElementById("ch-red"),
  green: document.getElementById("ch-green"),
  blue: document.getElementById("ch-blue"),
};

const state = {
  source: "photo",
  red: true,
  green: true,
  blue: true,
  pixels: null,
  zoomed: false,
};

function setSourceActive(name) {
  state.source = name;
  for (const [key, button] of Object.entries(sourceButtons)) {
    const active = key === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function render() {
  const source = state.pixels;
  if (!source) return;

  const { width, height } = source;
  const output = new ImageData(new Uint8ClampedArray(source.data), width, height);
  const data = output.data;

  if (!state.red || !state.green || !state.blue) {
    for (let i = 0; i < data.length; i += 4) {
      if (!state.red) data[i] = 0;
      if (!state.green) data[i + 1] = 0;
      if (!state.blue) data[i + 2] = 0;
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
  const maxW =
    stage.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
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

async function showPhoto() {
  setSourceActive("photo");
  const image = await loadImage(PHOTO_SRC);
  state.pixels = pixelsFromImage(image);
  render();
}

async function showFile(file) {
  const image = await imageFromFile(file);
  setSourceActive("upload");
  state.pixels = pixelsFromImage(image);
  if (image.close) image.close();
  render();
}

function toggleChannel(name) {
  state[name] = !state[name];
  const button = channelButtons[name];
  button.classList.toggle("is-on", state[name]);
  button.setAttribute("aria-pressed", String(state[name]));
  render();
}

for (const [name, button] of Object.entries(channelButtons)) {
  button.addEventListener("click", () => toggleChannel(name));
}

sourceButtons.photo.addEventListener("click", () => {
  showPhoto().catch(() => {});
});

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
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
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

  const key = event.key.toLowerCase();
  if (key === "r") toggleChannel("red");
  if (key === "g" || key === "z") toggleChannel("green");
  if (key === "b" || key === "m") toggleChannel("blue");
});

new ResizeObserver(() => {
  fitViewToStage();
}).observe(stage);

window.addEventListener("resize", () => {
  fitViewToStage();
});

showPhoto().catch(() => {});
