import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { setTheme } from "@/app/actions";
import { ThemePicker } from "./ThemePicker";

/*
 * Mocked in this file rather than through `stubNextBoundaries`, because this
 * suite asserts on the call: `vi.mock` is hoisted above the imports only when
 * it appears at the top level of the test file itself, so a helper that calls
 * it cannot give this file a mocked binding to assert against.
 */
vi.mock("@/app/actions", () => ({ setTheme: vi.fn() }));

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  vi.mocked(setTheme).mockClear();
});

describe("ThemePicker", () => {
  test("is a real radio group of three, each with an accessible name", () => {
    render(<ThemePicker selected="system" />);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    for (const name of ["System", "Light", "Dark"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
  });

  test("checks the stored choice and only that one", () => {
    render(<ThemePicker selected="dark" />);

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(
      screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1);
  });

  test("paints the chosen ramp before the server round trip finishes", async () => {
    // The ramp is chosen by an attribute on <html>, which is outside this
    // component's tree and therefore outside anything React can re-render
    // optimistically. Without this the theme would visibly lag the radio by a
    // whole server round trip.
    render(<ThemePicker selected="system" />);

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  test("hands the ramp back to the OS when System is chosen", async () => {
    // Not `data-theme="system"`: the media query only applies where the
    // attribute is absent, so following the OS means removing it outright.
    render(<ThemePicker selected="dark" />);

    await userEvent.click(screen.getByRole("radio", { name: "System" }));

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(setTheme).toHaveBeenCalledWith("system");
  });
});
