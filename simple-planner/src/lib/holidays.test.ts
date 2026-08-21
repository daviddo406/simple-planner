// @vitest-environment node
import { describe, expect, test } from "vitest";
import { holidaysByDayKey, holidaysForYear } from "./holidays";

function dateOf(year: number, name: string): string | undefined {
  return holidaysForYear(year).find((holiday) => holiday.name === name)?.dayKey;
}

describe("fixed-date holidays", () => {
  test.each([
    ["New Year's Day", "2026-01-01"],
    ["Juneteenth", "2026-06-19"],
    ["Independence Day", "2026-07-04"],
    ["Veterans Day", "2026-11-11"],
    ["Christmas Day", "2026-12-25"],
  ])("%s 2026 falls on %s", (name, expected) => {
    expect(dateOf(2026, name)).toBe(expected);
  });

  test("prints Independence Day on the 4th even when it is a Saturday", () => {
    // Observed dates are deliberately not computed: a paper planner prints the
    // holiday on its date, and the Friday it is federally observed in 2026 is
    // not the holiday.
    expect(dateOf(2026, "Independence Day")).toBe("2026-07-04");
    expect(new Date(2026, 6, 4).getDay()).toBe(6);
    expect(dateOf(2026, "Independence Day")).not.toBe("2026-07-03");
  });
});

describe("nth-weekday holidays", () => {
  test.each([
    ["Martin Luther King Jr. Day", 2026, "2026-01-19"],
    ["Martin Luther King Jr. Day", 2027, "2027-01-18"],
    ["Presidents' Day", 2026, "2026-02-16"],
    ["Labor Day", 2026, "2026-09-07"],
    ["Indigenous Peoples' Day", 2026, "2026-10-12"],
    ["Thanksgiving", 2026, "2026-11-26"],
  ])("%s %i falls on %s", (name, year, expected) => {
    expect(dateOf(year, name)).toBe(expected);
  });

  test("Memorial Day is the last Monday in May, not the fourth", () => {
    // 2026 cannot tell the two rules apart — May has four Mondays and the last
    // is the fourth. 2027 has five, and is the case that catches the bug.
    expect(dateOf(2026, "Memorial Day")).toBe("2026-05-25");
    expect(dateOf(2027, "Memorial Day")).toBe("2027-05-31");
  });

  test("counts from the 1st when the month starts on the target weekday", () => {
    // 1 September 2025 is itself a Monday, so Labor Day is the 1st.
    expect(dateOf(2025, "Labor Day")).toBe("2025-09-01");
  });

  test("is unaffected by a leap year's extra February day", () => {
    expect(dateOf(2028, "Presidents' Day")).toBe("2028-02-21");
    expect(dateOf(2028, "Memorial Day")).toBe("2028-05-29");
  });
});

describe("holidaysForYear", () => {
  test("returns all eleven, in date order", () => {
    const holidays = holidaysForYear(2026);
    expect(holidays).toHaveLength(11);
    expect(holidays.map((h) => h.dayKey)).toEqual([...holidays.map((h) => h.dayKey)].sort());
  });

  test("returns the same memoized result for a repeated year", () => {
    expect(holidaysForYear(2026)).toBe(holidaysForYear(2026));
  });
});

describe("holidaysByDayKey", () => {
  test("covers all seven days of the week", () => {
    expect(Object.keys(holidaysByDayKey("2026-06-29")).sort()).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
  });

  test("prints the holiday on its own day", () => {
    expect(holidaysByDayKey("2026-06-29")["2026-07-04"]).toEqual(["Independence Day"]);
  });

  test("returns an empty array, not undefined, for a day with no holiday", () => {
    expect(holidaysByDayKey("2026-06-29")["2026-07-02"]).toEqual([]);
  });

  test("covers a week that straddles a year boundary", () => {
    // Mon 28 Dec 2026 – Sun 3 Jan 2027 needs both years' rulesets.
    const week = holidaysByDayKey("2026-12-28");
    expect(week["2027-01-01"]).toEqual(["New Year's Day"]);
  });
});
