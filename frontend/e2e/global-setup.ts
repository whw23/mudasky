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

  // 2. LAST_NOT_PASS 模式:为已通过的任务预写 pass 信号
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

      // 收集未通过的任务
      const notPass = new Set<string>()
      for (const [taskId, status] of Object.entries(lastRun)) {
        if (status !== "pass") notPass.add(taskId)
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
