/**
 * What the user may store about the theme — and, deliberately, not what the
 * browser ends up rendering.
 *
 * "system" is a real stored value rather than the absence of one, because the
 * three states are not two: a user on a dark machine who has chosen Light is
 * saying something different from a user who has chosen nothing, and only an
 * explicit third value can tell them apart on the next request.
 *
 * The resolution from choice to ramp happens entirely in CSS. `layout.tsx`
 * writes `data-theme` for "light" and "dark" and omits it for "system", which
 * leaves `prefers-color-scheme` in charge — so the server never has to guess
 * at a preference it cannot see.
 */
export const THEME_CHOICES = ["system", "light", "dark"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

/** Following the OS is the default: it is right without anyone choosing it. */
export const DEFAULT_THEME: ThemeChoice = "system";

/**
 * Validates what comes back from the client before it is written. Uses the
 * list rather than a key lookup, so inherited names like `constructor` are
 * rejected along with everything else that is not a choice.
 */
export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}
