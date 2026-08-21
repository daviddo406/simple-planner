import { SLIMES, type SlimeId } from "@/lib/slimes";

/**
 * The sprite, hand-authored on a 16x14 pixel grid and emitted as inline SVG
 * rather than a PNG sprite sheet, for three reasons: it recolors from tokens,
 * so a thirteenth slime is three values instead of a new asset and a new
 * sheet offset; integer-coordinate rects stay crisp at fractional device pixel
 * ratios, sidestepping the 1.5x hazard raster assets have; and hand-authored
 * art ships without tracing the provenance of a stock sheet.
 *
 * A Server Component — no JS ships for it.
 */
const PIXELS = [
  ".....######.....",
  "...##HHHHOO##...",
  "..#HHHHOOOOOO#..",
  ".#HHHOOOOOOOOO#.",
  "#HHOOOOOOOOOOOO#",
  "#HOO##OOOO##OOO#",
  "#OOO##OOOO##OOO#",
  "#OOOOOOOOOOOOOO#",
  "#OOO#OOOOOO#OOO#",
  "#OOOO######OOOO#",
  "#OOOOOOOOOOOOOO#",
  "#SSSSSSSSSSSSSS#",
  "#SSSSSSSSSSSSSS#",
  "################",
] as const;

const WIDTH = 16;
const HEIGHT = 14;

export function Slime({
  id,
  scale = 1,
  className,
}: {
  id: SlimeId;
  /** Integer only. The sprite is crisp at 1x and 2x and nowhere between. */
  scale?: number;
  className?: string;
}) {
  const variant = SLIMES[id];
  const fills: Record<string, string> = {
    "#": "var(--color-ink)",
    O: variant.base,
    H: variant.highlight,
    S: variant.shade,
  };

  // One rect per horizontal run rather than one per pixel: same picture, a
  // fraction of the nodes, and every coordinate still an integer.
  const rects: { x: number; y: number; width: number; fill: string }[] = [];
  PIXELS.forEach((row, y) => {
    let x = 0;
    while (x < WIDTH) {
      const symbol = row[x];
      let run = 1;
      while (x + run < WIDTH && row[x + run] === symbol) run++;
      if (symbol !== ".") {
        rects.push({ x, y, width: run, fill: fills[symbol] });
      }
      x += run;
    }
  });

  return (
    <svg
      // Mandatory. Browsers antialias SVG rect edges by default, and without
      // this the sprite renders with soft grey fringes — the exact softness
      // `image-rendering: pixelated` exists to prevent on the raster side,
      // arriving through the back door.
      shapeRendering="crispEdges"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * Math.trunc(scale)}
      height={HEIGHT * Math.trunc(scale)}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  );
}
