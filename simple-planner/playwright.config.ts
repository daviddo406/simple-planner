import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E runs against a *production build* backed by PGlite in a throwaway
 * directory, so the suite needs no network, no Vercel account, and no shared
 * database — and the app is exercised end to end on a second Postgres backend
 * before it ever ships, which is the portability claim being tested rather
 * than asserted.
 *
 * Pixel snapshots are gated behind `PLAYWRIGHT_SNAPSHOTS=1`. A font-rendering
 * difference between a developer's machine and CI makes them flap, so they are
 * meant to run only in the pinned Playwright container image below:
 *
 *   docker run --rm -v "$PWD":/w -w /w -e PLAYWRIGHT_SNAPSHOTS=1 \
 *     mcr.microsoft.com/playwright:v1.62.1-noble \
 *     npx playwright test --update-snapshots
 *
 * Everything the snapshot is *for* — catching a stray rounded corner or a
 * blurred shadow — is also asserted deterministically from computed styles in
 * `planner.spec.ts`, which runs everywhere.
 */
export const SNAPSHOTS_ENABLED = process.env.PLAYWRIGHT_SNAPSHOTS === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The data directory is thrown away first, so a run never inherits the
    // previous run's tasks.
    command: `rm -rf .pglite/e2e && npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DB_DRIVER: "pglite",
      PGLITE_DATA_DIR: ".pglite/e2e",
      DATABASE_URL: "pglite://.pglite/e2e",
    },
  },
});
