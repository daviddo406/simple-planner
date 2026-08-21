import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PixelStar } from "./ui/PixelStar";
import { SLIMES } from "@/lib/slimes";

function svgFor(props: Partial<Parameters<typeof PixelStar>[0]> = {}) {
  const { container } = render(<PixelStar color="#f0d264" {...props} />);
  return container.querySelector("svg")!;
}

describe("PixelStar", () => {
  test("carries shape-rendering=crispEdges", () => {
    // Same reason as the cloud and the slime: a browser antialiases SVG rect
    // edges by default, and a soft-edged star is rule 6 leaking.
    expect(svgFor()).toHaveAttribute("shape-rendering", "crispEdges");
  });

  test("uses no fractional coordinate anywhere", () => {
    for (const rect of svgFor({ scale: 2 }).querySelectorAll("rect")) {
      for (const attribute of ["x", "y", "width", "height"]) {
        expect(rect.getAttribute(attribute), `${attribute} of ${rect.outerHTML}`).not.toMatch(
          /\d\.\d/,
        );
      }
    }
  });

  test("renders only at integer multiples of its 5x5 native size", () => {
    expect(svgFor()).toHaveAttribute("width", "5");
    expect(svgFor()).toHaveAttribute("height", "5");
    expect(svgFor({ scale: 2 })).toHaveAttribute("width", "10");
    expect(svgFor({ scale: 2 })).toHaveAttribute("height", "10");
  });

  test("truncates a fractional scale rather than drawing between pixels", () => {
    expect(svgFor({ scale: 2.5 })).toHaveAttribute("width", "10");
  });

  test("paints its arms in the colour it is given", () => {
    const fills = new Set(
      [...svgFor({ color: SLIMES.rose.night }).querySelectorAll("rect")].map((rect) =>
        rect.getAttribute("fill"),
      ),
    );
    expect(fills).toContain(SLIMES.rose.night);
  });

  test("lights its core with the ramp's ink rather than a second hard-coded tone", () => {
    // The core is the one part that is not the star's colour, and it has to
    // move with the ramp — a literal white would be the one thing on the page
    // that ignores the palette.
    const fills = new Set(
      [...svgFor().querySelectorAll("rect")].map((rect) => rect.getAttribute("fill")),
    );
    expect(fills).toContain("var(--color-ink)");
  });

  test("is decoration, so it is hidden from assistive technology", () => {
    expect(svgFor()).toHaveAttribute("aria-hidden", "true");
  });
});
