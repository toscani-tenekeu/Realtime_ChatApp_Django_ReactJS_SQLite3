import { defineConfig, devices } from "@playwright/test";

const frontendUrl = "http://127.0.0.1:4174";
const apiUrl = "http://127.0.0.1:8001/api";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 960 },
  },
  webServer: [
    {
      command: "python backend/manage.py runserver 127.0.0.1:8001 --noreload",
      url: "http://127.0.0.1:8001/api/health/",
      reuseExistingServer: true,
      env: {
        ...process.env,
        FRONTEND_URL: frontendUrl,
        FRONTEND_URLS: `${frontendUrl},http://localhost:4174`,
      },
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4174",
      url: frontendUrl,
      reuseExistingServer: true,
      env: {
        ...process.env,
        VITE_API_URL: apiUrl,
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
});
