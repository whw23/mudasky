/**
 * Playwright E2E 测试配置。
 * 三阶段执行：register → setup → main tests。
 * 通过 project dependencies 保证执行顺序。
 */

import { defineConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

/* 自动加载 env/backend.env（SEED_USER_E2E_*、INTERNAL_SECRET） */
const envPath = path.resolve(__dirname, "../../env/backend.env")
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]
    }
  }
}

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
    /* ── 阶段 1：注册（W2/W3/W4 并行，无 auth） ── */
    {
      name: "w2-register",
      testMatch: "w2/01-register.spec.ts",
    },
    {
      name: "w3-register",
      testMatch: "w3/01-register.spec.ts",
    },
    {
      name: "w4-register",
      testMatch: "w4/01-register.spec.ts",
    },

    /* ── 阶段 2：赋权 + 种子数据（W1，依赖注册完成） ── */
    {
      name: "w1-setup",
      testMatch: "w1/01-setup.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w1.json") },
      dependencies: ["w2-register", "w3-register", "w4-register"],
    },

    /* ── 阶段 3：主测试（依赖 setup 完成） ── */
    {
      name: "w1-superuser",
      testMatch: "w1/0[2-9]-*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w1.json") },
      dependencies: ["w1-setup"],
    },
    {
      name: "w2-student",
      testMatch: "w2/0[2-9]-*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w2.json") },
      dependencies: ["w1-setup"],
    },
    {
      name: "w3-advisor",
      testMatch: "w3/0[2-9]-*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w3.json") },
      dependencies: ["w1-setup"],
    },
    {
      name: "w4-visitor",
      testMatch: "w4/0[2-9]-*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w4.json") },
      dependencies: ["w1-setup"],
    },
    {
      name: "shared",
      testMatch: "shared/**/*.spec.ts",
      dependencies: ["w1-setup"],
    },
  ],
})
