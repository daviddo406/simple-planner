import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SLIME_IDS } from "@/lib/slimes";
import { Backdrop } from "./Backdrop";

describe("Backdrop", () => {
  test("is inert: hidden from assistive technology and untouchable", () => {
    const { container } = render(<Backdrop />);
    const layer = container.firstElementChild!;
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toContain("pointer-events-none");
    // Scenery that swallowed a click would break the task list behind it.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  test("never enters the flow or widens the document", () => {
    const { container } = render(<Backdrop />);
    const layer = container.firstElementChild!;
    expect(layer.className).toContain("fixed");
    expect(layer.className).toContain("-z-10");
    // Sprites placed near the edges must be clipped, not scrolled to.
    expect(layer.className).toContain("overflow-hidden");
  });

  test("draws clouds up top and the whole colony along the bottom", () => {
    const { container } = render(<Backdrop />);
    // 9 rows tall for the cloud, 14 for the slime — enough to tell them apart
    // without asserting on the art itself.
    const heights = [...container.querySelectorAll("svg")].map((svg) =>
      svg.getAttribute("viewBox"),
    );
    expect(heights.filter((box) => box === "0 0 24 9")).toHaveLength(4);
    expect(heights.filter((box) => box === "0 0 16 14")).toHaveLength(SLIME_IDS.length);
  });
});
