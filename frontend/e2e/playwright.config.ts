/**
 * Playwright E2E 测试配置。
 * 4 个 project 对应 4 个 worker 角色，通过信号协调执行顺序。
 */

import { defineConfig } from "@playwright/test"
import * as path from "path"

const isRemote = !!process.env.BASE_URL
const AUTH_DIR = path.join(__dirname, ".auth")

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: isRemote ? 60_000 : 30_000,
  retries: 0,
  workers: 4,
  fullyParallel: false,
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  expect: {
    timeout: isRemote ? 15_000 : 10_000,
  },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost",
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    actionTimeout: isRemote ? 15_000 : 10_000,
    navigationTimeout: isRemote ? 30_000 : 20_000,
  },
  projects: [
    {
      name: "w1-superuser",
      testMatch: "w1/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w1.json") },
    },
    {
      name: "w2-student",
      testMatch: "w2/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w2.json") },
    },
    {
      name: "w3-advisor",
      testMatch: "w3/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w3.json") },
    },
    {
      name: "w4-visitor",
      testMatch: "w4/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w4.json") },
    },
    {
      name: "shared",
      testMatch: "shared/**/*.spec.ts",
    },
  ],
})
