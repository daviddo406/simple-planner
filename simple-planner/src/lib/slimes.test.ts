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
