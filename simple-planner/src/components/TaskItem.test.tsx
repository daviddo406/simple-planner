import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { TaskItem } from "./TaskItem";
import { makeTask, stubNextBoundaries } from "./test-setup";

stubNextBoundaries();

describe("TaskItem", () => {
  test("uses a real checkbox reachable by role and label", () => {
    // The regression guard for PixelCheckbox ever being rebuilt as a styled
    // <div>: a div has no role, no label association, and no keyboard support.
    render(<TaskItem task={makeTask({ title: "water plants" })} />);

    const checkbox = screen.getByRole("checkbox", { name: /water plants/i });
    expect(checkbox).toBeInstanceOf(HTMLInputElement);
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).not.toBeChecked();
  });

  test("reflects a completed task", () => {
    render(<TaskItem task={makeTask({ title: "shipped", isCompleted: true })} />);
    expect(screen.getByRole("checkbox", { name: /shipped/i })).toBeChecked();
  });

  test("strikes a completed title with a drawn rule, not text-decoration", () => {
    // `text-decoration: line-through` has a font-derived thickness that lands
    // off the 4px grid, so the strike is drawn as a 2px rule instead.
    render(<TaskItem task={makeTask({ title: "shipped", isCompleted: true })} />);

    const title = screen.getByText("shipped");
    expect(title).toHaveClass("strike-pixel");
    expect(title).not.toHaveStyle({ textDecorationLine: "line-through" });
  });

  test("leaves an incomplete title unstruck", () => {
    render(<TaskItem task={makeTask({ title: "not shipped" })} />);
    expect(screen.getByText("not shipped")).not.toHaveClass("strike-pixel");
  });

  test("strikes only the title, not the width of the row", () => {
    render(<TaskItem task={makeTask({ title: "shipped", isCompleted: true })} />);
    // The struck element must not be the row's flex-grow spacer, or the rule
    // runs on past the end of the text to the delete button.
    expect(screen.getByText("shipped")).not.toHaveClass("grow");
  });

  test("offers a delete control named after the task", () => {
    render(<TaskItem task={makeTask({ title: "water plants" })} />);
    expect(screen.getByRole("button", { name: /delete .*water plants/i })).toBeInTheDocument();
  });
});
