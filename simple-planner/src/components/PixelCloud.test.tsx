import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PixelCloud } from "./ui/PixelCloud";

function svgFor(props: Parameters<typeof PixelCloud>[0] = {}) {
  const { container } = render(<PixelCloud {...props} />);
  return container.querySelector("svg")!;
}

describe("PixelCloud", () => {
  test("carries shape-rendering=crispEdges", () => {
    // Same reason as the slime: browsers antialias SVG rect edges by default,
    // and a soft-edged cloud is the theme leaking through the back door.
    expect(svgFor()).toHaveAttribute("shape-rendering", "crispEdges");
  });

  test("uses no fractional coordinate anywhere", () => {
    for (const rect of svgFor({ scale: 3 }).querySelectorAll("rect")) {
      for (const attribute of ["x", "y", "width", "height"]) {
        expect(rect.getAttribute(attribute), `${attribute} of ${rect.outerHTML}`).not.toMatch(
          /\d\.\d/,
        );
      }
    }
  });

  test("renders only at integer multiples of its 24x9 native size", () => {
    expect(svgFor()).toHaveAttribute("width", "24");
    expect(svgFor()).toHaveAttribute("height", "9");
    expect(svgFor({ scale: 3 })).toHaveAttribute("width", "72");
    expect(svgFor({ scale: 3 })).toHaveAttribute("height", "27");
  });

  test("mirrors rather than rotates, so pixels stay on their boundaries", () => {
    expect(svgFor({ flipped: true })).toHaveStyle({ transform: "scaleX(-1)" });
    expect(svgFor().getAttribute("style")).toBeNull();
  });

  test("paints only the two backdrop tones, never an ink or slime color", () => {
    const fills = new Set(
      [...svgFor().querySelectorAll("rect")].map((rect) => rect.getAttribute("fill")),
    );
    expect(fills).toEqual(new Set(["var(--color-cloud)", "var(--color-ink-ghost)"]));
  });

  test("is decoration, so it is hidden from assistive technology", () => {
    expect(svgFor()).toHaveAttribute("aria-hidden", "true");
  });
});
