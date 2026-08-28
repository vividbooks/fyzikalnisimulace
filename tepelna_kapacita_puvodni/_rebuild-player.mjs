import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

export function buildPlayer(slides) {
  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tepelná kapacita — nápověda ovládání</title>
  <style>
    html, body {
      margin: 0;
      height: 100%;
      background: #1e2533;
      color: #f8fafc;
      font-family: "Fenomen Sans", ui-sans-serif, system-ui, sans-serif;
    }
    .wrap {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      gap: 16px;
    }
    h1 { margin: 0; font-weight: 400; font-size: 28px; }
    .stage {
      position: relative;
      width: min(1440px, 100%);
      aspect-ratio: 1440 / 900;
      background: #111827;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,.35);
      cursor: pointer;
    }
    .stage img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0;
      transition: opacity .25s ease;
      pointer-events: none;
    }
    .stage img.is-on { opacity: 1; }
    .bar {
      width: min(1440px, 100%);
      height: 6px;
      background: #334155;
      border-radius: 999px;
      overflow: hidden;
    }
    .bar > span {
      display: block;
      height: 100%;
      width: 0;
      background: #3b82f6;
      transition: width .2s ease;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .step {
      min-width: 7.5rem;
      text-align: center;
      color: #cbd5e1;
      font-size: 1rem;
    }
    button {
      appearance: none;
      border: 0;
      border-radius: 12px;
      padding: 10px 18px;
      background: #334155;
      color: #f8fafc;
      font: inherit;
      cursor: pointer;
    }
    button:hover:not(:disabled) { background: #3b82f6; }
    button:disabled { opacity: .4; cursor: default; }
    .hint { margin: 0; color: #94a3b8; font-size: .9rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Tepelná kapacita — přehled ovládání</h1>
    <div class="stage" id="stage" title="Další krok"></div>
    <div class="bar"><span id="progress"></span></div>
    <div class="row">
      <button type="button" id="prev">Zpět</button>
      <span class="step" id="stepLabel">Krok 1 / 1</span>
      <button type="button" id="next">Další</button>
    </div>
    <p class="hint">Listuj tlačítky nebo šipkami na klávesnici.</p>
  </div>
  <script>
    const slides = ${JSON.stringify(slides)};
    const stage = document.getElementById("stage");
    const progress = document.getElementById("progress");
    const stepLabel = document.getElementById("stepLabel");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const imgs = slides.map(function (s) {
      const img = document.createElement("img");
      img.src = s.src;
      img.alt = s.caption;
      stage.appendChild(img);
      return img;
    });
    let i = 0;
    function show(index) {
      i = Math.max(0, Math.min(slides.length - 1, index));
      imgs.forEach(function (img, n) { img.classList.toggle("is-on", n === i); });
      stepLabel.textContent = "Krok " + (i + 1) + " / " + slides.length;
      progress.style.width = ((i + 1) / slides.length * 100) + "%";
      prevBtn.disabled = i === 0;
      nextBtn.disabled = i === slides.length - 1;
    }
    prevBtn.onclick = function () { show(i - 1); };
    nextBtn.onclick = function () { show(i + 1); };
    stage.onclick = function () {
      if (i < slides.length - 1) show(i + 1);
    };
    document.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        show(i + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(i - 1);
      }
    });
    show(0);
  </script>
</body>
</html>
`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "navod-ovladani.html"
  );
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/const slides = (\[[\s\S]*?\]);\n/);
  if (!match) {
    throw new Error("Nepodařilo se najít snímky v navod-ovladani.html");
  }
  const slides = JSON.parse(match[1]);
  fs.writeFileSync(file, buildPlayer(slides));
  console.log(`Updated stepper player (${slides.length} steps)`);
}
