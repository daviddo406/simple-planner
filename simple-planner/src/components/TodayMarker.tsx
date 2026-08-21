"use client";

import { useEffect } from "react";
import { dayKey } from "@/lib/calendar";

/**
 * "Today" is the one thing the server cannot know: it renders in the server's
 * time zone and the browser hydrates in the user's, so a user far enough east
 * would be told it is yesterday. Resolving it here, after mount, means it can
 * never cause a hydration mismatch — the server sends a grid with no today in
 * it, and the browser adds one.
 *
 * Marked by fill rather than by a ring: a ring on a 32px cell competes with
 * the grid's own 2px borders and reads as noise.
 */
export function TodayMarker() {
  useEffect(() => {
    const cell = document.querySelector<HTMLElement>(
      `[data-day-key="${dayKey(new Date())}"]`,
    );
    if (!cell) return;

    cell.setAttribute("aria-current", "date");
    // A cell already in the selected week is inverted to full ink, which is
    // the stronger mark; leave it alone rather than weakening it.
    if (cell.dataset.inWeek !== "true") {
      cell.classList.remove("hover:bg-ink-ghost");
      cell.classList.add("bg-ink-ghost");
    }

    return () => {
      cell.removeAttribute("aria-current");
      cell.classList.remove("bg-ink-ghost");
      cell.classList.add("hover:bg-ink-ghost");
    };
  }, []);

  return null;
}
