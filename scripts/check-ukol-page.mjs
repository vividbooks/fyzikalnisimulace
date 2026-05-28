import { chromium } from "playwright";

const url =
  process.argv[2] ||
  "http://127.0.0.1:8765/optika_geometrie/rysovani-app/ukol/3c63b914-2066-40e6-8ccf-49c9d94e2ab5";
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}\n${e.stack?.slice(0, 500)}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(5000);

const crashed = await page.locator("text=Aplikace spadla").count();
const zadani = await page.locator("text=Spojka 1").count();
const editor = await page.locator("text=Načítám rýsovací editor").count();

console.log("url:", url);
console.log("crash banner:", crashed);
console.log("zadání visible:", zadani);
console.log("editor loading:", editor);
console.log("errors:", errors.length ? errors.join("\n---\n") : "none");

await browser.close();
process.exit(crashed || errors.length ? 1 : 0);
