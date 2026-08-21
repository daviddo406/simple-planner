/**
 * The theme's one piece of character art: one shape, twelve fills. The user
 * picks one, it sits in the week header, and its shade becomes the app's
 * accent.
 *
 * These are a separate token family from the ink/paper ramp, and they split
 * two ways. The *base* and *highlight* are fill-only — several of the twelve,
 * lemon and cream and peach among them, could never carry text on paper — and
 * they are painted nowhere but inside the sprite, where a 2px ink outline
 * encloses them.
 *
 * The *shade* is the one that stands alone on paper, so it is the one that is
 * measured. It is the app's accent: the 2px rule under the week header, the
 * holiday square, and — since the planner's headings and day labels are tinted
 * by the chosen slime — real text. That last use is why every shade is held to
 * **4.5:1 against paper**, the body-text threshold, rather than the 3:1 a
 * non-text mark would need. Eleven cleared it as drawn; cream is the one that
 * had to be darkened for it (4.47:1 to 4.62:1), which is a change no eye can
 * see and a screen reader's user very much can.
 *
 * `slimes.test.ts` recomputes all twelve ratios rather than trusting this
 * comment, so a thirteenth slime cannot be added below the line.
 */
export interface SlimeVariant {
  /** The body. */
  base: string;
  /** The lit upper-left of the dome. */
  highlight: string;
  /** The dark underside — and the app's accent when this slime is chosen, on day paper. */
  shade: string;
  /**
   * The accent on night paper. Usually the base tone, which is already a
   * mid-value built to sit inside an ink outline and therefore reads cleanly
   * on a dark ground; midnight is the one slime whose base is too dark for it
   * and carries a lightened tone of its own.
   */
  night: string;
}

export const SLIMES = {
  plum: { base: "#9d6bbf", highlight: "#c4a3da", shade: "#5c3577", night: "#9d6bbf" },
  rose: { base: "#e08aa6", highlight: "#f2c0cf", shade: "#8f3454", night: "#e08aa6" },
  sky: { base: "#6fa8dc", highlight: "#b3d3ef", shade: "#2b5c8f", night: "#6fa8dc" },
  teal: { base: "#4fb3a6", highlight: "#9bd8cf", shade: "#1e6b62", night: "#4fb3a6" },
  lemon: { base: "#f0d264", highlight: "#f8ebae", shade: "#7a6115", night: "#f0d264" },
  peach: { base: "#f4a878", highlight: "#fad2b6", shade: "#94491d", night: "#f4a878" },
  cherry: { base: "#e0605c", highlight: "#f0a5a2", shade: "#8f2320", night: "#e0605c" },
  cream: { base: "#e8d9b8", highlight: "#f5ecd8", shade: "#7a6843", night: "#e8d9b8" },
  bubblegum: { base: "#ef8fc9", highlight: "#f8c4e2", shade: "#96296b", night: "#ef8fc9" },
  moss: { base: "#8aad5c", highlight: "#c0d49c", shade: "#4a6323", night: "#8aad5c" },
  midnight: { base: "#5a6ba8", highlight: "#9aa6cd", shade: "#2b3866", night: "#7284c4" },
  amber: { base: "#e3a13c", highlight: "#f2cc8f", shade: "#8a5510", night: "#e3a13c" },
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
