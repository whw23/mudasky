/**
 * 全局初始化。
 * 清理信号/熔断文件,处理 LAST_NOT_PASS 逻辑。
 */

import * as fs from "fs"
import * as path from "path"
import { chromium } from "@playwright/test"
import { cleanupSignals, ensureSignalDir, writeSignal } from "./framework/signal"
import { E2E_RUNTIME_DIR, getAuthFile } from "./constants"
import { cleanupE2EData } from "./framework/db-cleanup"

/** 所有需要预热的页面路由 */
const WARMUP_ROUTES = [
  // 公开页面
  "/", "/universities", "/study-abroad", "/requirements",
  "/cases", "/visa", "/life", "/news", "/about",
  // admin 面板
  "/admin/dashboard", "/admin/users", "/admin/students",
  "/admin/contacts", "/admin/roles",
  "/admin/general-settings", "/admin/web-settings",
  // portal 面板
  "/portal/overview", "/portal/profile", "/portal/documents",
]

export default async function globalSetup(): Promise<void> {
  // 0. 生成共享 TS（所有 worker 通过文件读取同一个值）
  fs.mkdirSync(E2E_RUNTIME_DIR, { recursive: true })
  const tsFile = path.join(E2E_RUNTIME_DIR, "e2e-ts")
  fs.writeFileSync(tsFile, Date.now().toString().slice(-6))

  // 1. 清理信号文件
  cleanupSignals()
  ensureSignalDir()

  // 2. 清理 E2E 测试数据（通过 pg 直连）
  try {
    await cleanupE2EData()
    console.log("[Setup] E2E 数据清理完成（pg 直连）")
  } catch (e) {
    console.warn("[Setup] E2E 数据清理失败（继续执行）:", e)
  }

  // 3. LAST_NOT_PASS 模式:为已通过的任务预写 pass 信号
  if (process.env.LAST_NOT_PASS === "1") {
    const lastRunPath = path.resolve(__dirname, "../../test-results/latest/e2e-runtime/last-run.json")
    if (fs.existsSync(lastRunPath)) {
      const lastRun = JSON.parse(fs.readFileSync(lastRunPath, "utf-8")) as Record<string, string>

      // 加载所有任务定义
      const allTasks: Array<{ id: string; requires: string[] }> = []
      for (let i = 1; i <= 7; i++) {
        try {
          const mod = require(`./w${i}/tasks`)
          allTasks.push(...(mod.tasks || []).map((t: { id: string; requires: string[] }) => ({
            id: t.id,
            requires: t.requires,
          })))
        } catch { /* skip */ }
      }

      // 收集未通过的任务 + 运行时状态任务（set_cookie/register 等不能缓存）
      const notPass = new Set<string>()
      for (const [taskId, status] of Object.entries(lastRun)) {
        if (status !== "pass") notPass.add(taskId)
      }
      // 标记所有 set_cookie 和 register 任务为 not-pass（它们设置运行时状态，不能缓存）
      for (const [taskId] of Object.entries(lastRun)) {
        if (taskId.includes("set_cookie") || taskId.includes("register") || taskId.includes("reload_auth")) {
          notPass.add(taskId)
        }
      }

      // 递归收集依赖链
      function addDeps(taskId: string): void {
        const task = allTasks.find((t) => t.id === taskId)
        if (!task) return
        for (const req of task.requires) {
          notPass.add(req)
          addDeps(req)
        }
      }
      for (const taskId of [...notPass]) addDeps(taskId)

      // 为已通过且不在依赖链中的任务预写 pass 信号
      for (const [taskId, status] of Object.entries(lastRun)) {
        if (status === "pass" && !notPass.has(taskId)) {
          writeSignal(taskId, "pass", { worker: "cached" })
        }
      }
    }
  }

  // 4. 预热：W1 登录后遍历所有页面，让 Next.js 编译缓存 JS bundle
  const baseURL = process.env.BASE_URL || "http://localhost"
  const internalSecret = process.env.INTERNAL_SECRET || ""
  const username = process.env.SEED_USER_1_USERNAME || "admin"
  const password = process.env.SEED_USER_1_PASSWORD || "Admin123!"

  const browser = await chromium.launch({
    args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
  })
  const context = await browser.newContext({ baseURL })

  try {
    // 设置 internal_secret cookie
    if (internalSecret) {
      const url = new URL(baseURL)
      await context.addCookies([
        { name: "internal_secret", value: internalSecret, url: url.origin },
      ])
    }

    const page = await context.newPage()

    // W1 账号密码登录
    await page.goto("/", { timeout: 60_000 })
    const loginBtn = page.getByRole("button", { name: /登录|注册/ })
    const logoutBtn = page.getByRole("button", { name: "退出" })
    await loginBtn.or(logoutBtn).first().waitFor({ state: "visible", timeout: 60_000 })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await loginBtn.waitFor({ state: "visible", timeout: 30_000 })
    }
    await loginBtn.click()
    await page.getByRole("dialog").waitFor({ state: "visible" })
    await page.getByRole("tab", { name: /账号|密码/ }).click()
    await page.getByPlaceholder("用户名或手机号").fill(username)
    await page.getByPlaceholder("请输入密码").fill(password)
    await page.getByRole("button", { name: /^登录$/ }).click()
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 15_000 })

    // 遍历所有页面预热（不关心内容，只要 Next.js 编译缓存）
    for (const route of WARMUP_ROUTES) {
      try {
        await page.goto(route, { timeout: 30_000, waitUntil: "domcontentloaded" })
      } catch {
        // 预热失败不阻塞（如权限不足被 302 也算预热成功）
      }
    }

    await page.close()
  } catch (err) {
    console.warn("[global-setup] 预热失败:", (err as Error).message)
  } finally {
    await context.close()
    await browser.close()
  }
}
