/**
 * 通用测试入口。
 * 7 个 project 共享,根据 project name 加载对应的任务队列。
 */

import { test } from "@playwright/test"
import { TaskRunner } from "./framework/runner"
import type { Task } from "./framework/types"

/** 根据 project name 加载任务。 */
function loadTasks(projectName: string): Task[] {
  const workerMap: Record<string, string> = {
    "w1-superuser": "w1",
    "w2-student": "w2",
    "w3-advisor": "w3",
    "w4-visitor": "w4",
    "w5-content-admin": "w5",
    "w6-support": "w6",
    "w7-breaker": "w7",
  }
  const worker = workerMap[projectName]
  if (!worker) throw new Error(`未知的 project: ${projectName}`)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(`./${worker}/tasks`)
  return mod.tasks as Task[]
}

test("run task queue", async ({ page }, testInfo) => {
  const projectName = testInfo.project.name
  const tasks = loadTasks(projectName)
  const workerName = projectName.split("-")[0]

  const runner = new TaskRunner(tasks, workerName, page)
  const results = await runner.run()

  // 输出本 worker 结果
  const pass = results.filter((r) => r.status === "pass").length
  const fail = results.filter((r) => r.status === "fail").length
  const breaker = results.filter((r) => r.status === "breaker").length
  const timeout = results.filter((r) => r.status === "timeout").length

  console.log(`[${projectName}] ${pass} pass / ${fail} fail / ${breaker} breaker / ${timeout} timeout`)

  // 有任何失败则让 Playwright 报告失败
  const failures = results.filter((r) => r.status === "fail" || r.status === "breaker" || r.status === "timeout")
  if (failures.length > 0) {
    const details = failures.map((r) => {
      const reason = r.error || r.cause || r.status
      return `  ✗ ${r.task.id} (${r.task.name}) — ${reason}`
    }).join("\n")
    throw new Error(`${failures.length} 个任务失败:\n${details}`)
  }
})
