// @vitest-environment node
// Node rather than the jsdom default: this module is pure date math, and the
// time-zone cases below need `process.env.TZ` reassignment to take effect.
import { afterAll, describe, expect, test } from "vitest";
import {
  dayKey,
  formatDayLabel,
  isDayKey,
  daysOfWeek,
  formatWeekRange,
  monthGrid,
  monthLabel,
  parseDayKey,
  shiftMonth,
  startOfWeekMonday,
  weekdayAbbreviation,
  weekdayHeaders,
} from "./calendar";

const REFERENCE_MONDAY = "2026-06-29";
const REFERENCE_SUNDAY = "2026-07-05";

describe("weekdayHeaders", () => {
  test("starts on Monday and ends on Sunday", () => {
    expect(weekdayHeaders()).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });
});

describe("startOfWeekMonday", () => {
  test("returns the same Monday for every day in the reference week", () => {
    for (let day = 29; day <= 30; day++) {
      expect(dayKey(startOfWeekMonday(new Date(2026, 5, day)))).toBe(REFERENCE_MONDAY);
    }
    for (let day = 1; day <= 5; day++) {
      expect(dayKey(startOfWeekMonday(new Date(2026, 6, day)))).toBe(REFERENCE_MONDAY);
    }
  });

  test("a Sunday belongs to the week that started six days earlier", () => {
    // The off-by-one this whole module exists to prevent: with a Sunday-first
    // calendar, Sunday 2026-07-05 would open its own week.
    const sunday = new Date(2026, 6, 5);
    expect(sunday.getDay()).toBe(0);
    expect(dayKey(startOfWeekMonday(sunday))).toBe(REFERENCE_MONDAY);
  });

  test("returns midnight, not the input's time of day", () => {
    const result = startOfWeekMonday(new Date(2026, 6, 2, 23, 47, 13, 500));
    expect([result.getHours(), result.getMinutes(), result.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe("daysOfWeek", () => {
  test("returns seven consecutive days starting Monday", () => {
    const keys = daysOfWeek(new Date(2026, 6, 2)).map(dayKey);
    expect(keys).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
  });

  test("still starts Monday when handed a Sunday", () => {
    const keys = daysOfWeek(new Date(2026, 6, 5)).map(dayKey);
    expect(keys[0]).toBe(REFERENCE_MONDAY);
    expect(keys[6]).toBe(REFERENCE_SUNDAY);
  });

  test("spans a month boundary", () => {
    const keys = daysOfWeek(new Date(2026, 6, 1)).map(dayKey);
    expect(keys[0]).toBe("2026-06-29");
    expect(keys[6]).toBe("2026-07-05");
  });

  test("spans a year boundary", () => {
    const keys = daysOfWeek(new Date(2026, 11, 31)).map(dayKey);
    expect(keys[0]).toBe("2026-12-28");
    expect(keys[6]).toBe("2027-01-03");
  });

  test.each([
    ["spring forward", new Date(2026, 2, 8)],
    ["fall back", new Date(2026, 10, 1)],
  ])("a US %s week still yields seven distinct days", (_label, date) => {
    const keys = daysOfWeek(date).map(dayKey);
    expect(keys).toHaveLength(7);
    expect(new Set(keys).size).toBe(7);
  });
});

describe("monthGrid", () => {
  test("puts 1 July 2026 in the Wednesday column", () => {
    const grid = monthGrid(new Date(2026, 6, 15));
    expect(grid[0].map((cell) => (cell ? cell.getDate() : null))).toEqual([
      null,
      null,
      1,
      2,
      3,
      4,
      5,
    ]);
    expect(weekdayHeaders()[2]).toBe("W");
  });

  test("pads the trailing row with nulls", () => {
    const grid = monthGrid(new Date(2026, 6, 15));
    const last = grid[grid.length - 1];
    expect(last.map((cell) => (cell ? cell.getDate() : null))).toEqual([
      27,
      28,
      29,
      30,
      31,
      null,
      null,
    ]);
  });

  test("contains every day of the month exactly once and nothing else", () => {
    const grid = monthGrid(new Date(2026, 6, 15));
    const dates = grid.flat().filter((cell): cell is Date => cell !== null);
    expect(dates.map((d) => d.getDate())).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(dates.every((d) => d.getMonth() === 6)).toBe(true);
  });

  test("every row has seven cells", () => {
    for (const month of [0, 1, 6, 11]) {
      for (const row of monthGrid(new Date(2026, month, 1))) {
        expect(row).toHaveLength(7);
      }
    }
  });

  test("a month starting on Monday has no leading padding", () => {
    // 2026-06-01 is a Monday.
    const grid = monthGrid(new Date(2026, 5, 1));
    expect(grid[0][0]?.getDate()).toBe(1);
  });

  test("handles February in a leap year", () => {
    const dates = monthGrid(new Date(2028, 1, 10))
      .flat()
      .filter((cell): cell is Date => cell !== null);
    expect(dates).toHaveLength(29);
  });
});

describe("dayKey", () => {
  test("formats as YYYY-MM-DD with zero padding", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  test("round-trips through parseDayKey for a year of dates", () => {
    let date = new Date(2026, 0, 1);
    for (let i = 0; i < 365; i++) {
      const key = dayKey(date);
      expect(dayKey(parseDayKey(key))).toBe(key);
      date = new Date(2026, 0, 1 + i + 1);
    }
  });
});

describe("parseDayKey", () => {
  test("reads the key as a local civil date, not UTC midnight", () => {
    const date = parseDayKey("2026-07-04");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 6, 4]);
  });

  test("rejects a malformed key", () => {
    for (const bad of ["2026-7-4", "not-a-date", "2026-07-04T00:00:00Z", ""]) {
      expect(() => parseDayKey(bad)).toThrow();
    }
  });
});

describe("time zone stability", () => {
  const original = process.env.TZ;
  afterAll(() => {
    process.env.TZ = original;
  });

  // The test that catches a stray `toISOString().slice(0, 10)`, which converts
  // to UTC first and lands on the wrong day for half the world.
  test.each(["Pacific/Kiritimati", "America/Los_Angeles", "UTC"])(
    "produces identical output in %s",
    (zone) => {
      process.env.TZ = zone;
      expect(dayKey(new Date(2026, 6, 4))).toBe("2026-07-04");
      expect(dayKey(startOfWeekMonday(new Date(2026, 6, 5)))).toBe(REFERENCE_MONDAY);
      expect(daysOfWeek(new Date(2026, 6, 2)).map(dayKey)).toEqual([
        "2026-06-29",
        "2026-06-30",
        "2026-07-01",
        "2026-07-02",
        "2026-07-03",
        "2026-07-04",
        "2026-07-05",
      ]);
      expect(dayKey(parseDayKey("2026-01-01"))).toBe("2026-01-01");
    },
  );
});

describe("formatWeekRange", () => {
  test("names both months when the week crosses one", () => {
    expect(formatWeekRange(new Date(2026, 6, 2))).toBe("JUN 29 – JUL 5, 2026");
  });

  test("names the month once when the week sits inside it", () => {
    expect(formatWeekRange(new Date(2026, 6, 8))).toBe("JUL 6 – 12, 2026");
  });

  test("names both years when the week crosses one", () => {
    expect(formatWeekRange(new Date(2026, 11, 31))).toBe("DEC 28, 2026 – JAN 3, 2027");
  });
});

describe("monthLabel", () => {
  test("is an uppercase abbreviated month and full year", () => {
    expect(monthLabel(new Date(2026, 6, 15))).toBe("JUL 2026");
  });
});

describe("shiftMonth", () => {
  test("moves to the first of the adjacent month", () => {
    expect(dayKey(shiftMonth(new Date(2026, 6, 15), 1))).toBe("2026-08-01");
    expect(dayKey(shiftMonth(new Date(2026, 6, 15), -1))).toBe("2026-06-01");
  });

  test("crosses a year boundary in both directions", () => {
    expect(dayKey(shiftMonth(new Date(2026, 11, 15), 1))).toBe("2027-01-01");
    expect(dayKey(shiftMonth(new Date(2026, 0, 15), -1))).toBe("2025-12-01");
  });

  test("does not roll over from a long month into the wrong one", () => {
    // Naive `setMonth` on the 31st of March lands in May, not April.
    expect(dayKey(shiftMonth(new Date(2026, 2, 31), 1))).toBe("2026-04-01");
  });
});

describe("isDayKey", () => {
  test("accepts a real calendar date", () => {
    expect(isDayKey("2026-07-04")).toBe(true);
  });

  test.each(["2026-7-4", "not-a-date", "2026-07-04T00:00:00Z", "", "2026-02-30"])(
    "rejects %j",
    (bad) => {
      // Guards a value that arrives in the URL, so it must not throw on junk.
      expect(isDayKey(bad)).toBe(false);
    },
  );
});

describe("weekdayAbbreviation", () => {
  test("is the uppercase three-letter weekday", () => {
    expect(weekdayAbbreviation(new Date(2026, 6, 4))).toBe("SAT");
    expect(weekdayAbbreviation(new Date(2026, 5, 29))).toBe("MON");
  });
});

describe("formatDayLabel", () => {
  test("names the weekday, date, and month for a screen reader", () => {
    expect(formatDayLabel(new Date(2026, 6, 4))).toBe("Saturday 4 July");
    expect(formatDayLabel(new Date(2026, 5, 29))).toBe("Monday 29 June");
  });
});
