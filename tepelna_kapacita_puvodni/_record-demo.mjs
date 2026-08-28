import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildPlayer } from "./_rebuild-player.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = "/tmp/tk-demo-out";
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:8765/tepelna_kapacita_puvodni/", {
  waitUntil: "domcontentloaded",
});
await page.waitForSelector(".supply-item");
await sleep(900);

await page.addStyleTag({
  content: `
    #demo-caption {
      position: fixed;
      top: 168px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      max-width: min(820px, calc(100% - 300px));
      margin: 0;
      padding: 12px 26px;
      border: 2px solid #cbd5e1;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
      color: #1e2533;
      font-family: "Fenomen Sans", ui-sans-serif, system-ui, sans-serif;
      font-size: 24px;
      font-weight: 400;
      line-height: 1.3;
      text-align: center;
      pointer-events: none;
    }
    .demo-hl {
      outline: 4px solid #7dd3fc !important;
      outline-offset: 8px;
      border-radius: 18px;
      box-shadow: 0 0 0 8px rgba(125, 211, 252, 0.28);
      background: rgba(56, 189, 248, 0.16);
    }
    .supply-strip { overflow: visible !important; }
    .sim-empty-hint { visibility: hidden !important; }
  `,
});

await page.evaluate(() => {
  window.__demoCaption = (text) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("p");
      el.id = "demo-caption";
      document.body.appendChild(el);
    }
    el.textContent = text;
  };
  window.__demoHighlight = (selector) => {
    document.querySelectorAll(".demo-hl").forEach((n) =>
      n.classList.remove("demo-hl")
    );
    if (!selector) return;
    const el = document.querySelector(selector);
    if (el) el.classList.add("demo-hl");
  };
  window.__demoPlaceOn = (typeKey, targetSel, offsetY = -170) => {
    const ws = document.querySelector("#scene-workspace");
    const target = document.querySelector(targetSel);
    const wr = ws.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    spawnVessel(
      typeKey,
      tr.left - wr.left + tr.width / 2 - 80,
      tr.top - wr.top + offsetY
    );
  };
});

const frames = [];

const beat = async (id, caption, highlight, holdMs, action) => {
  if (action) await action();
  await page.evaluate(
    ({ caption, highlight }) => {
      window.__demoCaption(caption);
      window.__demoHighlight(highlight);
    },
    { caption, highlight }
  );
  await sleep(holdMs);
  if (page.isClosed()) {
    throw new Error(`Page closed before screenshot ${id}`);
  }
  const file = path.join(outDir, `${id}.png`);
  await page.screenshot({ path: file });
  frames.push({
    id,
    caption,
    file,
    duration: 3.6,
  });
};

await beat("01", "Tepelná kapacita — přehled ovládání", null, 400);
await beat(
  "02",
  "Zásobník: kádinky a cihly přetáhneš na plochu",
  ".supply-items",
  500
);
await beat(
  "03",
  "Těleso se přichytí k hořáku",
  ".vessel-draggable",
  600,
  async () => {
    await page.evaluate(() => {
      window.__demoHighlight(null);
      window.__demoPlaceOn("water", "svg.burner, .burner", -175);
    });
    await sleep(400);
  }
);
await beat(
  "04",
  "Posuvníkem nastavíš hmotnost tělesa",
  ".vessel-stats",
  500,
  async () => {
    await page.evaluate(() => {
      const slider = document.querySelector(".vessel-mass-control__slider");
      if (!slider) return;
      slider.value = "500";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
);
await beat(
  "05",
  "Výkon hořáku nastavíš od 0 do 1000 W",
  ".power-control",
  500,
  async () => {
    await page.evaluate(() => {
      const slider = document.querySelector("#burner-power");
      if (!slider) return;
      slider.value = "800";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
);
await beat(
  "06",
  "Zapni hořák — teplota je nad tělesem",
  ".vessel-temp-badge",
  700,
  async () => {
    await page.evaluate(() => {
      document.querySelector("#burner-toggle")?.click();
    });
    await sleep(800);
  }
);
await beat(
  "07",
  "Můžeš zapnout jeden nebo dva hořáky",
  ".burner-count-control",
  500,
  async () => {
    await page.evaluate(() => {
      document
        .querySelector('.burner-count-btn[data-burner-count="2"]')
        ?.click();
    });
  }
);
await beat(
  "08",
  "Chladnutí: teplo uniká do vzduchu (20 °C)",
  ".cooling-control",
  500,
  async () => {
    await page.evaluate(() => {
      document.querySelector('.cooling-btn[data-cooling="on"]')?.click();
    });
  }
);
await beat(
  "09",
  "Prostředí Bazén: místo hořáku voda v nádrži",
  ".pool-count-control",
  500,
  async () => {
    await page.evaluate(() => {
      document
        .querySelector('.heat-source-btn[data-heat-source="pool"]')
        ?.click();
      document.querySelector('.pool-count-btn[data-pool-count="1"]')?.click();
    });
    await sleep(300);
  }
);
await beat(
  "10",
  "Cihla ve vodě předává teplo bazénu (3 kg vody)",
  ".pool-slot",
  700,
  async () => {
    await page.evaluate(() => {
      window.__demoPlaceOn("gold", "svg.pool, .pool", 40);
    });
    await sleep(500);
  }
);
await beat(
  "11",
  "Tlačítko Zpět vlevo nahoře otevře přehled simulací",
  ".hub-back-to-sims",
  500
);
await beat(
  "12",
  "To jsou hlavní ovládací prvky simulace.",
  null,
  400,
  async () => {
    await page.evaluate(() => window.__demoHighlight(null));
  }
);

await browser.close();

const slides = frames.map((frame) => {
  const data = fs.readFileSync(frame.file).toString("base64");
  return {
    caption: frame.caption,
    duration: frame.duration,
    src: `data:image/png;base64,${data}`,
  };
});

const htmlPath = path.join(root, "navod-ovladani.html");
fs.writeFileSync(htmlPath, buildPlayer(slides));
console.log(`Wrote ${htmlPath} (${slides.length} slides)`);
