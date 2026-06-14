import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3005",
    headless: true,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
