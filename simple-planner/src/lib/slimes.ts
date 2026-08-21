/**
 * The theme's one piece of character art: one shape, twelve fills. The user
 * picks one, it sits in the week header, and its shade becomes the app's
 * accent.
 *
 * These are a separate token family from the ink/paper ramp and they are
 * **fill-only**: a slime token is never a text color and never sits behind
 * text. Several of the twelve — lemon, cream, peach — cannot carry text on
 * paper at 4.5:1 and never will. What keeps that safe is that the accent only
 * ever appears as non-text marks: the sprite itself, the 2px rule under the
 * week header, and the holiday square.
 *
 * The *shade* is the accent, not the base. The base and highlight are only
 * ever painted inside the sprite, where a 2px ink outline encloses them; the
 * shade is the one that stands alone on paper, so it is the one checked at
 * 3:1. All twelve clear it, the worst (cream) at 4.47:1.
 */
export interface SlimeVariant {
  /** The body. */
  base: string;
  /** The lit upper-left of the dome. */
  highlight: string;
  /** The dark underside — and the app's accent when this slime is chosen. */
  shade: string;
}

export const SLIMES = {
  plum: { base: "#9d6bbf", highlight: "#c4a3da", shade: "#5c3577" },
  rose: { base: "#e08aa6", highlight: "#f2c0cf", shade: "#8f3454" },
  sky: { base: "#6fa8dc", highlight: "#b3d3ef", shade: "#2b5c8f" },
  teal: { base: "#4fb3a6", highlight: "#9bd8cf", shade: "#1e6b62" },
  lemon: { base: "#f0d264", highlight: "#f8ebae", shade: "#7a6115" },
  peach: { base: "#f4a878", highlight: "#fad2b6", shade: "#94491d" },
  cherry: { base: "#e0605c", highlight: "#f0a5a2", shade: "#8f2320" },
  cream: { base: "#e8d9b8", highlight: "#f5ecd8", shade: "#7d6a44" },
  bubblegum: { base: "#ef8fc9", highlight: "#f8c4e2", shade: "#96296b" },
  moss: { base: "#8aad5c", highlight: "#c0d49c", shade: "#4a6323" },
  midnight: { base: "#5a6ba8", highlight: "#9aa6cd", shade: "#2b3866" },
  amber: { base: "#e3a13c", highlight: "#f2cc8f", shade: "#8a5510" },
} as const satisfies Record<string, SlimeVariant>;

export type SlimeId = keyof typeof SLIMES;

export const SLIME_IDS = Object.keys(SLIMES) as SlimeId[];

/**
 * The default. Chosen because it clears 3:1 on paper, so a user who never
 * opens the picker still gets a correctly-contrasting accent.
 */
export const DEFAULT_SLIME_ID: SlimeId = "teal";

/**
 * Validates what comes back from the client before it is written. Uses the id
 * list rather than `id in SLIMES`, so inherited keys like `constructor` and
 * `__proto__` are rejected along with everything else unknown.
 */
export function isSlimeId(value: unknown): value is SlimeId {
  return typeof value === "string" && (SLIME_IDS as string[]).includes(value);
}
