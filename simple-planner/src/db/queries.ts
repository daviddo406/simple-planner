import { asc, eq, inArray, sql } from "drizzle-orm";
import { dayKey as toDayKey, daysOfWeek, parseDayKey } from "@/lib/calendar";
import { DEFAULT_SLIME_ID, type SlimeId, isSlimeId } from "@/lib/slimes";
import { DEFAULT_THEME, type ThemeChoice, isThemeChoice } from "@/lib/theme";
import { getDb } from "./index";
import { settings, type TaskRow, tasks } from "./schema";

/**
 * The only module that imports Drizzle. Server Actions and components call the
 * named functions below; they do not know a query language exists, which is
 * what makes swapping Postgres for something else a rewrite of this one file
 * rather than a rewrite of every caller.
 */
export type Task = TaskRow;

function validDayKey(key: string): string {
  // `parseDayKey` throws on anything that is not a real `YYYY-MM-DD` calendar
  // date. This value arrives from the client and reaches a query, so it is
  // checked here rather than trusted.
  parseDayKey(key);
  return key;
}

/**
 * Every task in `weekKey`'s week, grouped by day, with an entry for all seven
 * days whether or not they have tasks.
 *
 * One query for the whole week, not one per day: the week page is a Server
 * Component that renders all seven days at once, so seven round-trips would be
 * seven times the work for the same result.
 */
export async function tasksForWeek(weekKey: string): Promise<Record<string, Task[]>> {
  const keys = daysOfWeek(parseDayKey(weekKey)).map(toDayKey);
  const db = await getDb();

  const rows = await db
    .select()
    .from(tasks)
    .where(inArray(tasks.dayKey, keys))
    // `createdAt` alone can tie when two inserts land in the same instant; `id`
    // breaks it so the order a user typed tasks in is the order they read back.
    .orderBy(asc(tasks.createdAt), asc(tasks.id));

  const week: Record<string, Task[]> = Object.fromEntries(keys.map((key) => [key, []]));
  for (const row of rows) {
    week[row.dayKey].push(row);
  }
  return week;
}

export async function addTask(dayKey: string, title: string): Promise<Task> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("A task needs a title.");
  }
  const db = await getDb();
  const [row] = await db
    .insert(tasks)
    .values({ dayKey: validDayKey(dayKey), title: trimmed })
    .returning();
  return row;
}

/**
 * Flips completion in a single statement, so it needs no interactive
 * transaction and cannot race a concurrent read-then-write. A missing id
 * updates nothing, which is a no-op rather than an error.
 */
export async function toggleTask(id: number): Promise<void> {
  const db = await getDb();
  await db
    .update(tasks)
    .set({ isCompleted: sql`not ${tasks.isCompleted}` })
    .where(eq(tasks.id, id));
}

/**
 * Renames in a single statement, like `toggleTask`. The title is trimmed and
 * validated here rather than trusted, because it arrives from the client; a
 * missing id updates nothing, which is a no-op rather than an error.
 */
export async function renameTask(id: number, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("A task needs a title.");
  }
  const db = await getDb();
  await db.update(tasks).set({ title: trimmed }).where(eq(tasks.id, id));
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}

const SLIME_KEY = "slime";

/**
 * The chosen slime, or the default when unset — never `null`, so no caller has
 * to branch on "not picked yet".
 *
 * The preference lives here rather than in `localStorage`, which is readable
 * only after mount and would force the week header to be a Client Component,
 * reintroducing exactly the hydration mismatch the URL-param design was built
 * to avoid. Not a cookie either: a cookie is per-browser, so clearing site
 * data would lose the slime while the tasks survived.
 */
export async function getSlime(): Promise<SlimeId> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, SLIME_KEY)).limit(1);
  return isSlimeId(row?.value) ? row.value : DEFAULT_SLIME_ID;
}

/** Upserted in a single statement, so it needs no interactive transaction. */
export async function setSlime(id: string): Promise<void> {
  if (!isSlimeId(id)) {
    throw new Error(`Not a slime: ${JSON.stringify(id)}`);
  }
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: SLIME_KEY, value: id })
    .onConflictDoUpdate({ target: settings.key, set: { value: id } });
}

const THEME_KEY = "theme";

/**
 * The stored theme choice, or "system" when unset — the same never-null
 * contract as the slime, and stored the same way and for the same reasons: a
 * cookie is per-browser and would be lost with site data while the tasks
 * survived, and `localStorage` is unreadable until after mount, which would
 * force `<html>` to be written on the client and put the flash of the wrong
 * theme back in.
 */
export async function getTheme(): Promise<ThemeChoice> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, THEME_KEY)).limit(1);
  return isThemeChoice(row?.value) ? row.value : DEFAULT_THEME;
}

/** Upserted in a single statement, keyed on `key`, so it cannot take the slime's row. */
export async function setTheme(choice: string): Promise<void> {
  if (!isThemeChoice(choice)) {
    throw new Error(`Not a theme: ${JSON.stringify(choice)}`);
  }
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: THEME_KEY, value: choice })
    .onConflictDoUpdate({ target: settings.key, set: { value: choice } });
}
