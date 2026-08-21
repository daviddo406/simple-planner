import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { stubNextBoundaries } from "./test-setup";
import { ThisWeekButton } from "./ThisWeekButton";

stubNextBoundaries();

// A Wednesday, so "this week" is the Monday two days earlier.
const NOW = new Date(2026, 6, 1, 10, 0, 0);
const THIS_WEEK = "2026-06-29";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ThisWeekButton", () => {
  test("stays hidden while the current week is the one being shown", () => {
    render(<ThisWeekButton weekKey={THIS_WEEK} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("offers a way back once the reader is on another week", () => {
    render(<ThisWeekButton weekKey="2026-09-07" />);
    expect(screen.getByRole("link", { name: "This week" })).toHaveAttribute(
      "href",
      `/?week=${THIS_WEEK}&month=2026-07-01`,
    );
  });
});
