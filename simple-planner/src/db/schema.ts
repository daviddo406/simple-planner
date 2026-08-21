import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Portable Postgres only — no vendor extensions, nothing a stock Postgres
 * would reject. The same migrations run against Neon in production and PGlite
 * in the test and E2E suites, which is what keeps the provider swappable.
 *
 * There is no `userId` column. The app is single-user by decision; every row
 * belongs to the one implicit user.
 */
export const tasks = pgTable(
  "tasks",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: text().notNull(),
    // A `YYYY-MM-DD` civil date, not a timestamp. A timestamp normalized on the
    // server drifts by up to a day when the server's zone differs from the
    // browser's, and the same row would land under a different heading in
    // different places.
    dayKey: text("day_key").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tasks_day_key_idx").on(table.dayKey)],
);

export type TaskRow = typeof tasks.$inferSelect;
