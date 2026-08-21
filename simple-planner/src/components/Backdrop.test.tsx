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

/**
 * The sprites are told apart by their native size. `querySelectorAll` cannot
 * do it — an attribute selector's name is ASCII-lowercased in an HTML
 * document, so `[viewBox=...]` never matches — hence the explicit read.
 */
function spritesSized(container: HTMLElement, viewBox: string) {
  return [...container.querySelectorAll("svg")].filter(
    (svg) => svg.getAttribute("viewBox") === viewBox,
  );
}

const STAR = "0 0 5 5";
const CLOUD = "0 0 24 9";

describe("the night sky", () => {
  test("scatters stars, all of them inside the night-only layer", () => {
    // The stars are always in the DOM and hidden by CSS rather than rendered
    // conditionally, because the server cannot know which ramp a "system"
    // browser will use — deciding that here would need a client component and
    // would put a flash of the wrong scenery back in.
    const { container } = render(<Backdrop />);
    const stars = spritesSized(container, STAR);

    expect(stars.length).toBeGreaterThan(4);
    for (const star of stars) {
      expect(star.closest(".night-only"), star.outerHTML).not.toBeNull();
    }
  });

  test("draws them in more than one colour", () => {
    // A single-colour scatter reads as a texture; the point of colouring them
    // is that the sky is a handful of distinct lights.
    const { container } = render(<Backdrop />);
    const colours = new Set(
      spritesSized(container, STAR)
        .flatMap((star) => [...star.querySelectorAll("rect")])
        .map((rect) => rect.getAttribute("fill"))
        .filter((fill) => fill !== "var(--color-ink)"),
    );

    expect(colours.size).toBeGreaterThan(2);
  });

  test("places every star on the 4px grid", () => {
    // Rule 3. `--spacing` is 4px, so every whole-numbered offset is already on
    // the grid — what would take a star off it is a fractional utility like
    // `top-1.5`, which is 6px and lands between device pixels at 1.5x.
    const { container } = render(<Backdrop />);
    for (const star of spritesSized(container, STAR)) {
      const classes = star.getAttribute("class") ?? "";
      expect(classes, "a star must be positioned").toMatch(/\b(?:left|right)-\d/);
      expect(classes, "no fractional offsets").not.toMatch(/-\d+\.\d/);
    }
  });

  test("keeps the clouds out of the night-only layer", () => {
    // Clouds belong to both ramps; only the stars are night-exclusive.
    const { container } = render(<Backdrop />);
    for (const cloud of spritesSized(container, CLOUD)) {
      expect(cloud.closest(".night-only")).toBeNull();
    }
  });
});
