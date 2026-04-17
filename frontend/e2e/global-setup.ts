/**
 * 全局初始化。
 * 清理信号/熔断文件,处理 LAST_NOT_PASS 逻辑。
 */

import * as fs from "fs"
import * as path from "path"
import { cleanupSignals, ensureSignalDir, writeSignal } from "./framework/signal"

export default async function globalSetup(): Promise<void> {
  // 1. 清理信号文件
  cleanupSignals()
  ensureSignalDir()

  // 2. 清理可能残留的 W7 禁用用户（确保注册不会遇到"用户已被禁用"）
  try {
    const { PHONES } = require("./constants")
    const baseURL = process.env.BASE_URL || "http://localhost"
    const internalSecret = process.env.INTERNAL_SECRET || ""
    if (internalSecret) {
      const { chromium } = require("@playwright/test")
      const browser = await chromium.launch()
      const context = await browser.newContext()
      await context.addCookies([
        { name: "internal_secret", value: internalSecret, url: new URL(baseURL).origin },
      ])
      const page = await context.newPage()
      // 登录 superuser
      const loginUser = process.env.SEED_USER_E2E_USERNAME
      const loginPass = process.env.SEED_USER_E2E_PASSWORD
      if (loginUser && loginPass) {
        await page.request.post(`${baseURL}/api/auth/login`, {
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          data: { username: loginUser, encrypted_password: loginPass },
        }).catch(() => {})
        // 删除所有 E2E 固定手机号用户（确保干净环境）
        for (const phone of Object.values(PHONES)) {
          const res = await page.request.get(
            `${baseURL}/api/admin/users/list?keyword=${encodeURIComponent(phone as string)}`,
            { headers: { "X-Requested-With": "XMLHttpRequest" } },
          ).catch(() => null)
          if (res?.ok()) {
            const data = await res.json().catch(() => ({}))
            const items = Array.isArray(data) ? data : (data.items ?? [])
            for (const user of items) {
              await page.request.post(`${baseURL}/api/admin/users/list/detail/delete`, {
                headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
                data: { user_id: user.id },
              }).catch(() => {})
            }
          }
        }
      }
      await browser.close()
    }
  } catch { /* 清理失败不阻塞测试 */ }

  // 3. LAST_NOT_PASS 模式:为已通过的任务预写 pass 信号
  if (process.env.LAST_NOT_PASS === "1") {
    const lastRunPath = path.join(__dirname, ".last-run.json")
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
}
