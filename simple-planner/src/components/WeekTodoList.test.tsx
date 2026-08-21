import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { addTodo } from "@/app/actions";
import type { WeekTodo } from "@/db/queries";
import { WeekTodoList } from "./WeekTodoList";


// Mocked here rather than through `stubNextBoundaries`; see `makeTodo` below
// for why this file keeps clear of `test-setup` entirely.
/**
 * Local rather than shared from `test-setup`: importing that module registers
 * its own `@/app/actions` mock — `vi.mock` is hoisted to the top of whichever
 * module contains it — and the second registration wins for the component
 * under test while this file's import stays bound to the first, so every
 * assertion on a call would silently see zero.
 */
function makeTodo(overrides: Partial<WeekTodo> = {}): WeekTodo {
  return {
    id: 1,
    title: "renew the passport",
    weekKey: "2026-06-29",
    isCompleted: false,
    createdAt: new Date("2026-06-29T09:00:00Z"),
    ...overrides,
  };
}

vi.mock("@/app/actions", () => ({
  addTodo: vi.fn(),
  toggleTodo: vi.fn(),
  renameTodo: vi.fn(),
  deleteTodo: vi.fn(),
}));

describe("WeekTodoList", () => {
  test("carries its own heading", () => {
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);
    expect(screen.getByRole("group", { name: /todo/i })).toBeInTheDocument();
  });

  test("renders a row per todo, in the order given", () => {
    render(
      <WeekTodoList
        weekKey="2026-06-29"
        todos={[makeTodo({ title: "first" }), makeTodo({ title: "second" })]}
      />,
    );

    expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "first×",
      "second×",
    ]);
  });

  test("offers the add field even when the list is empty", () => {
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);
    expect(screen.getByRole("textbox", { name: /add/i })).toBeInTheDocument();
  });

  test("renders no empty list element when there is nothing on the list", () => {
    // An empty <ul> is a bordered gap on paper and an announced-but-empty list
    // to a screen reader.
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  test("adds a todo against the week it was rendered for", async () => {
    vi.mocked(addTodo).mockClear();
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);

    await userEvent.type(screen.getByRole("textbox", { name: /add/i }), "renew the passport{Enter}");

    // `waitFor`, because the write is inside a transition and lands after the
    // keystroke resolves.
    await waitFor(() => expect(addTodo).toHaveBeenCalledWith("2026-06-29", "renew the passport"));
  });

  test("shows a new todo before the server has answered", async () => {
    // The optimistic append has to live here rather than in the row, because
    // the form cannot render a row above itself. The action is held pending
    // for the length of the test, because an optimistic value is by definition
    // only on screen while the write is in flight.
    vi.mocked(addTodo).mockClear();
    vi.mocked(addTodo).mockReturnValue(new Promise(() => {}));
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);

    await userEvent.type(screen.getByRole("textbox", { name: /add/i }), "renew the passport{Enter}");

    expect(await screen.findByText("renew the passport")).toBeInTheDocument();
    vi.mocked(addTodo).mockReset();
  });

  test("clears the add field after a submit", async () => {
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);
    const field = screen.getByRole("textbox", { name: /add/i });

    await userEvent.type(field, "renew the passport{Enter}");

    expect(field).toHaveValue("");
  });

  test("ignores an empty submit", async () => {
    vi.mocked(addTodo).mockClear();
    render(<WeekTodoList weekKey="2026-06-29" todos={[]} />);

    await userEvent.type(screen.getByRole("textbox", { name: /add/i }), "   {Enter}");

    expect(addTodo).not.toHaveBeenCalled();
  });
});
