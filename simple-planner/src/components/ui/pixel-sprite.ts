/**
 * The one bit of machinery both hand-authored sprites share: turning rows of
 * symbols into SVG rects.
 *
 * One rect per *horizontal run* rather than one per pixel — the same picture
 * with a fraction of the nodes, and every coordinate still an integer, which
 * is what keeps the art crisp at fractional device pixel ratios. `.` is
 * transparent and emits nothing.
 */
export interface PixelRun {
  x: number;
  y: number;
  width: number;
  symbol: string;
}

export function pixelRuns(rows: readonly string[]): PixelRun[] {
  const width = rows[0].length;
  const runs: PixelRun[] = [];

  rows.forEach((row, y) => {
    let x = 0;
    while (x < width) {
      const symbol = row[x];
      let run = 1;
      while (x + run < width && row[x + run] === symbol) run++;
      if (symbol !== ".") runs.push({ x, y, width: run, symbol });
      x += run;
    }
  });

  return runs;
}
