/**
 * Playwright E2E 测试配置。
 * 通过 http://localhost 走 gateway 完整链路。
 * globalSetup 负责登录并保存 storageState。
 */

import { defineConfig } from "@playwright/test"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  retries: 1,
  workers: 2,
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost",
    locale: "zh-CN",
    storageState: AUTH_FILE,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
