// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { contrast } from "./contrast";
import { DEFAULT_SLIME_ID, SLIMES, SLIME_IDS, isSlimeId } from "./slimes";

describe("the twelve slimes", () => {
  test("there are twelve, with unique ids", () => {
    expect(SLIME_IDS).toHaveLength(12);
    expect(new Set(SLIME_IDS).size).toBe(12);
  });

  test("every variant defines all four tones", () => {
    for (const id of SLIME_IDS) {
      const slime = SLIMES[id];
      expect(slime.base, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(slime.highlight, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(slime.shade, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(slime.night, id).toMatch(/^#[0-9a-f]{6}$/);
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

/**
 * The night accent is the same job on the other ground. It is read out of the
 * stylesheet rather than pasted here, so darkening night paper by a step can
 * never quietly drop a slime below the line without this failing.
 */
const NIGHT_PAPER = /--night-paper:\s*(#[0-9a-fA-F]{6})/.exec(
  readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8"),
)![1];

describe("the accent, as text on night paper", () => {
  test("every night tone clears 4.5:1", () => {
    for (const id of SLIME_IDS) {
      expect(contrast(SLIMES[id].night, NIGHT_PAPER), id).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("no slime uses one tone for both grounds", () => {
    // A shade dark enough to read on paper is, by construction, too dark to
    // read on night paper. If the two are ever equal, one of them is wrong.
    for (const id of SLIME_IDS) {
      expect(SLIMES[id].night, id).not.toBe(SLIMES[id].shade);
    }
  });
});
