// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { contrast } from "./contrast";
import { DEFAULT_THEME, THEME_CHOICES, isThemeChoice } from "./theme";

/**
 * The palette is CSS, so this suite reads the CSS rather than a copy of it in
 * TypeScript. Both ramps are declared as flat hex custom properties in one
 * place each — the day ramp as `--color-*` inside `@theme`, the night ramp as
 * `--night-*` — which is what makes a regex an honest parser here instead of a
 * guess: neither ramp's values are ever written twice.
 */
const CSS = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");

function ramp(prefix: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, hex] of CSS.matchAll(
    new RegExp(`--${prefix}-([a-z-]+):\\s*(#[0-9a-fA-F]{6})`, "g"),
  )) {
    found[name] = hex.toLowerCase();
  }
  return found;
}

/**
 * The same budget the day ramp was built to, restated for the night one. A
 * dark theme is where a palette most often slips: light-on-dark *looks*
 * legible at any weight, so a mid-grey that would be obviously wrong on paper
 * passes the eye and fails the ratio.
 */
const BUDGET: Record<string, number> = {
  ink: 15,
  "ink-soft": 8,
  "ink-faint": 4.5,
  "ink-ghost": 3,
};

describe.each([
  ["day", "color"],
  ["night", "night"],
])("the %s ramp", (_label, prefix) => {
  const tones = ramp(prefix);

  test("defines a paper and all four ink tones", () => {
    expect(Object.keys(tones)).toEqual(expect.arrayContaining(["paper", ...Object.keys(BUDGET)]));
  });

  test.each(Object.entries(BUDGET))("%s clears %s:1 against its own paper", (tone, floor) => {
    expect(contrast(tones[tone], tones.paper)).toBeGreaterThanOrEqual(floor);
  });

  test("cloud is a half-step off paper, not a surface", () => {
    // The backdrop's one tone. Any real contrast and it reads as a panel with
    // something in it rather than as sky.
    expect(contrast(tones.cloud, tones.paper)).toBeLessThan(1.5);
  });
});

describe("the night ramp's wiring", () => {
  const nightTokens = Object.keys(ramp("night"));

  test("every night tone has a day tone of the same name", () => {
    expect(Object.keys(ramp("color"))).toEqual(expect.arrayContaining(nightTokens));
  });

  test.each(nightTokens)("--color-%s is remapped in both dark blocks", (tone) => {
    // Two, and exactly two: the media query for a dark OS that has not been
    // overridden, and the explicit `data-theme="dark"` attribute. Miss either
    // and the theme is half-applied in a way no unit test would otherwise see.
    const remaps = CSS.match(new RegExp(`--color-${tone}:\\s*var\\(--night-${tone}\\)`, "g"));
    expect(remaps).toHaveLength(2);
  });
});

test("the contrast helper agrees with a known pair", () => {
  // Guards the guard: ink on paper is documented at 15.48:1.
  expect(contrast("#171613", "#f2ede0")).toBeCloseTo(15.48, 1);
});

/**
 * The accent is the one token the server cannot resolve. On "system" the
 * stored preference says nothing about which ramp the browser will use, so
 * `page.tsx` publishes *both* of the chosen slime's accents as `--accent-day`
 * and `--accent-night`, and the choice between them is made here, in CSS,
 * alongside every other ramp decision.
 */
describe("the accent's two tones", () => {
  test("--color-accent reads the day tone by default", () => {
    expect(CSS).toMatch(/--color-accent:\s*var\(--accent-day\)/);
  });

  test("--color-accent is remapped to the night tone in both dark blocks", () => {
    expect(CSS.match(/--color-accent:\s*var\(--accent-night\)/g)).toHaveLength(2);
  });

  test("both accent tones have a fallback for a page that publishes neither", () => {
    // `/specimen` and any future route render without the week page's inline
    // style, and an unresolved var() would paint the accent transparent.
    expect(CSS).toMatch(/--accent-day:\s*#[0-9a-fA-F]{6}/);
    expect(CSS).toMatch(/--accent-night:\s*#[0-9a-fA-F]{6}/);
  });
});

describe("the stored choice", () => {
  test("is one of three, and defaults to following the OS", () => {
    expect(THEME_CHOICES).toEqual(["system", "light", "dark"]);
    expect(DEFAULT_THEME).toBe("system");
  });

  test("accepts every real choice", () => {
    for (const choice of THEME_CHOICES) {
      expect(isThemeChoice(choice)).toBe(true);
    }
  });

  test.each(["", "DARK", "night", "constructor", "__proto__", "dark "])("rejects %j", (bad) => {
    // Same guard as the slime id: this value arrives from the client and is
    // written to the database, so prototype keys have to be rejected too.
    expect(isThemeChoice(bad)).toBe(false);
  });
});

describe("night-only scenery", () => {
  test("is hidden by default", () => {
    expect(CSS).toMatch(/\.night-only\s*\{[^}]*display:\s*none/);
  });

  test("is shown in both dark blocks", () => {
    // Same two ways in as the ramp itself. Shown in only one of them and the
    // stars appear for a stored Dark but not for a dark OS, or the reverse.
    expect(CSS.match(/\.night-only\s*\{[^}]*display:\s*block/g)).toHaveLength(2);
  });
});
