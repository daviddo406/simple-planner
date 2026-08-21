import { dayKey, daysOfWeek, parseDayKey } from "./calendar";

/**
 * Computed built-in US holidays. There is no API and no network: the web has
 * no EventKit equivalent to enrich from, and a static ruleset is exact,
 * offline, instant, and fully unit-testable.
 */
export interface Holiday {
  name: string;
  /** `YYYY-MM-DD`, the same join key tasks use. */
  dayKey: string;
}

/** Month index (0-based) and day of month. */
type FixedRule = readonly [month: number, day: number, name: string];

/**
 * Month index, weekday (0 = Sunday), and which one — `-1` means the last of
 * the month, which is Memorial Day's rule and the one most likely to be coded
 * as "the fourth".
 */
type WeekdayRule = readonly [month: number, weekday: number, nth: number, name: string];

const FIXED: readonly FixedRule[] = [
  [0, 1, "New Year's Day"],
  [5, 19, "Juneteenth"],
  [6, 4, "Independence Day"],
  [10, 11, "Veterans Day"],
  [11, 25, "Christmas Day"],
];

const NTH_WEEKDAY: readonly WeekdayRule[] = [
  [0, 1, 3, "Martin Luther King Jr. Day"],
  [1, 1, 3, "Presidents' Day"],
  [4, 1, -1, "Memorial Day"],
  [8, 1, 1, "Labor Day"],
  [9, 1, 2, "Indigenous Peoples' Day"],
  [10, 4, 4, "Thanksgiving"],
];

// The ruleset is deterministic and the same two or three years get asked for
// on every render, so each year is computed once.
const byYear = new Map<number, Holiday[]>();

function nthWeekdayOf(year: number, month: number, weekday: number, nth: number): Date {
  if (nth === -1) {
    const lastDay = new Date(year, month + 1, 0);
    // Step back to the most recent occurrence of the target weekday.
    return new Date(year, month, lastDay.getDate() - ((lastDay.getDay() - weekday + 7) % 7));
  }
  const firstDay = new Date(year, month, 1);
  // 0 when the month already starts on the target weekday, which is Labor Day
  // in 2025 and the case a naive `+ 7` gets wrong.
  const offset = (weekday - firstDay.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
}

export function holidaysForYear(year: number): Holiday[] {
  const cached = byYear.get(year);
  if (cached) {
    return cached;
  }

  const holidays: Holiday[] = [
    ...FIXED.map(([month, day, name]) => ({
      name,
      dayKey: dayKey(new Date(year, month, day)),
    })),
    ...NTH_WEEKDAY.map(([month, weekday, nth, name]) => ({
      name,
      dayKey: dayKey(nthWeekdayOf(year, month, weekday, nth)),
    })),
  ].sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  byYear.set(year, holidays);
  return holidays;
}

/**
 * The week's holidays keyed the same way tasks are, so the week page does one
 * lookup per day and never compares dates at render time.
 */
export function holidaysByDayKey(weekKey: string): Record<string, string[]> {
  const days = daysOfWeek(parseDayKey(weekKey));
  const week: Record<string, string[]> = Object.fromEntries(days.map((date) => [dayKey(date), []]));

  // A week can straddle a year boundary, so both years' rulesets are consulted.
  const years = new Set(days.map((date) => date.getFullYear()));
  for (const year of years) {
    for (const holiday of holidaysForYear(year)) {
      week[holiday.dayKey]?.push(holiday.name);
    }
  }
  return week;
}
