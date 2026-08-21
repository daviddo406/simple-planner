import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type PixelButtonProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Square, 2px border, and a hard shadow that *moves* on press — the offset
 * drops to zero and the button shifts 4px down and right into the space it
 * vacated. That is the pixel equivalent of a press: a jump between two grid
 * positions, not an eased animation. It works identically under
 * `prefers-reduced-motion`, because there is nothing to reduce.
 *
 * Renders as `<a>` when given `as={Link}`, so the mini calendar's month
 * controls are real links rather than buttons pretending to be.
 */
export function PixelButton<T extends ElementType = "button">({
  as,
  className = "",
  children,
  ...rest
}: PixelButtonProps<T>) {
  const Component = (as ?? "button") as ElementType;
  return (
    <Component
      className={[
        "inline-flex items-center justify-center",
        "border-2 border-ink bg-paper text-ink",
        "font-display text-display-sm uppercase",
        "px-3 py-2 shadow-hard-sm",
        "hover:bg-ink hover:text-paper",
        "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        "disabled:text-ink-ghost disabled:hover:bg-paper disabled:hover:text-ink-ghost",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </Component>
  );
}
