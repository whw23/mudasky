# E2E 多 Worker 协作测试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 E2E 测试重构为 4 worker 协作模式，通过文件信号协调，实现六维度 100% 覆盖率，0 failed / 0 skipped / 0 flaky。

**Architecture:** 4 个 Playwright project（W1-superuser / W2-student / W3-advisor / W4-visitor），通过 `/tmp/e2e-signals/` 文件信号协调执行顺序。覆盖率通过 OpenAPI schema 自动发现 API 端点、目录扫描自动发现页面路由、JSON 清单跟踪组件和安全场景。

**Tech Stack:** Playwright 4 projects, 文件信号 IPC, OpenAPI schema, glob 目录扫描

---

## 阶段 1：基础设施

### Task 1: 信号机制

**Files:**

- Create: `frontend/e2e/helpers/signal.ts`

- [ ] **Step 1: 创建信号工具**

```typescript
/**
 * Worker 间文件信号通信。
 * emit() 写文件，waitFor() 轮询读取，cleanup() 清理。
 */

import * as fs from "fs"
import * as path from "path"

const SIGNAL_DIR = "/tmp/e2e-signals"

/** 确保信号目录存在。 */
function ensureDir(): void {
  fs.mkdirSync(SIGNAL_DIR, { recursive: true })
}

/** 发送信号（同步写文件，立即可见）。 */
export function emit(name: string, data?: unknown): void {
  ensureDir()
  const payload = JSON.stringify(data ?? {}, null, 2)
  fs.writeFileSync(path.join(SIGNAL_DIR, `${name}.json`), payload)
}

/** 等待信号（轮询文件，默认超时 30s）。 */
export async function waitFor<T = unknown>(
  name: string,
  timeout = 30_000,
): Promise<T> {
  const filePath = path.join(SIGNAL_DIR, `${name}.json`)
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8")
      return JSON.parse(content) as T
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  throw new Error(`信号超时: ${name}（等待 ${timeout}ms）`)
}

/** 清理所有信号文件。 */
export function cleanup(): void {
  if (fs.existsSync(SIGNAL_DIR)) {
    fs.rmSync(SIGNAL_DIR, { recursive: true, force: true })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/helpers/signal.ts
git commit -m "feat: E2E worker 间文件信号通信"
```

---

### Task 2: 覆盖率清单文件

**Files:**

- Create: `frontend/e2e/helpers/components.json`
- Create: `frontend/e2e/helpers/security-scenarios.json`

- [ ] **Step 1: 创建组件清单**

创建 `frontend/e2e/helpers/components.json`，内容直接从设计文档的维度 3 复制（21 个组件，87 个元素）。

- [ ] **Step 2: 创建安全场景清单**

创建 `frontend/e2e/helpers/security-scenarios.json`，内容直接从设计文档的维度 4 复制（30 个场景）。

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/helpers/components.json frontend/e2e/helpers/security-scenarios.json
git commit -m "feat: 组件交互 + 安全场景覆盖率清单"
```

---

### Task 3: base.ts 重写

**Files:**

- Rewrite: `frontend/e2e/fixtures/base.ts`

- [ ] **Step 1: 重写 base.ts**

保留现有的 `gotoAdmin`、`clickAndWaitDialog`、覆盖率收集逻辑，新增：

- `trackComponent(component: string, element: string)` — 记录组件交互
- `trackSecurity(category: string, scenario: string)` — 记录安全场景
- 组件和安全数据也写入 `.coverage/` 目录

```typescript
/**
 * E2E 测试共享 fixtures。
 * 覆盖率收集（API/路由/组件/安全）自动启用。
 */

import { test as pwTest, expect, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const COVERAGE_DIR = path.join(__dirname, "..", ".coverage")
const UUID_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const LOCALE_PREFIX_RE = /^\/[a-z]{2}(?=\/)/

const apiCalls = new Set<string>()
const visitedRoutes = new Set<string>()
const componentInteractions = new Set<string>()
const securityScenarios = new Set<string>()
let exitRegistered = false

function ensureExitHook() {
  if (exitRegistered) return
  exitRegistered = true

  const workerId = process.env.TEST_WORKER_INDEX || "0"

  process.on("exit", () => {
    if (
      apiCalls.size === 0 &&
      visitedRoutes.size === 0 &&
      componentInteractions.size === 0 &&
      securityScenarios.size === 0
    ) return

    fs.mkdirSync(COVERAGE_DIR, { recursive: true })

    const write = (prefix: string, data: Set<string>) => {
      if (data.size > 0) {
        fs.writeFileSync(
          path.join(COVERAGE_DIR, `${prefix}-${workerId}.json`),
          JSON.stringify([...data].sort(), null, 2),
        )
      }
    }

    write("api", apiCalls)
    write("routes", visitedRoutes)
    write("components", componentInteractions)
    write("security", securityScenarios)
  })
}

function normalizeApiPath(urlPath: string): string {
  return urlPath.replace(UUID_RE, "/{id}")
}

function attachCoverageListeners(page: Page) {
  ensureExitHook()

  page.on("response", (response) => {
    try {
      const parsed = new URL(response.url())
      if (parsed.pathname.startsWith("/api/")) {
        apiCalls.add(`${response.request().method()} ${normalizeApiPath(parsed.pathname)}`)
      }
    } catch { /* 忽略 */ }
  })

  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return
    try {
      const parsed = new URL(frame.url())
      const stripped = parsed.pathname.replace(LOCALE_PREFIX_RE, "")
      if (!stripped.startsWith("/api/") && stripped !== "about:blank") {
        visitedRoutes.add(stripped)
      }
    } catch { /* 忽略 */ }
  })
}

function wrapApiRequest(page: Page) {
  const origGet = page.request.get.bind(page.request)
  const origPost = page.request.post.bind(page.request)

  page.request.get = async (url: string, options?: Parameters<typeof origGet>[1]) => {
    const res = await origGet(url, options)
    try {
      const parsed = new URL(url, "http://localhost")
      if (parsed.pathname.startsWith("/api/")) {
        apiCalls.add(`GET ${normalizeApiPath(parsed.pathname)}`)
      }
    } catch { /* 忽略 */ }
    return res
  }

  page.request.post = async (url: string, options?: Parameters<typeof origPost>[1]) => {
    const res = await origPost(url, options)
    try {
      const parsed = new URL(url, "http://localhost")
      if (parsed.pathname.startsWith("/api/")) {
        apiCalls.add(`POST ${normalizeApiPath(parsed.pathname)}`)
      }
    } catch { /* 忽略 */ }
    return res
  }
}

/** 记录组件交互。 */
export function trackComponent(component: string, element: string): void {
  ensureExitHook()
  componentInteractions.add(`${component}::${element}`)
}

/** 记录安全场景。 */
export function trackSecurity(category: string, scenario: string): void {
  ensureExitHook()
  securityScenarios.add(`${category}::${scenario}`)
}

export async function gotoAdmin(page: Page, pagePath: string) {
  await page.goto(pagePath)
  await page.locator("main").waitFor()
}

export async function clickAndWaitDialog(page: Page, buttonName: string) {
  const btn = page.getByRole("button", { name: buttonName })
  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 3; i++) {
    await btn.click()
    try {
      await dialog.waitFor({ timeout: 2_000 })
      return
    } catch { /* 水合未完成，重试 */ }
  }
  await btn.click()
  await dialog.waitFor()
}

export const test = pwTest.extend<{
  adminPage: Page
}>({
  page: async ({ page }, use) => {
    attachCoverageListeners(page)
    wrapApiRequest(page)
    await use(page)
  },
  adminPage: async ({ page }, use) => {
    await use(page)
  },
})

export { expect }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/fixtures/base.ts
git commit -m "refactor: base.ts 增加 trackComponent/trackSecurity 覆盖率收集"
```

---

### Task 4: playwright.config.ts 重写

**Files:**

- Rewrite: `frontend/e2e/playwright.config.ts`

- [ ] **Step 1: 重写配置**

```typescript
/**
 * Playwright E2E 测试配置。
 * 4 个 project 对应 4 个 worker 角色。
 */

import { defineConfig } from "@playwright/test"
import * as path from "path"

const isRemote = !!process.env.BASE_URL

const AUTH_DIR = path.join(__dirname, ".auth")

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: isRemote ? 60_000 : 30_000,
  retries: 0,
  workers: 4,
  fullyParallel: true,
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
    {
      name: "w1-superuser",
      testMatch: "w1/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w1.json") },
    },
    {
      name: "w2-student",
      testMatch: "w2/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w2.json") },
    },
    {
      name: "w3-advisor",
      testMatch: "w3/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w3.json") },
    },
    {
      name: "w4-visitor",
      testMatch: "w4/**/*.spec.ts",
      use: { storageState: path.join(AUTH_DIR, "w4.json") },
    },
    {
      name: "shared",
      testMatch: "shared/**/*.spec.ts",
    },
  ],
})
```

注意：`retries: 0`（目标 0 flaky），`workers: 4`，`fullyParallel: true`。

W2/W3/W4 的 storageState 文件在测试开始时不存在（由各自的 01-register.spec.ts 创建），Playwright 会忽略不存在的 storageState 文件（等效于空 cookie）。

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/playwright.config.ts
git commit -m "refactor: playwright.config 4 project 多 worker 配置"
```

---

### Task 5: global-setup.ts 重写

**Files:**

- Rewrite: `frontend/e2e/global-setup.ts`

- [ ] **Step 1: 重写 global-setup**

用 `e2e_test_superuser` 账号登录，保存 W1 的 storageState。清理信号文件。预热页面。

```typescript
/**
 * Playwright 全局初始化。
 * 用 e2e_test_superuser 登录 → 保存 W1 storageState → 清理信号 → 预热。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"
import { cleanup as cleanupSignals } from "./helpers/signal"

const AUTH_DIR = path.join(__dirname, ".auth")
const W1_AUTH = path.join(AUTH_DIR, "w1.json")
const BASE = process.env.BASE_URL || "http://localhost"
const ADMIN_USER = "e2e_test_superuser"
const ADMIN_PASS = "e2e_test_superuser@12321."

const WARMUP_PAGES = [
  "/",
  "/admin/dashboard",
  "/admin/articles",
  "/admin/users",
  "/admin/cases",
  "/admin/categories",
  "/admin/universities",
  "/admin/roles",
  "/admin/students",
  "/admin/contacts",
  "/admin/general-settings",
  "/admin/web-settings",
  "/portal/overview",
  "/portal/profile",
  "/portal/documents",
]

async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  cleanupSignals()

  // 如果已有有效的 auth 文件（1 小时内），跳过登录
  if (fs.existsSync(W1_AUTH)) {
    const stat = fs.statSync(W1_AUTH)
    if (Date.now() - stat.mtimeMs < 3600_000) {
      // 仍需预热
      await warmupPages()
      return
    }
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({ locale: "zh-CN" })
  const page = await context.newPage()

  // 登录
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 })
  const loginBtn = page.getByRole("button", { name: /登录/ })
  await loginBtn.waitFor({ timeout: 60_000 })

  const dialog = page.getByRole("dialog")
  for (let i = 0; i < 5; i++) {
    await loginBtn.click()
    try {
      await dialog.waitFor({ timeout: 5_000 })
      break
    } catch {
      if (i === 4) throw new Error("登录弹窗未打开")
    }
  }

  await page.getByRole("tab", { name: "账号密码" }).click()
  await page.getByRole("tabpanel").waitFor({ timeout: 10_000 })

  const inputs = dialog.getByRole("textbox")
  await inputs.first().waitFor({ timeout: 5_000 })
  await inputs.first().fill(ADMIN_USER)
  await inputs.nth(1).fill(ADMIN_PASS)

  const submitBtn = page.getByRole("tabpanel").getByRole("button", { name: "登录" })
  for (let i = 0; i < 5; i++) {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login"),
      { timeout: 10_000 },
    ).catch(() => null)
    await submitBtn.click()
    const res = await responsePromise
    if (res) {
      if (res.status() !== 200) {
        throw new Error(`登录失败: ${res.status()}`)
      }
      break
    }
  }

  await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {
    throw new Error("登录失败 — 弹窗未关闭")
  })

  await context.storageState({ path: W1_AUTH })
  await browser.close()

  // 预热
  await warmupPages()
}

async function warmupPages() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    locale: "zh-CN",
    storageState: W1_AUTH,
  })
  const page = await ctx.newPage()
  for (const p of WARMUP_PAGES) {
    await page.goto(`${BASE}${p}`, { waitUntil: "load", timeout: 60_000 })
    await page.waitForLoadState("networkidle").catch(() => {})
  }
  await browser.close()
}

export default globalSetup
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/global-setup.ts
git commit -m "refactor: global-setup 改用 e2e_test_superuser 登录"
```

---

### Task 6: global-teardown.ts 重写

**Files:**

- Rewrite: `frontend/e2e/global-teardown.ts`

- [ ] **Step 1: 重写 global-teardown**

清理 E2E 数据 + 信号文件 + 六维度覆盖率报告（API 自动发现 + 路由自动扫描 + 组件/安全清单对比）。

实施时需要：

1. 用 W1 storageState 调 API 删除 `E2E-` 开头的数据
2. 清理信号文件
3. 覆盖率报告：
   - API：从 `GET /api/openapi.json` 获取全量端点
   - 路由：用 `globSync` 扫描 `frontend/app/[locale]/**/page.tsx`
   - 组件：读 `components.json` 对比
   - 安全：读 `security-scenarios.json` 对比
4. 合并所有 worker 的 `.coverage/` 数据
5. 输出六维度报告

关键代码（路由扫描逻辑）：

```typescript
import { globSync } from "glob"

/** 从 app/[locale] 目录扫描所有 page.tsx 生成路由。 */
function discoverRoutes(frontendDir: string): string[] {
  const pages = globSync("[locale]/**/page.tsx", {
    cwd: path.join(frontendDir, "app"),
  })
  const routes: string[] = []
  for (const p of pages) {
    // 去掉 [locale]/ 前缀和 /page.tsx 后缀
    let route = p
      .replace(/^\[locale\]\//, "")
      .replace(/\/page\.tsx$/, "")
    // 去掉路由组 (public) 等
    route = route.replace(/\([^)]+\)\//g, "")
    // 根路由
    if (route === "") {
      routes.push("/")
      continue
    }
    // [panel] 展开为 admin 和 portal
    if (route.startsWith("[panel]/")) {
      const sub = route.replace("[panel]/", "")
      routes.push(`/admin/${sub}`)
      routes.push(`/portal/${sub}`)
    } else {
      routes.push(`/${route}`)
    }
  }
  return routes
}
```

关键代码（OpenAPI 端点获取）：

```typescript
/** 从 OpenAPI schema 获取全量 API 端点。 */
async function discoverApiEndpoints(page: Page): Promise<string[]> {
  const res = await page.request.get("/api/openapi.json")
  if (!res.ok()) return []
  const spec = await res.json()
  const endpoints: string[] = []
  for (const [apiPath, methods] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(methods as Record<string, unknown>)) {
      if (["get", "post", "put", "delete", "patch"].includes(method)) {
        endpoints.push(`${method.toUpperCase()} /api${apiPath}`)
      }
    }
  }
  return endpoints
}
```

关键代码（覆盖率报告）：

```typescript
/** 输出六维度覆盖率报告。 */
function printCoverageReport(
  allApiCalls: Set<string>,
  allRoutes: Set<string>,
  allComponents: Set<string>,
  allSecurity: Set<string>,
  apiEndpoints: string[],
  pageRoutes: string[],
  componentsList: Array<{ component: string; elements: string[] }>,
  securityList: Array<{ category: string; scenario: string }>,
) {
  // API
  const uncoveredApi = apiEndpoints.filter((ep) => !allApiCalls.has(ep))
  console.log(`\n[API Coverage] ${apiEndpoints.length - uncoveredApi.length}/${apiEndpoints.length} (${((1 - uncoveredApi.length / apiEndpoints.length) * 100).toFixed(1)}%)`)
  if (uncoveredApi.length > 0) {
    console.log("  Uncovered:")
    uncoveredApi.forEach((ep) => console.log(`    - ${ep}`))
  }

  // 路由（用模式匹配）
  const matchedRoutes = new Set<string>()
  for (const url of allRoutes) {
    // 精确匹配
    if (pageRoutes.includes(url)) { matchedRoutes.add(url); continue }
    // 动态路由匹配
    const segments = url.split("/")
    if (segments.length >= 3) {
      const pattern = [...segments.slice(0, -1), "[id]"].join("/")
      if (pageRoutes.includes(pattern)) matchedRoutes.add(pattern)
    }
  }
  const uncoveredRoutes = pageRoutes.filter((r) => !matchedRoutes.has(r))
  console.log(`[Route Coverage] ${matchedRoutes.size}/${pageRoutes.length} (${((matchedRoutes.size / pageRoutes.length) * 100).toFixed(1)}%)`)
  if (uncoveredRoutes.length > 0) {
    console.log("  Uncovered:")
    uncoveredRoutes.forEach((r) => console.log(`    - ${r}`))
  }

  // 组件
  let totalElements = 0
  let coveredElements = 0
  for (const comp of componentsList) {
    for (const el of comp.elements) {
      totalElements++
      if (allComponents.has(`${comp.component}::${el}`)) coveredElements++
    }
  }
  console.log(`[Component Coverage] ${componentsList.length} components, ${coveredElements}/${totalElements} elements (${((coveredElements / totalElements) * 100).toFixed(1)}%)`)

  // 安全
  const coveredSecurity = securityList.filter((s) => allSecurity.has(`${s.category}::${s.scenario}`))
  console.log(`[Security Coverage] ${coveredSecurity.length}/${securityList.length} scenarios (${((coveredSecurity.length / securityList.length) * 100).toFixed(1)}%)`)
  const uncoveredSecurity = securityList.filter((s) => !allSecurity.has(`${s.category}::${s.scenario}`))
  if (uncoveredSecurity.length > 0) {
    console.log("  Uncovered:")
    uncoveredSecurity.forEach((s) => console.log(`    - ${s.category}: ${s.scenario}`))
  }

  console.log()
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/global-teardown.ts
git commit -m "refactor: global-teardown 六维度覆盖率报告 + OpenAPI/路由自动发现"
```

---

### Task 7: 验证阶段 1

- [ ] **Step 1: 创建空的 worker 目录和占位文件**

```bash
mkdir -p frontend/e2e/w1 frontend/e2e/w2 frontend/e2e/w3 frontend/e2e/w4 frontend/e2e/shared
# 每个目录创建一个最小 spec 验证配置正确
```

每个目录创建一个最小的 `00-smoke.spec.ts`，仅验证 Playwright 配置正确加载：

W1: `test("W1 smoke", () => expect(true).toBe(true))`
W2-W4 类似。

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts --reporter=list`
Expected: 5 个 smoke test 通过，覆盖率报告输出（全为 0%）

- [ ] **Step 3: 删除 smoke test，提交**

```bash
git add frontend/e2e/
git commit -m "chore: 阶段1基础设施验证通过"
```

---

## 阶段 2：Worker 测试代码

每个 spec 文件的编写遵循以下模式：

- 从 `../fixtures/base` 导入 `test, expect, trackComponent, trackSecurity`
- 从 `../helpers/signal` 导入 `emit, waitFor`
- 从 `../helpers/sms` 导入 `getSmsCode`（需要验证码时）
- 从 `../helpers/seed` 导入数据创建工具
- 信号等待用 `await waitFor("signal_name")`
- 操作组件后调用 `trackComponent("ComponentName", "elementName")`
- 安全验证后调用 `trackSecurity("category", "scenario")`

### Task 8: W2 注册（01-register.spec.ts）

**Files:**

- Create: `frontend/e2e/w2/01-register.spec.ts`

W2 先于 W1 的赋权操作执行。注册流程：打开首页 → SMS 注册 → 保存 storageState → emit 信号 → 等待赋权 → refresh token。

- [ ] **Step 1: 创建 W2 注册测试**

```typescript
/**
 * W2 (student) 注册流程。
 * 自注册 → 保存 storageState → 发信号 → 等待赋权 → 验证角色。
 */

import { test, expect } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"
import { getSmsCode } from "../helpers/sms"
import * as path from "path"

const W2_AUTH = path.join(__dirname, "..", ".auth", "w2.json")
const PHONE = `+861390000${Date.now().toString().slice(-4)}`
const USERNAME = `E2E-student-${Date.now()}`

test.describe("W2 注册", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("自注册并等待赋权", async ({ page }) => {
    // 注册
    await page.goto("/")
    const code = await getSmsCode(page, PHONE)
    expect(code).toBeTruthy()

    const result = await page.evaluate(
      async ({ phone, smsCode, username }) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ phone, code: smsCode }),
          credentials: "include",
        })
        return { status: res.status, data: await res.json() }
      },
      { phone: PHONE, smsCode: code, username: USERNAME },
    )
    expect(result.status).toBe(200)

    // 保存 storageState
    await page.context().storageState({ path: W2_AUTH })

    // 发信号
    emit("w2_registered", {
      phone: PHONE,
      username: USERNAME,
      userId: result.data.user?.id,
    })

    // 等待 W1 赋权
    await waitFor("w2_student", 60_000)

    // refresh token 获取新权限
    await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })

    // 重新保存 storageState（含新权限的 token）
    await page.context().storageState({ path: W2_AUTH })

    // 验证角色变化
    const profileRes = await page.request.get("/api/portal/profile/meta", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(profileRes.status()).toBe(200)
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/w2/01-register.spec.ts
git commit -m "test: W2 自注册 + 等待赋权流程"
```

---

### Task 9: W3 注册（01-register.spec.ts）

和 Task 8 相同模式，信号名改为 `w3_registered` / `w3_advisor`。

- [ ] **Step 1: 创建 W3 注册测试**

与 W2 结构相同，改 PHONE/USERNAME/AUTH_FILE/信号名。

- [ ] **Step 2: Commit**

---

### Task 10: W4 注册（01-register.spec.ts）

信号名 `w4_registered`，等待 `roles_assigned`（不等个人赋权，因为 W4 保持 visitor）。

- [ ] **Step 1: 创建 W4 注册测试**

- [ ] **Step 2: Commit**

---

### Task 11: W1 Setup（01-setup.spec.ts）

**Files:**

- Create: `frontend/e2e/w1/01-setup.spec.ts`

W1 等待 W2/W3/W4 注册完成 → 赋权 → 创建种子数据 → 发信号。

- [ ] **Step 1: 创建 W1 setup 测试**

```typescript
/**
 * W1 (superuser) 初始化。
 * 等待注册 → 赋权 → 创建数据 → 发信号。
 */

import { test, expect } from "../fixtures/base"
import { emit, waitFor } from "../helpers/signal"
import { gotoAdmin } from "../fixtures/base"

test.describe("W1 初始化", () => {
  test("等待注册并赋权", async ({ page }) => {
    // 等待 W2/W3/W4 注册
    const w2 = await waitFor<{ userId: string }>("w2_registered", 60_000)
    const w3 = await waitFor<{ userId: string }>("w3_registered", 60_000)
    const w4 = await waitFor<{ userId: string }>("w4_registered", 60_000)

    // 获取角色列表
    const rolesRes = await page.request.get("/api/admin/roles/meta/list", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    const roles = await rolesRes.json()
    const roleMap = Object.fromEntries(
      (roles as Array<{ name: string; id: string }>).map((r) => [r.name, r.id]),
    )

    // W2 → student
    const assignW2 = await page.request.post("/api/admin/users/list/detail/assign-role", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: { user_id: w2.userId, role_id: roleMap["student"] },
    })
    expect(assignW2.status()).toBe(200)
    emit("w2_student")

    // W3 → advisor
    const assignW3 = await page.request.post("/api/admin/users/list/detail/assign-role", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: { user_id: w3.userId, role_id: roleMap["advisor"] },
    })
    expect(assignW3.status()).toBe(200)
    emit("w3_advisor")

    emit("roles_assigned")
  })

  test("创建种子数据", async ({ page }) => {
    await waitFor("roles_assigned")

    // 创建分类
    const catRes = await page.request.post("/api/admin/categories/list/create", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: { name: "E2E-分类", slug: `e2e-cat-${Date.now()}` },
    })
    const cat = await catRes.json()
    emit("category_created", { categoryId: cat.id })

    // 创建文章
    const artRes = await page.request.post("/api/admin/articles/list/create", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: {
        title: `E2E-文章-${Date.now()}`,
        slug: `e2e-article-${Date.now()}`,
        category_id: cat.id,
        content_type: "markdown",
        content: "E2E 测试内容",
        status: "published",
      },
    })
    const art = await artRes.json()
    emit("article_created", { articleId: art.id })

    // 创建案例
    const caseRes = await page.request.post("/api/admin/cases/list/create", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: { student_name: `E2E-学生-${Date.now()}`, university: "E2E大学", program: "E2E专业", year: 2026, testimonial: "E2E感言" },
    })
    emit("case_created", { caseId: (await caseRes.json()).id })

    // 创建院校
    const uniRes = await page.request.post("/api/admin/universities/list/create", {
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      data: { name: `E2E-大学-${Date.now()}`, name_en: "E2E Uni", country: "德国", city: "柏林", programs: ["计算机"], description: "E2E" },
    })
    emit("university_created", { universityId: (await uniRes.json()).id })

    emit("seed_data_ready")
  })
})
```

- [ ] **Step 1: Commit**

```bash
git add frontend/e2e/w1/01-setup.spec.ts
git commit -m "test: W1 等待注册 + 赋权 + 创建种子数据"
```

---

### Task 12-18: W1 剩余测试文件

每个文件独立实现，遵循设计文档中 W1 的职责分工。实施时需要读取对应的组件代码确认选择器。

| Task | 文件 | 内容 |
|------|------|------|
| 12 | `w1/02-admin-crud.spec.ts` | 文章/案例/院校/分类 CRUD（创建→编辑→删除） |
| 13 | `w1/03-role-management.spec.ts` | 角色 CRUD + 权限树 + 排序 |
| 14 | `w1/04-user-management.spec.ts` | 用户搜索/展开面板/临时账号状态切换/配额/密码重置/强制登出 |
| 15 | `w1/05-settings.spec.ts` | general-settings + web-settings + ConfigEditDialog |
| 16 | `w1/06-security.spec.ts` | CSRF/XSS/SQL 注入/输入验证 + trackSecurity 调用 |
| 17 | `w1/07-sidebar-navigation.spec.ts` | 侧边栏全链接 + 仪表盘 + 页面导航 |
| 18 | `w1/08-disable-delete.spec.ts` | 禁用 W4 → 信号 → 启用 → 删除临时账号 |

每个 Task 的步骤：读组件代码 → 写测试 → 跑验证 → 提交。

---

### Task 19-25: W2 剩余测试文件

| Task | 文件 | 内容 |
|------|------|------|
| 19 | `w2/02-portal-profile.spec.ts` | 用户名/密码/手机号修改 |
| 20 | `w2/03-documents.spec.ts` | 上传/列表/分类 tab + emit("doc_uploaded") |
| 21 | `w2/04-two-factor.spec.ts` | SMS 2FA 启用/禁用 |
| 22 | `w2/05-sessions.spec.ts` | 登录设备/踢下线 |
| 23 | `w2/06-permission.spec.ts` | portal 正例 + admin 反例 |
| 24 | `w2/07-security.spec.ts` | Token 轮换/文件上传安全/路径穿越/IDOR |
| 25 | `w2/08-portal-navigation.spec.ts` | portal 侧边栏/导航 |

---

### Task 26-30: W3 剩余测试文件

| Task | 文件 | 内容 |
|------|------|------|
| 26 | `w3/02-student-management.spec.ts` | 列表/展开面板（checkbox/备注/顾问/降级） |
| 27 | `w3/03-student-documents.spec.ts` | waitFor("doc_uploaded") → 查看学生文档 |
| 28 | `w3/04-contacts.spec.ts` | 列表/展开面板（状态/备注/升级/历史） |
| 29 | `w3/05-permission.spec.ts` | students/contacts 正例 + articles/users 反例 |
| 30 | `w3/06-sidebar-navigation.spec.ts` | advisor 侧边栏/仪表盘 |

---

### Task 31-37: W4 剩余测试文件

| Task | 文件 | 内容 |
|------|------|------|
| 31 | `w4/02-public-pages.spec.ts` | 18 个公开路由全覆盖 |
| 32 | `w4/03-public-detail.spec.ts` | waitFor("article_created") → 详情页 |
| 33 | `w4/04-search-filter.spec.ts` | 院校搜索/国家筛选/语言切换 |
| 34 | `w4/05-permission.spec.ts` | admin + portal 全拒绝 |
| 35 | `w4/06-security-jwt.spec.ts` | JWT 缺失/无效/篡改 |
| 36 | `w4/07-idor.spec.ts` | waitFor("idor_doc") → 越权访问被拒 |
| 37 | `w4/08-disabled.spec.ts` | waitFor("w4_disabled") → 验证 401 → waitFor("w4_enabled") → 恢复 |

---

### Task 38: shared 测试

**Files:**

- Create: `frontend/e2e/shared/auth-flow.spec.ts`

登录弹窗/tab 切换/登出，用独立 storageState（不影响任何 worker）。

---

## 阶段 3：迁移清理

### Task 39: 删除旧测试文件

- [ ] **Step 1: 删除旧目录**

```bash
rm -rf frontend/e2e/admin/ frontend/e2e/portal/ frontend/e2e/public/ frontend/e2e/auth/ frontend/e2e/layout/
rm -f frontend/e2e/cross-navigation.spec.ts frontend/e2e/permission-guard.spec.ts
rm -f frontend/e2e/helpers/api-endpoints.json frontend/e2e/helpers/page-routes.json
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor: 删除旧单 worker 测试文件"
```

---

### Task 40: 全量验证

- [ ] **Step 1: docker compose down -v && up -d（重建数据库加载新种子用户）**

- [ ] **Step 2: 构建生产镜像**

```bash
docker build -t ghcr.io/whw23/mudasky-frontend:latest -f frontend/Dockerfile frontend/
docker build -t ghcr.io/whw23/mudasky-gateway:latest gateway/
docker build -t ghcr.io/whw23/mudasky-api:latest -f backend/api/Dockerfile backend/
docker compose -f docker-compose.yml up -d --force-recreate
```

- [ ] **Step 3: 运行 E2E**

```bash
INTERNAL_SECRET=dev_internal_secret_9a8b7c6d5e4f3g2h1i0j \
  pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts --reporter=list
```

Expected:
```
[API Coverage] N/N (100.0%)
[Route Coverage] N/N (100.0%)
[Component Coverage] 21 components, 87/87 elements (100.0%)
[Security Coverage] 30/30 scenarios (100.0%)
0 failed, 0 skipped, 0 flaky
```

- [ ] **Step 4: 提交并合并到 dev**

```bash
git add -A
git commit -m "feat: E2E 多 worker 协作测试框架完成"
git checkout dev && git merge feat/e2e-multi-worker --no-edit
git push origin dev
```
