import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { makeTask, stubNextBoundaries } from "./test-setup";
import { WeekPage } from "./WeekPage";

stubNextBoundaries();

const MONDAY = "2026-06-29";

function renderWeek(tasks: Record<string, ReturnType<typeof makeTask>[]> = {}) {
  const week = [
    "2026-06-29",
    "2026-06-30",
    "2026-07-01",
    "2026-07-02",
    "2026-07-03",
    "2026-07-04",
    "2026-07-05",
  ];
  return render(
    <WeekPage
      weekKey={MONDAY}
      tasks={Object.fromEntries(week.map((key) => [key, tasks[key] ?? []]))}
      holidays={{}}
      slime="teal"
    />,
  );
}

describe("WeekPage", () => {
  test("renders exactly seven day sections", () => {
    renderWeek();
    expect(screen.getAllByRole("region")).toHaveLength(7);
  });

  test("renders them Monday through Sunday with the right dates", () => {
    renderWeek();
    expect(
      screen.getAllByRole("region").map((section) => section.getAttribute("aria-label")),
    ).toEqual([
      "Monday 29 June",
      "Tuesday 30 June",
      "Wednesday 1 July",
      "Thursday 2 July",
      "Friday 3 July",
      "Saturday 4 July",
      "Sunday 5 July",
    ]);
  });

  test("shows the week range in the header", () => {
    renderWeek();
    expect(screen.getByText("JUN 29 – JUL 5, 2026")).toBeInTheDocument();
  });

  test("files a task under its own day and no other", () => {
    renderWeek({ "2026-07-01": [makeTask({ title: "water plants" })] });

    const wednesday = screen.getByRole("region", { name: "Wednesday 1 July" });
    expect(within(wednesday).getByText("water plants")).toBeInTheDocument();

    const thursday = screen.getByRole("region", { name: "Thursday 2 July" });
    expect(within(thursday).queryByText("water plants")).not.toBeInTheDocument();
  });
});
