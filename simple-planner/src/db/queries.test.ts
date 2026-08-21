// @vitest-environment node
// PGlite is Postgres compiled to WASM, run in-process: no Docker, no network,
// no test database to provision — and because it is genuinely Postgres, the
// migrations exercised here are the ones that will run in production, which an
// SQLite stand-in could never guarantee.
import { beforeEach, describe, expect, test } from "vitest";
import { resetDb } from "./index";
import {
  addTask,
  addTodo,
  deleteTask,
  deleteTodo,
  getSlime,
  getTheme,
  renameTask,
  renameTodo,
  setSlime,
  setTheme,
  tasksForWeek,
  todosForWeek,
  toggleTask,
  toggleTodo,
} from "./queries";

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

describe("renameTask", () => {
  test("replaces the title", async () => {
    const task = await addTask("2026-07-01", "buy milk");

    await renameTask(task.id, "buy oat milk");
    expect((await tasksForWeek(MONDAY))["2026-07-01"].map((t) => t.title)).toEqual([
      "buy oat milk",
    ]);
  });

  test("trims the new title", async () => {
    const task = await addTask("2026-07-01", "buy milk");

    await renameTask(task.id, "   buy oat milk   ");
    expect((await tasksForWeek(MONDAY))["2026-07-01"][0].title).toBe("buy oat milk");
  });

  test("rejects an empty title and leaves the old one", async () => {
    const task = await addTask("2026-07-01", "buy milk");

    await expect(renameTask(task.id, "   ")).rejects.toThrow();
    expect((await tasksForWeek(MONDAY))["2026-07-01"][0].title).toBe("buy milk");
  });

  test("leaves completion and day alone", async () => {
    const task = await addTask("2026-07-01", "buy milk");
    await toggleTask(task.id);

    await renameTask(task.id, "buy oat milk");
    const row = (await tasksForWeek(MONDAY))["2026-07-01"][0];
    expect(row.isCompleted).toBe(true);
    expect(row.dayKey).toBe("2026-07-01");
  });

  test("leaves other tasks alone", async () => {
    const target = await addTask("2026-07-01", "buy milk");
    await addTask("2026-07-01", "bystander");

    await renameTask(target.id, "buy oat milk");
    expect((await tasksForWeek(MONDAY))["2026-07-01"].map((t) => t.title)).toEqual([
      "buy oat milk",
      "bystander",
    ]);
  });

  test("is a no-op on a missing id", async () => {
    await expect(renameTask(9999, "nobody")).resolves.toBeUndefined();
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

describe("the slime preference", () => {
  test("returns the default on a fresh database rather than null", () => {
    // Never null, so no caller has to branch on "not chosen yet".
    return expect(getSlime()).resolves.toBe("teal");
  });

  test("returns the stored value after it is set", async () => {
    await setSlime("plum");
    expect(await getSlime()).toBe("plum");
  });

  test("overwrites rather than accumulating rows", async () => {
    await setSlime("plum");
    await setSlime("moss");
    expect(await getSlime()).toBe("moss");
  });

  test("rejects a bogus id and writes nothing", async () => {
    await setSlime("plum");
    await expect(setSlime("chartreuse")).rejects.toThrow();
    expect(await getSlime()).toBe("plum");
  });
});

describe("the theme preference", () => {
  test("follows the OS on a fresh database rather than picking a side", () => {
    return expect(getTheme()).resolves.toBe("system");
  });

  test("returns the stored value after it is set", async () => {
    await setTheme("dark");
    expect(await getTheme()).toBe("dark");
  });

  test("can be set back to following the OS", async () => {
    // The round trip that a two-state toggle cannot make: an explicit Light
    // on a dark machine has to be undoable back to "no opinion".
    await setTheme("light");
    await setTheme("system");
    expect(await getTheme()).toBe("system");
  });

  test("rejects a bogus choice and writes nothing", async () => {
    await setTheme("dark");
    await expect(setTheme("night")).rejects.toThrow();
    expect(await getTheme()).toBe("dark");
  });

  test("shares the settings table with the slime without clobbering it", async () => {
    // One key/value table holds both preferences; an upsert keyed on the wrong
    // column would let the newer write take the older one's row.
    await setSlime("moss");
    await setTheme("dark");
    expect(await getSlime()).toBe("moss");
    expect(await getTheme()).toBe("dark");
  });
});

describe("todosForWeek", () => {
  test("returns an empty list, not undefined, for a week with no todos", async () => {
    expect(await todosForWeek(MONDAY)).toEqual([]);
  });

  test("reads back a todo added to the same week", async () => {
    await addTodo(MONDAY, "renew the passport");
    expect((await todosForWeek(MONDAY)).map((todo) => todo.title)).toEqual(["renew the passport"]);
  });

  test("starts a todo incomplete", async () => {
    await addTodo(MONDAY, "renew the passport");
    expect((await todosForWeek(MONDAY))[0].isCompleted).toBe(false);
  });

  test("omits a todo belonging to another week", async () => {
    await addTodo("2026-07-06", "next week's list");
    expect(await todosForWeek(MONDAY)).toEqual([]);
  });

  test("keeps todos out of the day-task lists entirely", async () => {
    // The reason `week_todos` is its own table: a todo stored as a task dated
    // Monday would render inside the Monday section of the week page.
    await addTodo(MONDAY, "renew the passport");

    const week = await tasksForWeek(MONDAY);
    for (const key of WEEK) {
      expect(week[key]).toEqual([]);
    }
  });

  test("returns todos in the order they were added", async () => {
    await addTodo(MONDAY, "first");
    await addTodo(MONDAY, "second");
    await addTodo(MONDAY, "third");

    expect((await todosForWeek(MONDAY)).map((todo) => todo.title)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  test("files a todo added under a midweek day onto that week's one list", async () => {
    // Every day of a week names the same list, so a stale `?week=` naming a
    // Thursday cannot create a second list beside the Monday one.
    await addTodo("2026-07-02", "renew the passport");

    expect((await todosForWeek(MONDAY)).map((todo) => todo.title)).toEqual(["renew the passport"]);
  });

  test("reads back the same list whichever day of the week is asked for", async () => {
    await addTodo(MONDAY, "renew the passport");
    expect((await todosForWeek("2026-07-05")).map((todo) => todo.title)).toEqual([
      "renew the passport",
    ]);
  });
});

describe("addTodo", () => {
  test("trims the title", async () => {
    await addTodo(MONDAY, "  padded  ");
    expect((await todosForWeek(MONDAY))[0].title).toBe("padded");
  });

  test("rejects a blank title", async () => {
    await expect(addTodo(MONDAY, "   ")).rejects.toThrow();
  });

  test("rejects a week key that is not a real date", async () => {
    await expect(addTodo("2026-02-30", "impossible")).rejects.toThrow();
  });
});

describe("toggleTodo", () => {
  test("flips completion", async () => {
    const todo = await addTodo(MONDAY, "renew the passport");

    await toggleTodo(todo.id);
    expect((await todosForWeek(MONDAY))[0].isCompleted).toBe(true);

    await toggleTodo(todo.id);
    expect((await todosForWeek(MONDAY))[0].isCompleted).toBe(false);
  });

  test("is a no-op for an id that does not exist", async () => {
    await expect(toggleTodo(9999)).resolves.toBeUndefined();
  });
});

describe("renameTodo", () => {
  test("changes the title", async () => {
    const todo = await addTodo(MONDAY, "renew the passport");
    await renameTodo(todo.id, "renew the licence");
    expect((await todosForWeek(MONDAY))[0].title).toBe("renew the licence");
  });

  test("rejects a blank title", async () => {
    const todo = await addTodo(MONDAY, "renew the passport");
    await expect(renameTodo(todo.id, "   ")).rejects.toThrow();
  });
});

describe("deleteTodo", () => {
  test("removes the todo", async () => {
    const todo = await addTodo(MONDAY, "renew the passport");
    await deleteTodo(todo.id);
    expect(await todosForWeek(MONDAY)).toEqual([]);
  });

  test("leaves the other todos in the week alone", async () => {
    const todo = await addTodo(MONDAY, "renew the passport");
    await addTodo(MONDAY, "keep me");

    await deleteTodo(todo.id);
    expect((await todosForWeek(MONDAY)).map((t) => t.title)).toEqual(["keep me"]);
  });
});
