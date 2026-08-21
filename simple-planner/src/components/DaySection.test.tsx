import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DaySection } from "./DaySection";
import { makeTask, stubNextBoundaries } from "./test-setup";

stubNextBoundaries();

function renderDay({
  holidays = [] as string[],
  tasks = [] as ReturnType<typeof makeTask>[],
} = {}) {
  return render(
    <DaySection
      date={new Date(2026, 6, 4)}
      dayKey="2026-07-04"
      tasks={tasks}
      holidays={holidays}
    />,
  );
}

describe("DaySection", () => {
  test("shows the date number and weekday name", () => {
    renderDay();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("SAT")).toBeInTheDocument();
  });

  test("prints a holiday inline on its date", () => {
    renderDay({ holidays: ["Independence Day"] });
    expect(screen.getByText(/Independence Day/i)).toBeInTheDocument();
  });

  test("prints nothing when the day has no holiday", () => {
    renderDay();
    expect(screen.queryByText(/Independence Day/i)).not.toBeInTheDocument();
  });

  test("offers an add form addressed to its own day", () => {
    renderDay();
    expect(screen.getByLabelText("Add a task to Saturday 4 July")).toBeInTheDocument();
  });

  test("lists its tasks", () => {
    renderDay({ tasks: [makeTask({ title: "fireworks" })] });
    expect(screen.getByText("fireworks")).toBeInTheDocument();
  });
});
