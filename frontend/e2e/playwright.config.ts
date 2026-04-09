/**
 * Playwright E2E 测试配置。
 * 通过 http://localhost 走 gateway 完整链路。
 */

import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
