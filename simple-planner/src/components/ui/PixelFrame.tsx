import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type PixelFrameProps<T extends ElementType> = {
  as?: T;
  /** Hard 4px offset shadow. Never a blur — a blur radius here is a bug. */
  raised?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * The bordered box every surface in the app is made of: 2px border, square
 * corners, optional hard offset shadow. The mini calendar, each day section,
 * and the add form are all this component.
 *
 * 2px rather than 1px because a 1px CSS border straddles a physical pixel
 * boundary on a 1.5x display — most mid-range Android, and any Windows laptop
 * at 150% scaling — and renders as two grey half-pixels.
 */
export function PixelFrame<T extends ElementType = "div">({
  as,
  raised = false,
  className = "",
  children,
  ...rest
}: PixelFrameProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      className={`border-2 border-ink bg-paper ${raised ? "shadow-hard" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}
