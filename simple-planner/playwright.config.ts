import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

// E2E runs against a production build backed by PGlite in a throwaway
// directory, so the suite needs no network, no Vercel account, and no shared
// database — and exercises the second backing implementation of the storage
// seam end to end.
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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port " + PORT,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DB_DRIVER: "pglite",
      PGLITE_DATA_DIR: ".pglite/e2e",
      DATABASE_URL: "pglite://.pglite/e2e",
    },
  },
});
