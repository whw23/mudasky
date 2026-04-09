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
  timeout: 120_000,
  retries: 1,
  workers: 1,
  globalSetup: "./global-setup.ts",
  use: {
    baseURL: "http://localhost",
    locale: "zh-CN",
    storageState: AUTH_FILE,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
