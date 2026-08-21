import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MiniCalendar } from "./MiniCalendar";
import { stubNextBoundaries } from "./test-setup";

stubNextBoundaries();

const MONDAY = "2026-06-29";

function renderCalendar({ monthKey = "2026-07-01" } = {}) {
  return render(<MiniCalendar weekKey={MONDAY} monthKey={monthKey} holidayKeys={[]} />);
}

describe("MiniCalendar", () => {
  test("heads the grid with the month and Monday-first weekday letters", () => {
    renderCalendar();
    expect(screen.getByText("JUL 2026")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
  });

  test("links each day to the week that contains it", () => {
    renderCalendar();
    // 2026-07-08 is a Wednesday; its week starts Monday 2026-07-06.
    expect(screen.getByRole("link", { name: "8 July 2026" })).toHaveAttribute(
      "href",
      "/?week=2026-07-06&month=2026-07-01",
    );
  });

  test("marks the cells belonging to the selected week", () => {
    renderCalendar();
    // The selected week is Mon 29 Jun – Sun 5 Jul, so only 1–5 July are in it.
    const inWeek = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("data-in-week") === "true")
      .map((link) => link.textContent);
    expect(inWeek).toEqual(["1", "2", "3", "4", "5"]);
  });

  test("pages to the adjacent months without moving the selected week", () => {
    renderCalendar();
    expect(screen.getByRole("link", { name: /previous month/i })).toHaveAttribute(
      "href",
      "/?week=2026-06-29&month=2026-06-01",
    );
    expect(screen.getByRole("link", { name: /next month/i })).toHaveAttribute(
      "href",
      "/?week=2026-06-29&month=2026-08-01",
    );
  });

  test("leaves padding cells empty rather than showing adjacent-month dates", () => {
    renderCalendar();
    // July 2026 starts on a Wednesday, so the first row has two blank cells.
    const firstRow = within(screen.getByRole("table")).getAllByRole("row")[1];
    const cells = within(firstRow).getAllByRole("cell");
    expect(cells.slice(0, 2).map((cell) => cell.textContent)).toEqual(["", ""]);
    expect(cells[2].textContent).toBe("1");
  });
});
