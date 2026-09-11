/**
 * Print every loot page to its PDF, from the live template, so the web page
 * and the download always match (loot pages spec, Section 4).
 *
 *   bun scripts/loot-pdf.ts [baseUrl] [id ...]
 *
 * Needs the site running (default http://localhost:3000) and a Chromium at
 * CHROMIUM_PATH (default /opt/pw-browsers/chromium). Output goes to
 * public/loot/<id>.pdf and is committed alongside the content.
 */
import { chromium } from "playwright-core";
import { LOOT_PAGES } from "../src/lib/lootPages";

const base = process.argv[2] ?? "http://localhost:3000";
const only = process.argv.slice(3);
const ids = only.length ? only : LOOT_PAGES.map((p) => p.id);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", headless: true });
const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
await page.emulateMedia({ media: "print" });
for (const id of ids) {
  const content = LOOT_PAGES.find((p) => p.id === id);
  if (!content) {
    console.error("unknown loot page:", id);
    continue;
  }
  await page.goto(`${base}/loot/${id}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[role=img][aria-label^='QR code'] svg", { timeout: 10_000 }).catch(() => console.warn(id, "QR code did not render"));
  await page.evaluate(() => document.fonts.ready);
  const out = `public/loot/${id}.pdf`;
  await page.pdf({ path: out, format: "Letter", printBackground: true, preferCSSPageSize: true });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const pages = Math.ceil(height / 1056);
  console.log(`${out}: about ${pages} page(s)${pages > content.pageLimit ? `  ⚠ over the limit of ${content.pageLimit}` : ""}`);
}
await browser.close();
