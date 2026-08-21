// The single place in the codebase that knows a week starts on Monday, and the
// single place allowed to import `date-fns` — enforced by the
// `no-restricted-imports` rule in eslint.config.mjs. This is the web analogue
// of the iOS app's one `firstWeekday` constant: the mini calendar and the week
// page both derive from here, so they cannot disagree.
import { startOfWeek } from "date-fns";

/** Monday. `date-fns` numbers weekdays from Sunday = 0. */
const WEEK_STARTS_ON = 1 as const;

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Midday on the same civil date. Day arithmetic is done from here so a DST
 * transition — which in some zones deletes midnight itself — cannot round a
 * step into the neighbouring day.
 */
function atNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const anchor = atNoon(date);
  anchor.setDate(anchor.getDate() + amount);
  return atMidnight(anchor);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Column headers for the mini calendar, Monday through Sunday. */
export function weekdayHeaders(): string[] {
  return ["M", "T", "W", "T", "F", "S", "S"];
}

/** Midnight on the Monday of the week containing `date`. */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

/** The seven days of `date`'s week, Monday first. */
export function daysOfWeek(date: Date): Date[] {
  const monday = startOfWeekMonday(date);
  return Array.from({ length: 7 }, (_, offset) => addDays(monday, offset));
}

/**
 * `date`'s month laid out as rows of seven, Monday first. Padding cells are
 * `null` rather than adjacent-month dates, so the grid renderer never has to
 * decide whether a cell is "in" the month.
 */
export function monthGrid(date: Date): (Date | null)[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Day 0 of the next month is the last day of this one.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() counts from Sunday; shift so Monday is column 0.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (Date | null)[] = Array<Date | null>(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (Date | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) {
    rows.push(cells.slice(start, start + 7));
  }
  return rows;
}

/**
 * The join key between a date and the rows stored against it: a `YYYY-MM-DD`
 * civil date with no time zone attached. Built from the local calendar fields
 * and never from `toISOString()`, which converts to UTC first and is off by a
 * day for anyone far enough east or west of it.
 */
export function dayKey(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/**
 * The inverse of {@link dayKey}. Builds the date from its parts rather than
 * handing the string to `new Date()`, which the spec parses as UTC midnight.
 */
export function parseDayKey(key: string): Date {
  if (!DAY_KEY_PATTERN.test(key)) {
    throw new Error(`Not a day key: ${JSON.stringify(key)}`);
  }
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects real-looking keys for days that do not exist, such as 2026-02-30,
  // which would otherwise silently roll forward into March.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Not a calendar date: ${key}`);
  }
  return date;
}

/** `JUL 2026` — the mini calendar's header. */
export function monthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * The week page header. Repeats only what changes across the range: the month
 * when the week crosses one, the year when it crosses that.
 */
export function formatWeekRange(date: Date): string {
  const days = daysOfWeek(date);
  const first = days[0];
  const last = days[6];

  const startMonth = MONTH_NAMES[first.getMonth()];
  const endMonth = MONTH_NAMES[last.getMonth()];

  if (first.getFullYear() !== last.getFullYear()) {
    return `${startMonth} ${first.getDate()}, ${first.getFullYear()} – ${endMonth} ${last.getDate()}, ${last.getFullYear()}`;
  }
  if (first.getMonth() !== last.getMonth()) {
    return `${startMonth} ${first.getDate()} – ${endMonth} ${last.getDate()}, ${last.getFullYear()}`;
  }
  return `${startMonth} ${first.getDate()} – ${last.getDate()}, ${last.getFullYear()}`;
}

/**
 * The first of the month `delta` months away. Anchoring on the 1st is what
 * keeps paging off the 31st from skipping the short month in between.
 */
export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/**
 * Whether `key` is a real `YYYY-MM-DD` calendar date. Unlike
 * {@link parseDayKey} this never throws, because it guards a value that
 * arrives in the URL, where junk is routine rather than exceptional.
 */
export function isDayKey(key: string): boolean {
  try {
    parseDayKey(key);
    return true;
  } catch {
    return false;
  }
}

/** `SAT` — the day section's heading, in the display face. */
export function weekdayAbbreviation(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()].slice(0, 3).toUpperCase();
}

/**
 * `Saturday 4 July` — the accessible name of a day section. The visible
 * heading is split across an abbreviation and a bare number for the layout, so
 * this is what a screen reader gets instead.
 */
export function formatDayLabel(date: Date): string {
  return `${WEEKDAY_NAMES[date.getDay()]} ${date.getDate()} ${FULL_MONTH_NAMES[date.getMonth()]}`;
}
