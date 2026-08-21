import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSlime, getTheme } from "@/db/queries";
import { SLIMES } from "@/lib/slimes";
import "./globals.css";

/*
 * Both faces are vendored as .woff2 alongside their OFL licences and loaded
 * with `next/font/local` rather than `next/font/google`, which fetches at
 * build time and would break the offline build this repo has. Self-hosting
 * also emits `size-adjust` metrics, so there is no FOUT jump and no network
 * request at runtime.
 */
const silkscreen = localFont({
  src: "./fonts/Silkscreen-Regular.woff2",
  variable: "--font-silkscreen",
  display: "block",
  weight: "400",
});

const departureMono = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
  display: "block",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Weekly Planner",
  description: "A weekly planner shaped like a paper planner, rasterized.",
};

/**
 * The stored theme is read here rather than in the page, because the ramp
 * hangs off `<html>` and this is the only component that owns it.
 *
 * Rendering the attribute on the server is the whole point: the alternative —
 * reading `localStorage` after mount — cannot run before the first paint, so
 * every load starts on the wrong ramp and corrects itself visibly. There is no
 * blocking inline script here for the same reason there is no `localStorage`;
 * the preference is already in the database this page was rendered from.
 *
 * "system" writes no attribute at all, which leaves `prefers-color-scheme` in
 * charge — see the two ramp blocks in `globals.css`.
 *
 * The chosen slime's two accents are published here for the same reason, and
 * it is a stricter one than tidiness: `--color-accent` is declared on `:root`,
 * so its `var(--accent-day)` is substituted using the custom properties of
 * *that* element. Published any lower — on `<main>`, say — the pair would be
 * inherited by the subtree while the token that reads it had already resolved
 * against the fallback pair, and the accent would silently stop following the
 * picker.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [theme, slime] = await Promise.all([getTheme(), getSlime()]);

  return (
    <html
      lang="en"
      data-theme={theme === "system" ? undefined : theme}
      style={
        {
          "--accent-day": SLIMES[slime].shade,
          "--accent-night": SLIMES[slime].night,
        } as React.CSSProperties
      }
      className={`${silkscreen.variable} ${departureMono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
