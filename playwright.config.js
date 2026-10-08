import { defineConfig, devices } from "@playwright/test";

// PORT picks another port when 4173 is busy (tests/serve.mjs reads it too).
const port = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: "tests",
  // Browser tests only; tests/*.test.mjs run under Node's own test runner (npm run test:scripts).
  testMatch: "*.spec.js",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node tests/serve.mjs",
      url: `http://localhost:${port}/pecks.html`,
      env: { PORT: String(port) },
      reuseExistingServer: !process.env.CI,
    },
    // A stand-in for the Discord app, for tests/discord-client.spec.js. Always port 3333: Discord's SDK
    // only accepts messages from Discord's own addresses, and http://localhost:3333 is one of them.
    { command: "node tests/discord-host.mjs", url: "http://localhost:3333/", reuseExistingServer: !process.env.CI },
  ],
});
