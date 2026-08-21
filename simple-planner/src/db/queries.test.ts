// @vitest-environment node
// PGlite is Postgres compiled to WASM, run in-process: no Docker, no network,
// no test database to provision — and because it is genuinely Postgres, the
// migrations exercised here are the ones that will run in production, which an
// SQLite stand-in could never guarantee.
import { beforeEach, describe, expect, test } from "vitest";
import { resetDb } from "./index";
import { addTask, deleteTask, tasksForWeek, toggleTask } from "./queries";

const MONDAY = "2026-06-29";
const WEEK = [
  "2026-06-29",
  "2026-06-30",
  "2026-07-01",
  "2026-07-02",
  "2026-07-03",
  "2026-07-04",
  "2026-07-05",
];

beforeEach(async () => {
  process.env.DB_DRIVER = "pglite";
  process.env.DATABASE_URL = "memory://";
  delete process.env.PGLITE_DATA_DIR;
  await resetDb();
});

describe("tasksForWeek", () => {
  test("returns an entry for all seven days of the week", async () => {
    expect(Object.keys(await tasksForWeek(MONDAY)).sort()).toEqual(WEEK);
  });

  test("returns an empty array, not undefined, for a day with no tasks", async () => {
    const week = await tasksForWeek(MONDAY);
    expect(week["2026-07-02"]).toEqual([]);
  });

  test("files a task under its own day and no other", async () => {
    await addTask("2026-07-01", "ship the thing");

    const week = await tasksForWeek(MONDAY);
    expect(week["2026-07-01"].map((task) => task.title)).toEqual(["ship the thing"]);
    for (const key of WEEK.filter((k) => k !== "2026-07-01")) {
      expect(week[key]).toEqual([]);
    }
  });

  test("omits a task dated outside the week", async () => {
    await addTask("2026-07-06", "next monday");

    const week = await tasksForWeek(MONDAY);
    expect(Object.values(week).flat()).toEqual([]);
  });

  test("orders tasks within a day by creation", async () => {
    await addTask("2026-07-01", "first");
    await addTask("2026-07-01", "second");
    await addTask("2026-07-01", "third");

    const week = await tasksForWeek(MONDAY);
    expect(week["2026-07-01"].map((task) => task.title)).toEqual(["first", "second", "third"]);
  });

  test("normalizes a mid-week key to the week that contains it", async () => {
    await addTask("2026-06-29", "monday task");
    // 2026-07-02 is the Thursday of the same week.
    expect(Object.keys(await tasksForWeek("2026-07-02")).sort()).toEqual(WEEK);
    expect((await tasksForWeek("2026-07-02"))["2026-06-29"]).toHaveLength(1);
  });

  test("rejects a malformed week key", async () => {
    await expect(tasksForWeek("2026-6-29")).rejects.toThrow();
  });
});

describe("addTask", () => {
  test("stores an incomplete task with the given title", async () => {
    const task = await addTask("2026-07-01", "water plants");
    expect(task.title).toBe("water plants");
    expect(task.dayKey).toBe("2026-07-01");
    expect(task.isCompleted).toBe(false);
  });

  test("trims surrounding whitespace from the title", async () => {
    const task = await addTask("2026-07-01", "  water plants  ");
    expect(task.title).toBe("water plants");
  });

  test.each(["2026-7-1", "not-a-date", "2026-07-04T00:00:00Z", "", "2026-02-30"])(
    "rejects the malformed day key %j",
    async (bad) => {
      // The day key arrives from the client and reaches a query, so it is
      // validated at this boundary rather than trusted.
      await expect(addTask(bad, "anything")).rejects.toThrow();
    },
  );

  test.each(["", "   "])("rejects the blank title %j", async (blank) => {
    await expect(addTask("2026-07-01", blank)).rejects.toThrow();
  });
});

describe("toggleTask", () => {
  test("flips completion in both directions", async () => {
    const task = await addTask("2026-07-01", "ship the thing");

    await toggleTask(task.id);
    expect((await tasksForWeek(MONDAY))["2026-07-01"][0].isCompleted).toBe(true);

    await toggleTask(task.id);
    expect((await tasksForWeek(MONDAY))["2026-07-01"][0].isCompleted).toBe(false);
  });

  test("is a no-op on a missing id rather than a throw", async () => {
    await expect(toggleTask(9999)).resolves.toBeUndefined();
  });
});

describe("deleteTask", () => {
  test("removes the task", async () => {
    const task = await addTask("2026-07-01", "ship the thing");
    await deleteTask(task.id);
    expect((await tasksForWeek(MONDAY))["2026-07-01"]).toEqual([]);
  });

  test("leaves other tasks alone", async () => {
    const doomed = await addTask("2026-07-01", "doomed");
    await addTask("2026-07-01", "survivor");

    await deleteTask(doomed.id);
    expect((await tasksForWeek(MONDAY))["2026-07-01"].map((t) => t.title)).toEqual(["survivor"]);
  });

  test("is a no-op on a missing id", async () => {
    await expect(deleteTask(9999)).resolves.toBeUndefined();
  });
});
