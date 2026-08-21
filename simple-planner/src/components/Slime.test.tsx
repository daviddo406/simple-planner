import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SLIMES, type SlimeId } from "@/lib/slimes";
import { Slime } from "./ui/Slime";

function svgFor(id: SlimeId = "teal", scale = 1) {
  const { container } = render(<Slime id={id} scale={scale} />);
  return container.querySelector("svg")!;
}

describe("Slime", () => {
  test("carries shape-rendering=crispEdges", () => {
    // Browsers antialias SVG rect edges by default, so without this the sprite
    // renders with soft grey fringes — the exact softness the theme exists to
    // prevent, arriving through the back door. It is invisible in every other
    // kind of test, which is why it is asserted here.
    expect(svgFor()).toHaveAttribute("shape-rendering", "crispEdges");
  });

  test("uses no fractional coordinate anywhere", () => {
    const svg = svgFor();
    for (const rect of svg.querySelectorAll("rect")) {
      for (const attribute of ["x", "y", "width", "height"]) {
        expect(rect.getAttribute(attribute), `${attribute} of ${rect.outerHTML}`).not.toMatch(
          /\d\.\d/,
        );
      }
    }
  });

  test("renders only at integer multiples of its 16x14 native size", () => {
    expect(svgFor("teal", 1)).toHaveAttribute("width", "16");
    expect(svgFor("teal", 1)).toHaveAttribute("height", "14");
    expect(svgFor("teal", 2)).toHaveAttribute("width", "32");
    expect(svgFor("teal", 2)).toHaveAttribute("height", "28");
  });

  test("paints the chosen variant's fills and nothing from another", () => {
    const svg = svgFor("plum");
    const fills = new Set([...svg.querySelectorAll("rect")].map((r) => r.getAttribute("fill")));
    expect(fills).toContain(SLIMES.plum.base);
    expect(fills).toContain(SLIMES.plum.highlight);
    expect(fills).toContain(SLIMES.plum.shade);
    expect(fills).not.toContain(SLIMES.teal.base);
  });

  test("is decoration, so it is hidden from assistive technology", () => {
    expect(svgFor()).toHaveAttribute("aria-hidden", "true");
  });
});
