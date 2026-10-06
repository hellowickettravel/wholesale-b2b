import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against a production build and the local Supabase stack.
 *   npm run db:start && npm run db:reset && npm run build && npm run test:e2e
 * Port 3000 matches the Supabase site_url used in auth email links.
 * Uses the preinstalled Chromium (never run `playwright install`, see MEMORY.md).
 */
const executablePath = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    // Collapse all motion so axe and the assertions never sample a screen mid-animation.
    reducedMotion: "reduce",
    launchOptions: { executablePath },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } }],
  webServer: {
    command: "npm run start -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
