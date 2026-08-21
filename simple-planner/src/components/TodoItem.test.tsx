import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { deleteTodo, renameTodo, toggleTodo } from "@/app/actions";
import type { WeekTodo } from "@/db/queries";
import { TodoItem } from "./TodoItem";


// `vi.mock` is hoisted only from a test file's top level — the call inside
// `stubNextBoundaries` runs too late to intercept the import, which goes
// unnoticed in tests that never assert on the stub. These do.
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

describe("TodoItem", () => {
  test("uses a real checkbox reachable by role and label", () => {
    render(<TodoItem todo={makeTodo({ title: "renew the passport" })} />);

    const checkbox = screen.getByRole("checkbox", { name: /renew the passport/i });
    expect(checkbox).toBeInstanceOf(HTMLInputElement);
    expect(checkbox).not.toBeChecked();
  });

  test("reflects a completed todo", () => {
    render(<TodoItem todo={makeTodo({ title: "posted", isCompleted: true })} />);
    expect(screen.getByRole("checkbox", { name: /posted/i })).toBeChecked();
  });

  test("strikes a completed title with a drawn rule, not text-decoration", () => {
    render(<TodoItem todo={makeTodo({ title: "posted", isCompleted: true })} />);

    const title = screen.getByText("posted");
    expect(title).toHaveClass("strike-pixel");
    expect(title).not.toHaveStyle({ textDecorationLine: "line-through" });
  });

  test("toggles the todo, not the day task of the same id", async () => {
    // The two tables have independent identity columns, so id 7 names a todo
    // and a task at once; routing a tick to the wrong action would silently
    // tick a task somewhere in the week.
    vi.mocked(toggleTodo).mockClear();
    render(<TodoItem todo={makeTodo({ id: 7, title: "renew the passport" })} />);

    await userEvent.click(screen.getByRole("checkbox", { name: /renew the passport/i }));

    expect(toggleTodo).toHaveBeenCalledWith(7);
  });

  test("deletes through the todo action", async () => {
    vi.mocked(deleteTodo).mockClear();
    render(<TodoItem todo={makeTodo({ id: 8, title: "renew the passport" })} />);

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(deleteTodo).toHaveBeenCalledWith(8);
  });

  test("renames through the todo action when the edited text is committed", async () => {
    vi.mocked(renameTodo).mockClear();
    render(<TodoItem todo={makeTodo({ id: 9, title: "renew the passport" })} />);

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.type(screen.getByRole("textbox"), " today{Enter}");

    expect(renameTodo).toHaveBeenCalledWith(9, "renew the passport today");
  });

  test("writes nothing when an edit is abandoned with escape", async () => {
    vi.mocked(renameTodo).mockClear();
    render(<TodoItem todo={makeTodo({ title: "renew the passport" })} />);

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.type(screen.getByRole("textbox"), " today{Escape}");

    expect(renameTodo).not.toHaveBeenCalled();
    expect(screen.getByText("renew the passport")).toBeInTheDocument();
  });
});
