import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto("http://localhost:3901/map", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(7000);
await page.screenshot({ path: "/tmp/panel.png" });
await browser.close();
