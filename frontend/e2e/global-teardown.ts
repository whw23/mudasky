/**
 * 全局清理。
 * 汇总结果 + 覆盖率报告 + 清理 E2E 数据。
 */

import * as fs from "fs"
import * as path from "path"
import { getAllSignals, closeDb } from "./framework/signal"
import { calculateCoverage, printCoverageReport, saveCoverageReport } from "./framework/coverage"
import { cleanupE2EData } from "./framework/db-cleanup"
import { E2E_RUNTIME_DIR } from "./constants"

export default async function globalTeardown(): Promise<void> {
  const signals = getAllSignals()

  // 1. 汇总结果 → last-run.json（LAST_NOT_PASS 通过 test-results/latest/ 软链接读取）
  const summary: Record<string, string> = {}
  for (const [taskId, signal] of Object.entries(signals)) {
    summary[taskId] = signal.status
  }
  const summaryJSON = JSON.stringify(summary, null, 2)
  fs.mkdirSync(E2E_RUNTIME_DIR, { recursive: true })
  fs.writeFileSync(path.join(E2E_RUNTIME_DIR, "last-run.json"), summaryJSON)

  // 2. 统计
  const statuses = Object.values(signals).map((s) => s.status)
  const pass = statuses.filter((s) => s === "pass").length
  const fail = statuses.filter((s) => s === "fail").length
  const breaker = statuses.filter((s) => s === "breaker").length
  const timeout = statuses.filter((s) => s === "timeout").length
  const total = statuses.length

  console.log(`\n[Test Results] ${pass} pass / ${fail} fail / ${breaker} breaker / ${timeout} timeout (total: ${total})`)

  // 打印失败详情
  if (fail > 0) {
    console.log("\nFailed:")
    for (const [taskId, signal] of Object.entries(signals)) {
      if (signal.status === "fail") {
        console.log(`  ✗ ${taskId} — ${signal.error || "unknown"}`)
      }
    }
  }
  if (breaker > 0) {
    console.log("\nBreaker:")
    for (const [taskId, signal] of Object.entries(signals)) {
      if (signal.status === "breaker") {
        console.log(`  ⊘ ${taskId} — ${signal.cause || "unknown"}`)
      }
    }
  }

  // 3. 覆盖率报告
  const report = calculateCoverage()
  printCoverageReport(report)
  saveCoverageReport(report)

  // 4. 清理 E2E 数据
  try {
    await cleanupE2EData()
    console.log("[Teardown] E2E 数据清理完成（pg 直连）")
  } catch (e) {
    console.warn("[Teardown] E2E 数据清理失败:", e)
  }

  // 5. 关闭数据库连接
  closeDb()
}
