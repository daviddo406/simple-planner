import type { ComponentPropsWithoutRef } from "react";

/**
 * A real `<input type="checkbox">` with `appearance: none` and a drawn check,
 * not a styled `<div>` with a click handler. Keeping the native element keeps
 * native keyboard behaviour, the native accessible role, and label
 * association — all of which a div reimplements badly or not at all.
 *
 * The check is a CSS-drawn glyph on a 4px grid rather than a font glyph or an
 * SVG tick, so it cannot pick up antialiasing from either.
 */
export function PixelCheckbox({ className = "", ...rest }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      type="checkbox"
      className={[
        "appearance-none shrink-0",
        "size-6 border-2 border-ink bg-paper",
        "grid place-content-center",
        "before:block before:size-3 before:scale-0 before:bg-ink before:content-['']",
        "checked:before:scale-100",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
