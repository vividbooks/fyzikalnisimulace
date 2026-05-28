import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8765/optika_geometrie/rysovani-app/";
const errors = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(3000);

const rootLen = (await page.locator("#root").innerHTML()).length;
const titleCount = await page.locator("text=Geometrická optika").count();
const backCount = await page.locator("text=Přehled simulací").count();

console.log("url:", url);
console.log("root html length:", rootLen);
console.log("title count:", titleCount);
console.log("back link count:", backCount);
console.log("errors:", errors.length ? errors.join("\n") : "none");

await browser.close();
process.exit(errors.length || rootLen === 0 ? 1 : 0);
