import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("https://simulace.vividbooks.com/optika_geometrie/rysovani-app/", {
  waitUntil: "networkidle",
  timeout: 20000,
});
await page.waitForTimeout(4000);

const jsUrl = await page.evaluate(() => {
  return [...document.scripts].map((s) => s.src).filter(Boolean);
});

const info = await page.evaluate(() => {
  const root = document.getElementById("root");
  const header = root?.querySelector("div > div");
  return {
    pathname: location.pathname,
    firstChild: header?.firstElementChild?.tagName,
    firstChildText: header?.firstElementChild?.textContent?.slice(0, 50),
    childCount: header?.childElementCount,
    htmlSnippet: header?.innerHTML?.slice(0, 400),
  };
});

console.log("scripts:", jsUrl);
console.log("header:", JSON.stringify(info, null, 2));
console.log("errors:", errors);

await browser.close();
