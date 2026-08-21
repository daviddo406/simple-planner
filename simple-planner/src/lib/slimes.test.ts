// @vitest-environment node
import { describe, expect, test } from "vitest";
import { DEFAULT_SLIME_ID, SLIMES, SLIME_IDS, isSlimeId } from "./slimes";

describe("the twelve slimes", () => {
  test("there are twelve, with unique ids", () => {
    expect(SLIME_IDS).toHaveLength(12);
    expect(new Set(SLIME_IDS).size).toBe(12);
  });

  test("every variant defines all three fill tokens", () => {
    for (const id of SLIME_IDS) {
      const slime = SLIMES[id];
      expect(slime.base, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(slime.highlight, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(slime.shade, id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test("the default is teal, which clears 3:1 on paper unpicked", () => {
    expect(DEFAULT_SLIME_ID).toBe("teal");
    expect(SLIME_IDS).toContain(DEFAULT_SLIME_ID);
  });
});

describe("isSlimeId", () => {
  test("accepts every real id", () => {
    for (const id of SLIME_IDS) {
      expect(isSlimeId(id)).toBe(true);
    }
  });

  test.each(["", "TEAL", "chartreuse", "constructor", "__proto__", "teal "])(
    "rejects %j",
    (bad) => {
      // Guards a value that arrives from the client and is written to the
      // database, so prototype keys have to be rejected too.
      expect(isSlimeId(bad)).toBe(false);
    },
  );
});

/**
 * The shade is the app's accent, and the accent is text: the month name, the
 * weekday letters, the week range, each day's weekday. So the bar is 4.5:1
 * against paper — the body-text threshold — not the 3:1 that a rule or a
 * square would need. Recomputed here rather than asserted from a table,
 * because the whole point is that a thirteenth slime cannot be added below
 * the line by someone who trusted a comment.
 */
const PAPER = "#f2ede0";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

describe("the accent, as text on paper", () => {
  test("every shade clears 4.5:1", () => {
    for (const id of SLIME_IDS) {
      expect(contrast(SLIMES[id].shade, PAPER), id).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the formula agrees with a known pair", () => {
    // Guards the guard: ink on paper is documented at 15.48:1.
    expect(contrast("#171613", PAPER)).toBeCloseTo(15.48, 1);
  });
});
