import { pixelRuns } from "./pixel-sprite";

/**
 * A cloud, hand-authored on a 24x9 pixel grid and drawn the same way as the
 * slime: inline SVG, integer coordinates, `crispEdges`.
 *
 * Its two tones are deliberately the quietest in the theme — a body barely
 * lighter than paper, outlined in `ink-ghost`. Decoration sits *behind* the
 * week page, and a cloud with any real contrast would be read as a surface
 * with something in it. The one shape is reused at different scales and
 * mirrored, rather than authoring a second sprite that says the same thing.
 */
const PIXELS = [
  "........######..........",
  "......##OOOOOO##........",
  ".....#OOOOOOOOOO#.......",
  "....#OOOOOOOOOOOOOO###..",
  "...#OOOOOOOOOOOOOOOOOO#.",
  "..#OOOOOOOOOOOOOOOOOOOO#",
  ".#OOOOOOOOOOOOOOOOOOOOO#",
  ".#OOOOOOOOOOOOOOOOOOOOO#",
  ".#######################",
] as const;

const WIDTH = 24;
const HEIGHT = 9;

const FILLS: Record<string, string> = {
  "#": "var(--color-ink-ghost)",
  O: "var(--color-cloud)",
};

export function PixelCloud({
  scale = 1,
  flipped = false,
  className,
}: {
  /** Integer only. The sprite is crisp at 1x and 2x and nowhere between. */
  scale?: number;
  /** Mirrors the sprite, so the same cloud can appear twice without repeating. */
  flipped?: boolean;
  className?: string;
}) {
  const step = Math.trunc(scale);

  return (
    <svg
      shapeRendering="crispEdges"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * step}
      height={HEIGHT * step}
      aria-hidden="true"
      focusable="false"
      // A mirror, not a rotation: -1 keeps every pixel on its own boundary,
      // where any other angle would resample the sprite into softness.
      style={flipped ? { transform: "scaleX(-1)" } : undefined}
      className={className}
    >
      {pixelRuns(PIXELS).map((run) => (
        <rect
          key={`${run.x}-${run.y}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          fill={FILLS[run.symbol]}
        />
      ))}
    </svg>
  );
}
