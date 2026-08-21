/**
 * Settles the one question the pixel theme cannot answer by reasoning: which
 * font sizes are actually on each bitmap face's grid.
 *
 * Because font smoothing is off, an off-grid bitmap face does not go grey at
 * the edges — it stays hard-edged and goes lumpy, some stems rounding to one
 * pixel and some to two. So this rasterizes a string at each candidate size in
 * headless Chromium and measures the spread of horizontal ink run-lengths: a
 * low spread means every stem came out the same width.
 *
 * Each face's on-grid sizes all land on one identical figure — its baseline,
 * from genuine variation between glyphs — and off-grid sizes sit well above it.
 *
 *   npm run dev -- --port 3111
 *   node scripts/font-ladder-probe.mjs
 */
import { chromium } from "@playwright/test";
import { PNG } from "pngjs";

const URL = process.env.PROBE_URL ?? "http://127.0.0.1:3111/specimen";
const INK = [0x17, 0x16, 0x13];
const TOLERANCE = 40;

const isInk = (p) =>
  Math.abs(p[0] - INK[0]) <= TOLERANCE &&
  Math.abs(p[1] - INK[1]) <= TOLERANCE &&
  Math.abs(p[2] - INK[2]) <= TOLERANCE;

function stemWidths(buffer) {
  const png = PNG.sync.read(buffer);
  const counts = new Map();
  for (let y = 0; y < png.height; y++) {
    let run = 0;
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (isInk([png.data[i], png.data[i + 1], png.data[i + 2]])) {
        run++;
      } else {
        if (run) counts.set(run, (counts.get(run) ?? 0) + 1);
        run = 0;
      }
    }
    if (run) counts.set(run, (counts.get(run) ?? 0) + 1);
  }
  return counts;
}

/** Share of ink runs that are not the most common run width. */
function spread(counts) {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return total ? 1 - Math.max(...counts.values()) / total : 0;
}

const CASES = [
  ["Silkscreen", "--font-silkscreen", [8, 12, 16, 20, 24, 32]],
  ["DepartureMono", "--font-departure-mono", [11, 16, 20, 22, 24, 33]],
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

console.log("stem-width spread (lower = uniform stems = on the face's grid)");
for (const [label, cssVariable, sizes] of CASES) {
  const row = [];
  for (const size of sizes) {
    await page.evaluate(
      ({ cssVariable, size }) => {
        let el = document.getElementById("probe");
        if (!el) {
          el = document.createElement("div");
          el.id = "probe";
          document.body.prepend(el);
        }
        el.style.cssText =
          `font-family: var(${cssVariable}); font-size:${size}px; line-height:${size * 2}px;` +
          "color:#171613; background:#f2ede0; white-space:nowrap; padding:8px; width:max-content;" +
          "-webkit-font-smoothing:none;";
        el.textContent = "HInmuvwxyzABEFKLMPRT 0123456789";
      },
      { cssVariable, size },
    );
    const percent = (spread(stemWidths(await page.locator("#probe").screenshot())) * 100).toFixed(0);
    row.push(`${size}px:${percent.padStart(3)}%`);
  }
  console.log(" ", label.padEnd(14), row.join("  "));
}

await browser.close();
