"use client";

import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/app/actions";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";

const LABELS: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * Sits under the slime picker, built the same way and for the same reasons:
 * three real radios in a `PixelFrame` fieldset, inline in the sidebar, no
 * modal and no settings route.
 *
 * Three options rather than a two-state switch, because "follow the OS" is a
 * real answer and not the absence of one — a user on a dark machine who wants
 * light paper has to be able to say so and to take it back.
 */
export function ThemePicker({ selected }: { selected: ThemeChoice }) {
  const [, startTransition] = useTransition();
  const [optimistic, choose] = useOptimistic(selected);

  function onChoose(choice: ThemeChoice) {
    // The ramp hangs off an attribute on <html>, which is above this tree and
    // so out of reach of React's optimistic re-render. Writing it here is what
    // makes the paper change on the click rather than on the response; the
    // server then renders the same attribute on the next load.
    if (choice === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      // `setAttribute` rather than assigning to `dataset`: the React compiler
      // lint forbids writing a property of an object from outside the render,
      // and a method call says the same thing without the assignment.
      document.documentElement.setAttribute("data-theme", choice);
    }

    startTransition(async () => {
      choose(choice);
      await setTheme(choice);
    });
  }

  return (
    <PixelFrame as="fieldset" className="p-3">
      <legend className="px-2 font-display text-display-sm uppercase text-ink-soft">Theme</legend>
      <div className="flex flex-col gap-1">
        {THEME_CHOICES.map((choice) => (
          <label
            key={choice}
            className={[
              "flex cursor-pointer items-center gap-2 border-2 px-2 py-1 font-display text-display-sm",
              optimistic === choice
                ? "border-ink text-ink"
                : "border-transparent text-ink-faint hover:border-ink-ghost",
            ].join(" ")}
          >
            <input
              type="radio"
              name="theme"
              value={choice}
              checked={optimistic === choice}
              onChange={() => onChoose(choice)}
              className="sr-only"
            />
            {LABELS[choice]}
          </label>
        ))}
      </div>
    </PixelFrame>
  );
}
