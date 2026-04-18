/**
 * Playwright E2E 测试配置。
 * 7 个 worker 并行启动,靠任务前置条件自然协调。
 */

import { defineConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

/* 加载 env 文件 */
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2]
    }
  }
}
const envFile = process.env.TEST_ENV === "production"
  ? "../../env/production.env"
  : "../../env/backend.env"
loadEnvFile(path.resolve(__dirname, envFile))

const isRemote = !!process.env.BASE_URL

export default defineConfig({
  testDir: ".",
  testMatch: "runner.spec.ts",
  timeout: isRemote ? 660_000 : 630_000,
  retries: 0,
  workers: 7,
  fullyParallel: false,
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  expect: {
    timeout: isRemote ? 15_000 : 15_000,
  },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost",
    locale: "zh-CN",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    actionTimeout: isRemote ? 30_000 : 30_000,
    navigationTimeout: isRemote ? 60_000 : 60_000,
    launchOptions: {
      args: [
        "--disable-gpu",              // 禁用 GPU 渲染，减少内存
        "--disable-dev-shm-usage",    // 不用 /dev/shm，避免 WSL 共享内存不足
        "--no-sandbox",               // 容器/WSL 环境兼容
        "--disable-extensions",       // 禁用扩展
        "--disable-background-timer-throttling", // 后台 tab 不节流
      ],
    },
  },
  projects: [
    { name: "w1-superuser", testMatch: "runner.spec.ts" },
    { name: "w2-student", testMatch: "runner.spec.ts" },
    { name: "w3-advisor", testMatch: "runner.spec.ts" },
    { name: "w4-visitor", testMatch: "runner.spec.ts" },
    { name: "w5-content-admin", testMatch: "runner.spec.ts" },
    { name: "w6-support", testMatch: "runner.spec.ts" },
    { name: "w7-breaker", testMatch: "runner.spec.ts" },
  ],
})
