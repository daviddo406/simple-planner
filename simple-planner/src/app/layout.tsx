import type { Metadata } from "next";
import localFont from "next/font/local";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${departureMono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
