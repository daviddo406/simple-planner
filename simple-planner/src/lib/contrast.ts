/**
 * WCAG relative luminance and contrast ratio.
 *
 * Two suites need this — `slimes.test.ts` holds every accent to 4.5:1 against
 * its ground, and `theme.test.ts` holds both ink ramps to their budgets — and
 * a palette guard that each suite implements for itself is a guard that can
 * drift. Like `storage/blob.ts`, this module is deliberately imported only
 * from where it is needed rather than wired into a render path.
 */
export function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrast(a: string, b: string): number {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
