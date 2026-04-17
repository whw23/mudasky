/**
 * 全局清理。
 * 汇总结果 + 覆盖率报告 + 清理 E2E 数据。
 */

import * as fs from "fs"
import * as path from "path"
import { chromium } from "@playwright/test"
import { getAllSignals, cleanupSignals } from "./framework/signal"
import { calculateCoverage, printCoverageReport } from "./framework/coverage"

export default async function globalTeardown(): Promise<void> {
  const signals = getAllSignals()

  // 1. 汇总结果 → .last-run.json
  const summary: Record<string, string> = {}
  for (const [taskId, signal] of Object.entries(signals)) {
    summary[taskId] = signal.status
  }
  fs.writeFileSync(
    path.join(__dirname, ".last-run.json"),
    JSON.stringify(summary, null, 2),
  )

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

  // 4. 清理 E2E 数据
  await cleanupE2EData()

  // 5. 清理信号文件
  cleanupSignals()
}

/** 清理 E2E 测试数据。 */
async function cleanupE2EData(): Promise<void> {
  const baseURL = process.env.BASE_URL || "http://localhost"
  const internalSecret = process.env.INTERNAL_SECRET || ""

  const browser = await chromium.launch()
  const context = await browser.newContext()

  if (internalSecret) {
    const url = new URL(baseURL)
    await context.addCookies([
      { name: "internal_secret", value: internalSecret, url: url.origin },
    ])
  }

  const page = await context.newPage()
  const headers = { "X-Requested-With": "XMLHttpRequest" }

  // 登录 superuser (用于清理数据)
  const loginUser = process.env.SEED_USER_E2E_USERNAME
  const loginPass = process.env.SEED_USER_E2E_PASSWORD
  if (loginUser && loginPass) {
    try {
      await page.request.post(`${baseURL}/api/auth/login`, {
        headers: { ...headers, "Content-Type": "application/json" },
        data: { username: loginUser, encrypted_password: loginPass },
      })
    } catch { /* 登录失败则跳过清理 */ }
  }

  // 清理各类 E2E 数据
  const cleanups = [
    { listPath: "roles/meta/list", deletePath: "roles/meta/list/detail/delete", nameField: "name", idField: "role_id" },
    { listPath: "categories/list", deletePath: "categories/list/detail/delete", nameField: "name", idField: "category_id" },
    { listPath: "cases/list", deletePath: "cases/list/detail/delete", nameField: "student_name", idField: "case_id" },
    { listPath: "universities/list", deletePath: "universities/list/detail/delete", nameField: "name", idField: "university_id" },
    { listPath: "articles/list", deletePath: "articles/list/detail/delete", nameField: "title", idField: "article_id" },
  ]

  for (const { listPath, deletePath, nameField, idField } of cleanups) {
    try {
      const res = await page.request.get(`${baseURL}/api/admin/${listPath}`, { headers })
      if (res.ok()) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items ?? [])
        for (const item of items) {
          const name = typeof item[nameField] === "object"
            ? item[nameField]?.zh || ""
            : String(item[nameField] || "")
          if (name.startsWith("E2E")) {
            await page.request.post(`${baseURL}/api/admin/${deletePath}`, {
              headers: { ...headers, "Content-Type": "application/json" },
              data: { [idField]: item.id },
            })
          }
        }
      }
    } catch { /* skip */ }
  }

  // 清理 E2E 用户 (W2-W7 注册的账号)
  try {
    const res = await page.request.get(`${baseURL}/api/admin/users/list?keyword=E2E`, { headers })
    if (res.ok()) {
      const data = await res.json()
      const items = Array.isArray(data) ? data : (data.items ?? [])
      for (const user of items) {
        if (String(user.username || "").startsWith("E2E")) {
          await page.request.post(`${baseURL}/api/admin/users/list/detail/delete`, {
            headers: { ...headers, "Content-Type": "application/json" },
            data: { user_id: user.id },
          })
        }
      }
    }
  } catch { /* skip */ }

  await browser.close()
}
