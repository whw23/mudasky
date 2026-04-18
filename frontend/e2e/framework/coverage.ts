/**
 * 覆盖率计算。
 * 从任务定义的 coverage 声明汇总，和实际收集数据对比。
 */

import type { Task } from "./types"
import { getAllSignals } from "./signal"

/** 加载所有 worker 的任务。 */
function loadAllTasks(): Task[] {
  const all: Task[] = []
  for (let i = 1; i <= 7; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`../w${i}/tasks`)
      all.push(...(mod.tasks || []))
    } catch { /* skip */ }
  }
  return all
}

/** 覆盖率报告。 */
export interface CoverageReport {
  api: { covered: string[]; total: string[]; percent: number }
  routes: { covered: string[]; total: string[]; percent: number }
  components: { covered: [string, string][]; total: [string, string][]; percent: number }
  security: { covered: [string, string][]; total: [string, string][]; percent: number }
}

/** 计算覆盖率。 */
export function calculateCoverage(): CoverageReport {
  const allTasks = loadAllTasks()
  const signals = getAllSignals()

  const totalApi = new Set<string>()
  const totalRoutes = new Set<string>()
  const totalComponents: [string, string][] = []
  const totalSecurity: [string, string][] = []

  const coveredApi = new Set<string>()
  const coveredRoutes = new Set<string>()
  const coveredComponents: [string, string][] = []
  const coveredSecurity: [string, string][] = []

  for (const task of allTasks) {
    const cov = task.coverage
    if (!cov) continue

    cov.api?.forEach((a) => totalApi.add(a))
    cov.routes?.forEach((r) => totalRoutes.add(r))
    cov.components?.forEach((c) => totalComponents.push(c))
    cov.security?.forEach((s) => totalSecurity.push(s))

    const signal = signals[task.id]
    if (signal?.status === "pass") {
      cov.api?.forEach((a) => coveredApi.add(a))
      cov.routes?.forEach((r) => coveredRoutes.add(r))
      cov.components?.forEach((c) => coveredComponents.push(c))
      cov.security?.forEach((s) => coveredSecurity.push(s))
    }
  }

  const pct = (a: number, b: number) => (b === 0 ? 100 : Math.round((a / b) * 1000) / 10)

  return {
    api: {
      covered: [...coveredApi],
      total: [...totalApi],
      percent: pct(coveredApi.size, totalApi.size),
    },
    routes: {
      covered: [...coveredRoutes],
      total: [...totalRoutes],
      percent: pct(coveredRoutes.size, totalRoutes.size),
    },
    components: {
      covered: coveredComponents,
      total: totalComponents,
      percent: pct(coveredComponents.length, totalComponents.length),
    },
    security: {
      covered: coveredSecurity,
      total: totalSecurity,
      percent: pct(coveredSecurity.length, totalSecurity.length),
    },
  }
}

/** 保存覆盖率报告到 JSON 文件。 */
export function saveCoverageReport(report: CoverageReport): void {
  const fs = require("fs")
  const path = require("path")
  const outputDir = process.env.E2E_OUTPUT_DIR
    ? path.resolve(__dirname, "../..", process.env.E2E_OUTPUT_DIR)
    : path.resolve(__dirname, "../../test-results")
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(
    path.join(outputDir, "e2e-coverage.json"),
    JSON.stringify({
      api: { covered: report.api.covered.length, total: report.api.total.length, percent: report.api.percent },
      routes: { covered: report.routes.covered.length, total: report.routes.total.length, percent: report.routes.percent },
      components: { covered: report.components.covered.length, total: report.components.total.length, percent: report.components.percent },
      security: { covered: report.security.covered.length, total: report.security.total.length, percent: report.security.percent },
    }, null, 2),
  )
}

/** 打印覆盖率报告。 */
export function printCoverageReport(report: CoverageReport): void {
  console.log(`\n[API Coverage] ${report.api.covered.length}/${report.api.total.length} (${report.api.percent}%)`)
  if (report.api.covered.length < report.api.total.length) {
    const uncovered = report.api.total.filter((a) => !report.api.covered.includes(a))
    console.log("  Uncovered:")
    uncovered.forEach((a) => console.log(`    - ${a}`))
  }

  console.log(`\n[Route Coverage] ${report.routes.covered.length}/${report.routes.total.length} (${report.routes.percent}%)`)
  if (report.routes.covered.length < report.routes.total.length) {
    const uncovered = report.routes.total.filter((r) => !report.routes.covered.includes(r))
    console.log("  Uncovered:")
    uncovered.forEach((r) => console.log(`    - ${r}`))
  }

  console.log(`\n[Component Coverage] ${report.components.covered.length}/${report.components.total.length} (${report.components.percent}%)`)

  console.log(`\n[Security Coverage] ${report.security.covered.length}/${report.security.total.length} (${report.security.percent}%)`)
}
