import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SLIME_IDS } from "@/lib/slimes";
import { SlimePicker } from "./SlimePicker";
import { stubNextBoundaries } from "./test-setup";

stubNextBoundaries();

describe("SlimePicker", () => {
  test("is a real radio group of twelve, each with an accessible name", () => {
    // In the header the sprite is decoration; here it is the control, so each
    // swatch is a real <input type='radio'> with a name and native arrow-key
    // behaviour rather than a clickable div.
    render(<SlimePicker selected="teal" />);

    expect(screen.getAllByRole("radio")).toHaveLength(12);
    for (const id of SLIME_IDS) {
      expect(screen.getByRole("radio", { name: new RegExp(id, "i") })).toBeInTheDocument();
    }
  });

  test("checks the currently chosen slime and only that one", () => {
    render(<SlimePicker selected="plum" />);
    expect(screen.getByRole("radio", { name: /plum/i })).toBeChecked();
    expect(
      screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1);
  });
});
