import { pixelRuns } from "./pixel-sprite";

/**
 * A star, hand-authored on a 5x5 grid and drawn the same way as the cloud and
 * the slime: inline SVG, integer coordinates, `crispEdges`.
 *
 * Five pixels across is deliberately tiny. Stars are the *quietest* thing on
 * the page — they sit behind the week page in the margins, and anything with
 * real presence up there competes with the week header rather than framing it.
 *
 * Two tones. The arms take whatever colour the caller passes, which is what
 * makes a scattered handful read as a night sky rather than as a texture; the
 * core is `--color-ink`, so the brightest pixel of every star moves with the
 * ramp instead of being a literal white that ignores the palette.
 */
const PIXELS = ["..#..", "..#..", "##O##", "..#..", "..#.."] as const;

const SIZE = 5;

export function PixelStar({
  color,
  scale = 1,
  className,
}: {
  /** The arms' colour — a slime's night tone, in practice. */
  color: string;
  /** Integer only. The sprite is crisp at 1x and 2x and nowhere between. */
  scale?: number;
  className?: string;
}) {
  const step = Math.trunc(scale);

  return (
    <svg
      shapeRendering="crispEdges"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE * step}
      height={SIZE * step}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {pixelRuns(PIXELS).map((run) => (
        <rect
          key={`${run.x}-${run.y}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          fill={run.symbol === "O" ? "var(--color-ink)" : color}
        />
      ))}
    </svg>
  );
}
