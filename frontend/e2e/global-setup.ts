/**
 * 全局初始化。
 * 清理信号/熔断文件,处理 LAST_NOT_PASS 逻辑。
 */

import * as fs from "fs"
import * as path from "path"
import { cleanupSignals, ensureSignalDir, writeSignal } from "./framework/signal"

export default async function globalSetup(): Promise<void> {
  // 0. 生成共享 TS（所有 worker 通过文件读取同一个值）
  const tsFile = path.join(__dirname, ".e2e-ts")
  fs.writeFileSync(tsFile, Date.now().toString().slice(-6))

  // 1. 清理信号文件
  cleanupSignals()
  ensureSignalDir()

  // 2. 清理 E2E 测试用户（通过 psql 直接删除，最可靠）
  try {
    const { execSync } = require("child_process")
    const cwd = path.join(__dirname, "../..")
    const psql = (sql: string) =>
      execSync(`docker compose exec -T db psql -U mudasky -c "${sql}"`, { cwd, stdio: "pipe", timeout: 10_000 })

    // 清理非种子用户（只保留有用户名且非 E2E 开头的种子用户）
    psql("DELETE FROM \\\"user\\\" WHERE username IS NULL OR username = '' OR username LIKE 'E2E%';")
    // 清理测试角色
    psql("DELETE FROM role WHERE name LIKE 'E2E%' OR name LIKE '成功%';")
    // 清理测试分类
    psql("DELETE FROM category WHERE slug LIKE 'e2e-%';")
    // 清理测试文章
    psql("DELETE FROM article WHERE title LIKE 'E2E%';")
    // 清理测试案例
    psql("DELETE FROM success_case WHERE student_name LIKE 'E2E%';")
    // 清理测试院校
    psql("DELETE FROM university WHERE name LIKE 'E2E%';")
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
