import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against `next dev` — NOT `wrangler dev`: workerd crashes on Windows
 * when the repo path contains diacritics ("Mắt Việt HR"). `next dev` still
 * gets the D1/R2 bindings via initOpenNextCloudflareForDev (next.config.ts),
 * backed by the same .wrangler/state local D1 that `npm run db:migrate:local`
 * writes.
 *
 * Auth + fixtures come from e2e/global-setup.ts (runs after the web server is
 * up): a deterministic e2e admin upserted straight into local D1, plus the
 * demo-seed fixtures when ALLOW_DEMO_SEED permits.
 */
export default defineConfig({
  testDir: "./e2e",
  // Dev-server rendering is slow even warmed — budgets sized for that, not
  // for production speed.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  // next dev on one machine can't serve many parallel first-renders.
  workers: 2,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
  },
  projects: [
    // Logs in once and stashes the cookie — keeps the whole run inside the
    // 5-per-15min sign-in rate limit.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
    // The store-floor manager + every real candidate: 390×844. Login-flow
    // specs run desktop-only (each one spends real sign-in budget).
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
