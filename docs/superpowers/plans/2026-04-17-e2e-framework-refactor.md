# E2E 测试框架重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 E2E 测试从线性等待的 4 worker 模型重构为 7 worker 任务队列非阻塞调度模型，覆盖全部 6 个角色 + 破坏性测试。

**Architecture:** 每个 worker 维护有序任务列表，循环遍历找前置条件已满足的任务执行。信号文件用 `wx` 原子创建实现抢占锁。所有操作通过 UI，不直接调 API。

**Tech Stack:** Playwright, TypeScript, Node.js fs (wx flag)

**设计文档:** `docs/superpowers/specs/2026-04-17-e2e-framework-refactor-design.md`

---

## 文件结构

### 新建

| 文件 | 职责 |
|------|------|
| `e2e/framework/types.ts` | Task, Signal, TaskResult 类型定义 |
| `e2e/framework/signal.ts` | 信号文件读写（wx 原子创建） |
| `e2e/framework/runner.ts` | 任务队列调度器 |
| `e2e/framework/coverage.ts` | 覆盖率计算脚本 |
| `e2e/runner.spec.ts` | 通用 spec，7 个 project 共享 |
| `e2e/fns/set-cookie.ts` | 设置 internal_secret cookie |
| `e2e/fns/register.ts` | UI 注册流程（W2-W7 共用） |
| `e2e/fns/login.ts` | UI 登录流程（W1） |
| `e2e/fns/logout.ts` | UI 登出流程 |
| `e2e/fns/assign-role.ts` | UI 赋权操作 |
| `e2e/fns/refresh-token.ts` | 刷新 token（赋权后更新 JWT） |
| `e2e/fns/admin-crud.ts` | 管理后台 CRUD（分类/文章/案例/院校） |
| `e2e/fns/role-management.ts` | 角色管理（创建/编辑/删除） |
| `e2e/fns/user-management.ts` | 用户管理（搜索/禁用/配额/密码重置） |
| `e2e/fns/settings.ts` | 设置页面（通用/网页） |
| `e2e/fns/security.ts` | 安全测试（CSRF/XSS/SQL注入/输入验证） |
| `e2e/fns/sidebar-nav.ts` | 侧边栏导航验证 |
| `e2e/fns/profile.ts` | 个人资料管理 |
| `e2e/fns/documents.ts` | 文档上传/管理 |
| `e2e/fns/two-factor.ts` | 双因素认证 |
| `e2e/fns/sessions.ts` | 会话/设备管理 |
| `e2e/fns/permission.ts` | 权限正向/反向验证 |
| `e2e/fns/public-pages.ts` | 公开页面访问 |
| `e2e/fns/public-detail.ts` | 公开详情页 |
| `e2e/fns/search-filter.ts` | 搜索筛选功能 |
| `e2e/fns/jwt-security.ts` | JWT 安全测试 |
| `e2e/fns/idor.ts` | IDOR 安全测试 |
| `e2e/fns/disabled-verify.ts` | 禁用/启用验证 |
| `e2e/fns/auth-flow.ts` | 认证流程（登录弹窗/tab/登出） |
| `e2e/fns/contacts.ts` | 联系人管理 |
| `e2e/fns/students.ts` | 学生管理 |
| `e2e/fns/student-docs.ts` | 学生文档查看 |
| `e2e/w1/tasks.ts` | W1 superuser 任务声明 |
| `e2e/w2/tasks.ts` | W2 student 任务声明 |
| `e2e/w3/tasks.ts` | W3 advisor 任务声明 |
| `e2e/w4/tasks.ts` | W4 visitor 任务声明 |
| `e2e/w5/tasks.ts` | W5 content_admin 任务声明 |
| `e2e/w6/tasks.ts` | W6 support 任务声明 |
| `e2e/w7/tasks.ts` | W7 破坏性测试任务声明 |

### 重写

| 文件 | 说明 |
|------|------|
| `e2e/playwright.config.ts` | 7 project，无 dependencies |
| `e2e/global-setup.ts` | 清理信号/熔断 + LAST_NOT_PASS 逻辑 |
| `e2e/global-teardown.ts` | 结果汇总 + 覆盖率 + 清理数据 |

### 删除

| 文件 | 说明 |
|------|------|
| `e2e/w1/*.spec.ts` | 旧 W1 测试（8 个文件） |
| `e2e/w2/*.spec.ts` | 旧 W2 测试（8 个文件） |
| `e2e/w3/*.spec.ts` | 旧 W3 测试（6 个文件） |
| `e2e/w4/*.spec.ts` | 旧 W4 测试（8 个文件） |
| `e2e/shared/*.spec.ts` | 旧共享测试 |
| `e2e/fixtures/base.ts` | 旧 fixture（逻辑移入 framework/） |
| `e2e/fixtures/coverage.ts` | 旧覆盖率（逻辑移入 framework/） |
| `e2e/helpers/signal.ts` | 旧信号（替换为 framework/signal.ts） |

---

## Task 1: 框架核心 — 类型定义

**Files:**
- Create: `frontend/e2e/framework/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// frontend/e2e/framework/types.ts
/**
 * E2E 任务队列框架类型定义。
 */

import type { Page } from "@playwright/test"

/** 任务执行函数。 */
export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 信号文件状态。 */
export type SignalStatus = "running" | "pass" | "fail" | "breaker" | "timeout"

/** 信号文件内容。 */
export interface Signal {
  status: SignalStatus
  worker?: string
  data?: Record<string, unknown>
  error?: string
  cause?: string
  timestamp: number
}

/** 覆盖率声明。 */
export interface CoverageDecl {
  routes?: string[]
  api?: string[]
  components?: [string, string][]
  security?: [string, string][]
}

/** 任务定义。 */
export interface Task {
  /** 唯一标识，如 "w2_register" */
  id: string
  /** 描述，如 "自注册" */
  name: string
  /** 主 worker，如 "w1" */
  worker: string
  /** 备选 worker 列表（空 = 不可被偷） */
  backupWorkers?: string[]
  /** 前置条件（信号 ID 列表） */
  requires: string[]
  /** 执行函数 */
  fn: TaskFn
  /** 执行参数（传给 fn） */
  fnArgs?: Record<string, unknown>
  /** 覆盖率声明 */
  coverage?: CoverageDecl
}

/** 任务运行时状态。 */
export type TaskStatus = "pending" | "running" | "pass" | "fail" | "breaker" | "timeout"

/** 任务运行时记录。 */
export interface TaskRecord {
  task: Task
  status: TaskStatus
  error?: string
  cause?: string
}

/** 运行结果汇总。 */
export interface RunSummary {
  [taskId: string]: SignalStatus
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/framework/types.ts
git commit -m "feat(e2e): 任务队列框架类型定义"
```

---

## Task 2: 框架核心 — 信号文件

**Files:**
- Create: `frontend/e2e/framework/signal.ts`

- [ ] **Step 1: 创建信号文件模块**

```typescript
// frontend/e2e/framework/signal.ts
/**
 * 信号文件读写。
 * 使用 wx（O_CREAT | O_EXCL）原子创建，防止竞态。
 */

import * as fs from "fs"
import * as path from "path"
import type { Signal, SignalStatus } from "./types"

const SIGNAL_DIR = "/tmp/e2e-signals"

/** 确保信号目录存在。 */
export function ensureSignalDir(): void {
  fs.mkdirSync(SIGNAL_DIR, { recursive: true })
}

/** 清理所有信号文件。 */
export function cleanupSignals(): void {
  if (fs.existsSync(SIGNAL_DIR)) {
    fs.rmSync(SIGNAL_DIR, { recursive: true, force: true })
  }
}

/** 信号文件路径。 */
function signalPath(taskId: string): string {
  return path.join(SIGNAL_DIR, `${taskId}.json`)
}

/**
 * 尝试抢占任务（原子创建信号文件）。
 * 返回 true 表示抢到，false 表示已被其他 worker 抢占。
 */
export function claimTask(taskId: string, worker: string): boolean {
  ensureSignalDir()
  try {
    const signal: Signal = { status: "running", worker, timestamp: Date.now() }
    fs.writeFileSync(signalPath(taskId), JSON.stringify(signal), { flag: "wx" })
    return true
  } catch {
    return false
  }
}

/** 写入任务结果（覆盖 running 状态）。 */
export function writeSignal(
  taskId: string,
  status: SignalStatus,
  opts?: { data?: Record<string, unknown>; error?: string; cause?: string; worker?: string },
): void {
  const signal: Signal = {
    status,
    worker: opts?.worker,
    data: opts?.data,
    error: opts?.error,
    cause: opts?.cause,
    timestamp: Date.now(),
  }
  fs.writeFileSync(signalPath(taskId), JSON.stringify(signal))
}

/** 读取信号文件，不存在返回 null。 */
export function readSignal(taskId: string): Signal | null {
  const p = signalPath(taskId)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return null
  }
}

/**
 * 检查前置条件。
 * 返回 "all_pass" | "any_fail" | "not_ready"。
 */
export function checkRequires(requires: string[]): {
  result: "all_pass" | "any_fail" | "not_ready"
  failedCause?: string
  data?: Record<string, Record<string, unknown>>
} {
  const data: Record<string, Record<string, unknown>> = {}
  for (const req of requires) {
    const signal = readSignal(req)
    if (!signal) return { result: "not_ready" }
    if (signal.status === "fail" || signal.status === "breaker" || signal.status === "timeout") {
      return { result: "any_fail", failedCause: `前置任务 ${req} 失败` }
    }
    if (signal.status === "running") return { result: "not_ready" }
    if (signal.data) data[req] = signal.data
  }
  return { result: "all_pass", data }
}

/** 获取所有信号文件，用于汇总结果。 */
export function getAllSignals(): Record<string, Signal> {
  if (!fs.existsSync(SIGNAL_DIR)) return {}
  const result: Record<string, Signal> = {}
  for (const file of fs.readdirSync(SIGNAL_DIR)) {
    if (!file.endsWith(".json")) continue
    const taskId = file.replace(".json", "")
    const signal = readSignal(taskId)
    if (signal) result[taskId] = signal
  }
  return result
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/framework/signal.ts
git commit -m "feat(e2e): 信号文件模块（wx 原子创建）"
```

---

## Task 3: 框架核心 — 任务调度器

**Files:**
- Create: `frontend/e2e/framework/runner.ts`

- [ ] **Step 1: 创建调度器**

```typescript
// frontend/e2e/framework/runner.ts
/**
 * 任务队列调度器。
 * 循环遍历任务列表，按前置条件非阻塞执行。
 */

import type { Page } from "@playwright/test"
import type { Task, TaskRecord, TaskStatus } from "./types"
import { claimTask, writeSignal, checkRequires, readSignal } from "./signal"

/** 总超时：10 分钟。 */
const TOTAL_TIMEOUT = 10 * 60 * 1000
/** 无任务可做时的等待间隔。 */
const POLL_INTERVAL = 2000

/** 加载所有 worker 的任务（用于备选 worker 偷取）。 */
function loadAllTasks(): Task[] {
  const all: Task[] = []
  for (let i = 1; i <= 7; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`../w${i}/tasks`)
      all.push(...(mod.tasks || []))
    } catch {
      /* worker 目录不存在则跳过 */
    }
  }
  return all
}

export class TaskRunner {
  private records: TaskRecord[]
  private workerName: string
  private page: Page
  private startTime: number = 0

  constructor(tasks: Task[], workerName: string, page: Page) {
    this.records = tasks.map((task) => ({ task, status: "pending" as TaskStatus }))
    this.workerName = workerName
    this.page = page
  }

  /** 运行任务队列。 */
  async run(): Promise<TaskRecord[]> {
    this.startTime = Date.now()

    // Phase 1 & 2 循环
    while (true) {
      if (this.isTimedOut()) {
        this.markRemainingTimeout()
        break
      }

      // Phase 1: 执行自己绑定的任务
      const ownResult = await this.tryOwnTasks()
      if (ownResult === "executed") continue
      if (ownResult === "all_done") {
        // Phase 2: 偷取备选任务
        const stealResult = await this.tryStealTasks()
        if (stealResult === "executed") continue
      }

      // Phase 3: 没有能做的任务
      if (this.isAllDone()) break
      await this.sleep(POLL_INTERVAL)
    }

    return this.records
  }

  /** 尝试执行自己的任务。 */
  private async tryOwnTasks(): Promise<"executed" | "all_done" | "waiting"> {
    let allDone = true
    for (const record of this.records) {
      if (record.status !== "pending") continue
      allDone = false

      const check = checkRequires(record.task.requires)

      if (check.result === "any_fail") {
        record.status = "breaker"
        record.cause = check.failedCause
        writeSignal(record.task.id, "breaker", {
          worker: this.workerName,
          cause: check.failedCause,
        })
        return "executed"
      }

      if (check.result === "all_pass") {
        await this.executeTask(record)
        return "executed"
      }

      // not_ready → 继续检查下一个任务
    }
    return allDone ? "all_done" : "waiting"
  }

  /** 尝试偷取备选任务。 */
  private async tryStealTasks(): Promise<"executed" | "none"> {
    const allTasks = loadAllTasks()
    for (const task of allTasks) {
      if (task.worker === this.workerName) continue
      if (!task.backupWorkers?.includes(this.workerName)) continue

      // 检查是否已被执行
      const existing = readSignal(task.id)
      if (existing) continue

      // 检查前置条件
      const check = checkRequires(task.requires)
      if (check.result !== "all_pass") continue

      // 尝试抢占
      if (!claimTask(task.id, this.workerName)) continue

      // 执行
      try {
        await task.fn(this.page, task.fnArgs)
        writeSignal(task.id, "pass", { worker: this.workerName })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        writeSignal(task.id, "fail", { worker: this.workerName, error: msg })
      }
      return "executed"
    }
    return "none"
  }

  /** 执行单个任务。 */
  private async executeTask(record: TaskRecord): Promise<void> {
    // 抢占（防止备选 worker 同时执行）
    if (!claimTask(record.task.id, this.workerName)) {
      // 已被其他 worker 抢占，标记为 pass（信任其结果）
      const signal = readSignal(record.task.id)
      record.status = (signal?.status as TaskStatus) || "pass"
      return
    }

    record.status = "running"
    try {
      await record.task.fn(this.page, record.task.fnArgs)
      record.status = "pass"
      writeSignal(record.task.id, "pass", { worker: this.workerName })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      record.status = "fail"
      record.error = msg
      writeSignal(record.task.id, "fail", { worker: this.workerName, error: msg })
    }
  }

  /** 检查是否所有任务都完成。 */
  private isAllDone(): boolean {
    return this.records.every((r) => r.status !== "pending")
  }

  /** 检查是否超时。 */
  private isTimedOut(): boolean {
    return Date.now() - this.startTime > TOTAL_TIMEOUT
  }

  /** 标记剩余 pending 任务为 timeout。 */
  private markRemainingTimeout(): void {
    for (const record of this.records) {
      if (record.status === "pending") {
        record.status = "timeout"
        writeSignal(record.task.id, "timeout", { worker: this.workerName })
      }
    }
  }

  /** 等待。 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/framework/runner.ts
git commit -m "feat(e2e): 任务队列调度器"
```

---

## Task 4: 框架核心 — 覆盖率计算

**Files:**
- Create: `frontend/e2e/framework/coverage.ts`

- [ ] **Step 1: 创建覆盖率计算模块**

```typescript
// frontend/e2e/framework/coverage.ts
/**
 * 覆盖率计算。
 * 从任务定义的 coverage 声明汇总，和实际收集数据对比。
 */

import * as fs from "fs"
import * as path from "path"
import type { Task, Signal } from "./types"
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

  // 从所有任务声明中收集预期覆盖
  const totalApi = new Set<string>()
  const totalRoutes = new Set<string>()
  const totalComponents: [string, string][] = []
  const totalSecurity: [string, string][] = []

  // 从 pass 的任务中收集实际覆盖
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

    // 只有 pass 的任务才计入实际覆盖
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
```

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/framework/coverage.ts
git commit -m "feat(e2e): 覆盖率计算模块"
```

---

## Task 5: runner.spec.ts + playwright.config.ts

**Files:**
- Create: `frontend/e2e/runner.spec.ts`
- Rewrite: `frontend/e2e/playwright.config.ts`

- [ ] **Step 1: 创建通用 spec**

```typescript
// frontend/e2e/runner.spec.ts
/**
 * 通用测试入口。
 * 7 个 project 共享，根据 project name 加载对应的任务队列。
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
  const workerName = projectName.split("-")[0] // "w1-superuser" → "w1"

  const runner = new TaskRunner(tasks, workerName, page)
  const records = runner.run()
  const results = await records

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
```

- [ ] **Step 2: 重写 playwright.config.ts**

```typescript
// frontend/e2e/playwright.config.ts
/**
 * Playwright E2E 测试配置。
 * 7 个 worker 并行启动，靠任务前置条件自然协调。
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
  timeout: isRemote ? 660_000 : 630_000, // 总超时略大于 runner 的 10 分钟
  retries: 0,
  workers: 7,
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
    { name: "w1-superuser", testMatch: "runner.spec.ts" },
    { name: "w2-student", testMatch: "runner.spec.ts" },
    { name: "w3-advisor", testMatch: "runner.spec.ts" },
    { name: "w4-visitor", testMatch: "runner.spec.ts" },
    { name: "w5-content-admin", testMatch: "runner.spec.ts" },
    { name: "w6-support", testMatch: "runner.spec.ts" },
    { name: "w7-breaker", testMatch: "runner.spec.ts" },
  ],
})
```

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/runner.spec.ts frontend/e2e/playwright.config.ts
git commit -m "feat(e2e): 通用 spec + playwright 配置（7 worker）"
```

---

## Task 6: global-setup + global-teardown

**Files:**
- Rewrite: `frontend/e2e/global-setup.ts`
- Rewrite: `frontend/e2e/global-teardown.ts`

- [ ] **Step 1: 重写 global-setup.ts**

```typescript
// frontend/e2e/global-setup.ts
/**
 * 全局初始化。
 * 清理信号/熔断文件，处理 LAST_NOT_PASS 逻辑。
 */

import * as fs from "fs"
import * as path from "path"
import { cleanupSignals, ensureSignalDir, writeSignal } from "./framework/signal"

export default async function globalSetup(): Promise<void> {
  // 1. 清理信号文件
  cleanupSignals()
  ensureSignalDir()

  // 2. LAST_NOT_PASS 模式：为已通过的任务预写 pass 信号
  if (process.env.LAST_NOT_PASS === "1") {
    const lastRunPath = path.join(__dirname, ".last-run.json")
    if (fs.existsSync(lastRunPath)) {
      const lastRun = JSON.parse(fs.readFileSync(lastRunPath, "utf-8")) as Record<string, string>

      // 找出未通过的任务及其依赖链
      const notPass = new Set<string>()
      const allTasks: Array<{ id: string; requires: string[] }> = []
      for (let i = 1; i <= 7; i++) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod = require(`./w${i}/tasks`)
          allTasks.push(...(mod.tasks || []).map((t: { id: string; requires: string[] }) => ({
            id: t.id,
            requires: t.requires,
          })))
        } catch { /* skip */ }
      }

      // 收集未通过的任务
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
```

- [ ] **Step 2: 重写 global-teardown.ts**

```typescript
// frontend/e2e/global-teardown.ts
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

  // 登录 superuser
  const loginPhone = process.env.SEED_USER_E2E_USERNAME
  const loginPass = process.env.SEED_USER_E2E_PASSWORD
  if (loginPhone && loginPass) {
    await page.request.post(`${baseURL}/api/auth/login`, {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { username: loginPhone, encrypted_password: loginPass },
    })
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

  // 清理 E2E 用户（W2-W7 注册的账号）
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
```

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/global-setup.ts frontend/e2e/global-teardown.ts
git commit -m "feat(e2e): global-setup/teardown 重写"
```

---

## Task 7: 共用 fn — 基础操作

**Files:**
- Create: `frontend/e2e/fns/set-cookie.ts`
- Create: `frontend/e2e/fns/register.ts`
- Create: `frontend/e2e/fns/login.ts`
- Create: `frontend/e2e/fns/logout.ts`
- Create: `frontend/e2e/fns/assign-role.ts`
- Create: `frontend/e2e/fns/refresh-token.ts`

这些是多个 worker 共用的基础 fn。每个文件导出一个或多个 TaskFn。

- [ ] **Step 1: 创建所有基础 fn 文件**

从现有 spec 中提取 UI 操作逻辑，改为通过页面操作而非直接 API 调用。具体实现需要参考现有的：
- `w2/01-register.spec.ts` → `register.ts`
- `global-setup.ts` 登录逻辑 → `login.ts`
- `w4/08-disabled.spec.ts` 登出逻辑 → `logout.ts`
- `w1/01-setup.spec.ts` 赋权逻辑 → `assign-role.ts`
- `helpers/sms.ts` cookie 逻辑 → `set-cookie.ts`

每个 fn 文件的结构：

```typescript
// frontend/e2e/fns/register.ts
/**
 * UI 注册流程。
 * 设置 INTERNAL_SECRET cookie → 输入手机号 → 获取验证码 → 填写 → 提交。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"
import { setInternalSecretCookie } from "./set-cookie"

export async function register(page: Page, args?: Record<string, unknown>): Promise<void> {
  const phone = args?.phone as string
  if (!phone) throw new Error("register 需要 phone 参数")

  // 1. 设置 cookie
  await setInternalSecretCookie(page)

  // 2. 导航到首页
  await page.goto("/")
  await page.locator("main").waitFor()

  // 3. 点击登录按钮
  const loginBtn = page.getByRole("button", { name: /登录/ })
  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 5; i++) {
    await loginBtn.click()
    try { await dialog.waitFor({ timeout: 3_000 }); break } catch { /* retry */ }
  }

  // 4. 切换到手机验证码 tab
  await page.getByRole("tab", { name: /手机验证码/ }).click()
  await page.waitForTimeout(300)

  // 5. 输入手机号（选择国家码 + 输入号码）
  const phoneInput = dialog.locator("input[type='tel']")
  const localNumber = phone.split("-")[1] || phone.replace(/^\+86-?/, "")
  await phoneInput.fill(localNumber)

  // 6. 点击发送验证码
  const sendBtn = dialog.getByRole("button", { name: /发送|获取/ })
  await sendBtn.click()

  // 7. 等待验证码返回（通过 API 响应拦截获取）
  // TODO: 从 API 响应中获取验证码并填入
  // 这里需要根据实际 UI 实现调整

  // 8. 提交
  // TODO: 点击登录/注册按钮

  // 9. 等待弹窗关闭
  await dialog.waitFor({ state: "hidden", timeout: 10_000 })

  // 10. 保存 storageState
  const workerName = args?.worker as string
  if (workerName) {
    const authPath = `frontend/e2e/.auth/${workerName}.json`
    await page.context().storageState({ path: authPath })
  }
}
```

> **注意：** 上面的 register.ts 是骨架代码。实际实现需要根据登录弹窗的 DOM 结构完善。其他 fn 文件同理——从现有 spec 提取真实 UI 操作逻辑，替换所有 `page.request.post/get` 为 UI 操作。

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/fns/
git commit -m "feat(e2e): 共用 fn — 基础操作（注册/登录/登出/赋权）"
```

---

## Task 8: 共用 fn — 业务操作

**Files:**
- Create: `frontend/e2e/fns/admin-crud.ts`
- Create: `frontend/e2e/fns/role-management.ts`
- Create: `frontend/e2e/fns/user-management.ts`
- Create: `frontend/e2e/fns/settings.ts`
- Create: `frontend/e2e/fns/security.ts`
- Create: `frontend/e2e/fns/sidebar-nav.ts`
- Create: `frontend/e2e/fns/profile.ts`
- Create: `frontend/e2e/fns/documents.ts`
- Create: `frontend/e2e/fns/two-factor.ts`
- Create: `frontend/e2e/fns/sessions.ts`
- Create: `frontend/e2e/fns/permission.ts`
- Create: `frontend/e2e/fns/public-pages.ts`
- Create: `frontend/e2e/fns/public-detail.ts`
- Create: `frontend/e2e/fns/search-filter.ts`
- Create: `frontend/e2e/fns/jwt-security.ts`
- Create: `frontend/e2e/fns/idor.ts`
- Create: `frontend/e2e/fns/disabled-verify.ts`
- Create: `frontend/e2e/fns/auth-flow.ts`
- Create: `frontend/e2e/fns/contacts.ts`
- Create: `frontend/e2e/fns/students.ts`
- Create: `frontend/e2e/fns/student-docs.ts`

- [ ] **Step 1: 从现有 spec 逐个提取 fn 实现**

每个 fn 文件从对应的旧 spec 提取 UI 操作逻辑。关键原则：
- 所有 `page.request.post/get` 替换为 UI 操作（点击按钮、填表单）
- 保留 `trackComponent`/`trackSecurity` 对应的 coverage 声明（移到 tasks.ts 的 coverage 字段）
- 每个 fn 导出一个 `async function(page, args)` 默认函数

参考映射表：

| fn 文件 | 来源 spec |
|---------|----------|
| `admin-crud.ts` | `w1/02-admin-crud.spec.ts` |
| `role-management.ts` | `w1/03-role-management.spec.ts` |
| `user-management.ts` | `w1/04-user-management.spec.ts` |
| `settings.ts` | `w1/05-settings.spec.ts` |
| `security.ts` | `w1/06-security.spec.ts` |
| `sidebar-nav.ts` | `w1/07-sidebar-navigation.spec.ts` |
| `profile.ts` | `w2/02-portal-profile.spec.ts` |
| `documents.ts` | `w2/03-documents.spec.ts` |
| `two-factor.ts` | `w2/04-two-factor.spec.ts` |
| `sessions.ts` | `w2/05-sessions.spec.ts` |
| `permission.ts` | `w2/06-permission.spec.ts` + `w3/05-permission.spec.ts` + `w4/05-permission.spec.ts` |
| `public-pages.ts` | `w4/02-public-pages.spec.ts` |
| `public-detail.ts` | `w4/03-public-detail.spec.ts` |
| `search-filter.ts` | `w4/04-search-filter.spec.ts` |
| `jwt-security.ts` | `w4/06-security-jwt.spec.ts` |
| `idor.ts` | `w4/07-idor.spec.ts` |
| `disabled-verify.ts` | `w4/08-disabled.spec.ts` |
| `auth-flow.ts` | `shared/auth-flow.spec.ts` |
| `contacts.ts` | `w3/04-contacts.spec.ts` |
| `students.ts` | `w3/02-student-management.spec.ts` |
| `student-docs.ts` | `w3/03-student-documents.spec.ts` |

> **实现指导：** 每个 fn 内部的具体 UI 操作（定位元素、填表单、点击按钮）从对应的旧 spec 拷贝并修改。旧 spec 中的 `page.request.post` 调用需要替换为等效的 UI 操作。如果某个操作在 UI 上无法完成（如直接调后端内部 API），则保留 `page.request` 调用但添加注释说明原因。

- [ ] **Step 2: 提交**

```bash
git add frontend/e2e/fns/
git commit -m "feat(e2e): 共用 fn — 业务操作（从旧 spec 迁移）"
```

---

## Task 9: W1-W4 任务声明（迁移现有测试）

**Files:**
- Create: `frontend/e2e/w1/tasks.ts`
- Create: `frontend/e2e/w2/tasks.ts`
- Create: `frontend/e2e/w3/tasks.ts`
- Create: `frontend/e2e/w4/tasks.ts`

- [ ] **Step 1: 创建 W1 tasks.ts**

```typescript
// frontend/e2e/w1/tasks.ts
import type { Task } from "../framework/types"
import { login } from "../fns/login"
import { assignRole } from "../fns/assign-role"
import { refreshToken } from "../fns/refresh-token"
// ... 其他 fn imports

const TS = Date.now()

export const tasks: Task[] = [
  // ── 登录 ──
  {
    id: "w1_login", worker: "w1", name: "superuser 登录",
    requires: [],
    fn: login,
    fnArgs: { username: process.env.SEED_USER_E2E_USERNAME, password: process.env.SEED_USER_E2E_PASSWORD },
  },

  // ── 赋权（等 W2-W6 注册完） ──
  {
    id: "w1_assign_w2", worker: "w1", name: "赋权 W2 → student",
    requires: ["w1_login", "w2_register"],
    fn: assignRole,
    fnArgs: { targetWorker: "w2", roleName: "student" },
  },
  {
    id: "w1_assign_w3", worker: "w1", name: "赋权 W3 → advisor",
    requires: ["w1_login", "w3_register"],
    fn: assignRole,
    fnArgs: { targetWorker: "w3", roleName: "advisor" },
  },
  {
    id: "w1_assign_w4", worker: "w1", name: "赋权 W4 → visitor（跳过）",
    requires: ["w1_login", "w4_register"],
    fn: async () => { /* visitor 是默认角色，无需赋权 */ },
  },
  {
    id: "w1_assign_w5", worker: "w1", name: "赋权 W5 → content_admin",
    requires: ["w1_login", "w5_register"],
    fn: assignRole,
    fnArgs: { targetWorker: "w5", roleName: "content_admin" },
  },
  {
    id: "w1_assign_w6", worker: "w1", name: "赋权 W6 → support",
    requires: ["w1_login", "w6_register"],
    fn: assignRole,
    fnArgs: { targetWorker: "w6", roleName: "support" },
  },

  // ── 刷新 token ──
  {
    id: "w1_refresh_w2", worker: "w1", name: "刷新 W2 token",
    requires: ["w1_assign_w2"],
    fn: refreshToken,
    fnArgs: { targetWorker: "w2" },
  },
  // ... w3, w5, w6 同理

  // ── CRUD（不依赖其他 worker） ──
  {
    id: "w1_crud_category", worker: "w1", name: "分类 CRUD",
    requires: ["w1_login"],
    fn: /* adminCrudCategory */, // 从 fns/admin-crud.ts 引用
    coverage: {
      routes: ["/admin/categories"],
      components: [["CategoryDialog", "名称输入"], ["CategoryTable", "操作按钮"]],
    },
  },
  // ... 文章、案例、院校 CRUD

  // ── 角色管理 ──
  // ── 用户管理 ──
  // ── 设置 ──
  // ── 安全 ──
  // ── 侧边栏导航 ──

  // ── W7 协调：禁用/启用临时账号 ──
  {
    id: "w1_disable_temp", worker: "w1", name: "禁用 W7 临时账号",
    requires: ["w1_login", "w7_reg_disable"],
    fn: /* disableTempUser */,
  },
  {
    id: "w1_enable_temp", worker: "w1", name: "启用 W7 临时账号",
    requires: ["w7_verify_disabled"],
    fn: /* enableTempUser */,
  },
]
```

> **注意：** 上面是 W1 tasks.ts 的骨架。实际实现时需要：
> 1. 从旧 spec 的每个 test block 提取为独立任务
> 2. 每个任务声明正确的 requires 和 coverage
> 3. 引用对应的 fn
> W2-W4 同理。

- [ ] **Step 2: 创建 W2-W4 tasks.ts（同样结构）**

每个 worker 的 tasks.ts 从对应的旧 spec 迁移，按照：
- 旧 spec 的每个 `test()` block → 新框架的一个 Task
- 旧 `waitFor()` → 新 `requires`
- 旧 `emit()` → 任务 pass 后自动写信号文件（用 task.id）
- 旧 `trackComponent/trackSecurity` → 任务的 coverage 声明

- [ ] **Step 3: 提交**

```bash
git add frontend/e2e/w1/tasks.ts frontend/e2e/w2/tasks.ts frontend/e2e/w3/tasks.ts frontend/e2e/w4/tasks.ts
git commit -m "feat(e2e): W1-W4 任务声明（从旧 spec 迁移）"
```

---

## Task 10: W5-W7 任务声明（新增）

**Files:**
- Create: `frontend/e2e/w5/tasks.ts`
- Create: `frontend/e2e/w6/tasks.ts`
- Create: `frontend/e2e/w7/tasks.ts`

- [ ] **Step 1: 创建 W5 tasks.ts（content_admin）**

W5 的任务基于 content_admin 角色的权限（admin 文章/分类/案例/院校/设置 + portal）：

```typescript
// frontend/e2e/w5/tasks.ts
export const tasks: Task[] = [
  // 注册
  { id: "w5_register", worker: "w5", name: "自注册", requires: [], fn: register, fnArgs: { phone: `+86-1390003${TS}`, worker: "w5" } },

  // 正向：有权限的功能
  { id: "w5_articles", worker: "w5", name: "文章管理", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* articles */, ... },
  { id: "w5_categories", worker: "w5", name: "分类管理", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* categories */, ... },
  { id: "w5_cases", worker: "w5", name: "案例管理", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* cases */, ... },
  { id: "w5_universities", worker: "w5", name: "院校管理", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* universities */, ... },
  { id: "w5_settings", worker: "w5", name: "设置页面", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* settings */, ... },

  // 反向：无权限的功能
  { id: "w5_users_denied", worker: "w5", name: "用户管理被拒", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* permissionDenied */, ... },
  { id: "w5_roles_denied", worker: "w5", name: "角色管理被拒", requires: ["w1_assign_w5", "w1_refresh_w5"], fn: /* permissionDenied */, ... },
]
```

- [ ] **Step 2: 创建 W6 tasks.ts（support）**

W6 基于 support 角色（admin 联系人/仪表盘 + portal）：正向联系人管理 + 反向其他 admin 页面。

- [ ] **Step 3: 创建 W7 tasks.ts（破坏性测试）**

W7 串行：注册临时账号 → 测试 → 登出 → 注册下一个。

```typescript
// frontend/e2e/w7/tasks.ts
export const tasks: Task[] = [
  // ── 禁用测试 ──
  { id: "w7_reg_disable", worker: "w7", name: "注册临时账号(禁用)", requires: [], fn: register, ... },
  { id: "w7_verify_disabled", worker: "w7", name: "验证禁用后 API 返回 401", requires: ["w1_disable_temp"], fn: disabledVerify, ... },
  { id: "w7_verify_enabled", worker: "w7", name: "验证启用后恢复", requires: ["w1_enable_temp"], fn: enabledVerify, ... },
  { id: "w7_logout_disable", worker: "w7", name: "登出(禁用)", requires: ["w7_verify_enabled"], fn: logout, ... },

  // ── JWT 安全 ──
  { id: "w7_reg_jwt", worker: "w7", name: "注册临时账号(JWT)", requires: ["w7_logout_disable"], fn: register, ... },
  { id: "w7_jwt_tamper", worker: "w7", name: "JWT 篡改返回 401", requires: ["w7_reg_jwt"], fn: jwtTamper, ... },
  { id: "w7_jwt_missing", worker: "w7", name: "无 token 返回 401", requires: ["w7_reg_jwt"], fn: jwtMissing, ... },
  { id: "w7_logout_jwt", worker: "w7", name: "登出(JWT)", requires: ["w7_jwt_missing"], fn: logout, ... },

  // ── IDOR ──
  { id: "w7_reg_idor", worker: "w7", name: "注册临时账号(IDOR)", requires: ["w7_logout_jwt"], fn: register, ... },
  { id: "w7_idor_doc", worker: "w7", name: "访问他人文档被拒", requires: ["w7_reg_idor", "w2_doc_uploaded"], fn: idorDoc, ... },
  { id: "w7_logout_idor", worker: "w7", name: "登出(IDOR)", requires: ["w7_idor_doc"], fn: logout, ... },

  // ── 认证流程 ──
  { id: "w7_auth_flow", worker: "w7", name: "登录弹窗/tab/登出流程", requires: ["w7_logout_idor"], fn: authFlow, ... },
]
```

- [ ] **Step 4: 提交**

```bash
git add frontend/e2e/w5/tasks.ts frontend/e2e/w6/tasks.ts frontend/e2e/w7/tasks.ts
git commit -m "feat(e2e): W5-W7 任务声明（content_admin/support/破坏性测试）"
```

---

## Task 11: 删除旧文件

**Files:**
- Delete: `frontend/e2e/w1/*.spec.ts` (8 files)
- Delete: `frontend/e2e/w2/*.spec.ts` (8 files)
- Delete: `frontend/e2e/w3/*.spec.ts` (6 files)
- Delete: `frontend/e2e/w4/*.spec.ts` (8 files)
- Delete: `frontend/e2e/shared/*.spec.ts` (1 file)
- Delete: `frontend/e2e/fixtures/base.ts`
- Delete: `frontend/e2e/fixtures/coverage.ts`
- Delete: `frontend/e2e/helpers/signal.ts`

- [ ] **Step 1: 删除旧文件**

```bash
rm -rf frontend/e2e/w1/*.spec.ts frontend/e2e/w2/*.spec.ts frontend/e2e/w3/*.spec.ts frontend/e2e/w4/*.spec.ts
rm -rf frontend/e2e/shared/
rm -f frontend/e2e/fixtures/base.ts frontend/e2e/fixtures/coverage.ts
rm -f frontend/e2e/helpers/signal.ts
```

- [ ] **Step 2: 提交**

```bash
git add -A
git commit -m "refactor(e2e): 删除旧测试文件"
```

---

## Task 12: 本地验证

- [ ] **Step 1: 确保开发容器运行**

```bash
curl -s http://localhost/api/version
```

Expected: `{"api":"dev",...}`

- [ ] **Step 2: 运行 E2E 测试**

```bash
pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
```

Expected: 7 个 worker 并行启动，任务按前置条件调度执行。

- [ ] **Step 3: 检查覆盖率报告**

Expected output:
```
[Test Results] N pass / 0 fail / 0 breaker / 0 timeout

[API Coverage] .../... (100.0%)
[Route Coverage] .../... (100.0%)
[Component Coverage] .../... (100.0%)
[Security Coverage] .../... (100.0%)
```

- [ ] **Step 4: 测试 --last-not-pass**

故意让一个测试失败，然后：

```bash
LAST_NOT_PASS=1 pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
```

验证只重跑失败的任务及其依赖链。

- [ ] **Step 5: 提交最终修复**

```bash
git add -A
git commit -m "fix(e2e): 本地验证修复"
```

---

## Task 13: 线上验证

- [ ] **Step 1: 推送并部署**

```bash
git push origin dev
# 合并到 main 并推送触发 CI/CD
```

- [ ] **Step 2: 运行线上 E2E**

```bash
TEST_ENV=production pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
```

- [ ] **Step 3: 确认结果**

Expected: 0 fail / 0 breaker / 0 timeout，四维度覆盖率 100%。
