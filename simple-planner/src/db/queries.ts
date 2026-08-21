import { asc, eq, inArray, sql } from "drizzle-orm";
import { dayKey as toDayKey, daysOfWeek, parseDayKey } from "@/lib/calendar";
import { getDb } from "./index";
import { type TaskRow, tasks } from "./schema";

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

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}
