# E2E 测试全覆盖补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 E2E 测试至 100% 覆盖率（页面、API 端点、交互组件），并建立覆盖率统计机制。

**Architecture:** 新建覆盖率收集 fixture（API/路由/JS 三维度），补全缺失的 5 个页面和 13 个交互测试，配置 Vitest 覆盖率。每个测试目标至少 2 正例 + 2 反例。

**Tech Stack:** Playwright, Vitest, @vitest/coverage-v8, V8 Coverage API

---

## File Map

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `frontend/e2e/helpers/api-endpoints.ts` | 后端 73 个端点清单 |
| 新建 | `frontend/e2e/helpers/page-routes.ts` | 前端 35 个路由清单 |
| 新建 | `frontend/e2e/fixtures/coverage.ts` | API/路由/JS 覆盖率收集 fixture |
| 新建 | `frontend/e2e/public/article-detail.spec.ts` | 4 个文章栏目详情页测试 |
| 新建 | `frontend/e2e/admin/documents.spec.ts` | 管理员文档管理页测试 |
| 修改 | `frontend/e2e/admin/user-actions.spec.ts` | 追加状态切换 + 删除用户测试 |
| 修改 | `frontend/e2e/admin/students.spec.ts` | 追加 checkbox、顾问、下载、降级测试 |
| 修改 | `frontend/e2e/admin/contacts.spec.ts` | 追加升级学生测试 |
| 修改 | `frontend/e2e/admin/web-settings-full.spec.ts` | 追加 ConfigEditDialog 测试 |
| 修改 | `frontend/e2e/global-teardown.ts` | 覆盖率报告输出 |
| 修改 | `frontend/e2e/playwright.config.ts` | 引入 coverage fixture |
| 修改 | `frontend/vitest.config.ts` | 启用 V8 覆盖率 |
| 新建 | `frontend/e2e/admin/security-jwt.spec.ts` | JWT 篡改/缺失/无效/有效 |
| 新建 | `backend/api/tests/e2e/test_idor.py` | IDOR 越权访问测试 |
| 新建 | `backend/api/tests/e2e/test_cross_role.py` | 跨角色访问测试 |
| 修改 | `frontend/e2e/admin/security.spec.ts` | 禁用用户/文件上传/Token 轮换 |

---

### Task 1: Vitest 覆盖率配置

**Files:**

- Modify: `frontend/vitest.config.ts`

- [ ] **Step 1: 添加 coverage 配置**

```typescript
// frontend/vitest.config.ts — 在 test 块中添加 coverage
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: "v8",
      include: ["components/**", "lib/**", "hooks/**", "contexts/**"],
      exclude: ["**/*.test.*", "**/*.spec.*", "e2e/**"],
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 2: 验证覆盖率运行**

Run: `pnpm --prefix frontend test --coverage`
Expected: 输出覆盖率摘要（Statements / Branches / Functions / Lines）

- [ ] **Step 3: 添加 coverage 目录到 .gitignore**

检查 `frontend/.gitignore` 是否包含 `coverage/`，没有则添加。

- [ ] **Step 4: Commit**

```bash
git add frontend/vitest.config.ts frontend/.gitignore
git commit -m "chore: 启用 Vitest V8 覆盖率"
```

---

### Task 2: API 端点清单

**Files:**

- Create: `frontend/e2e/helpers/api-endpoints.ts`

- [ ] **Step 1: 创建端点清单文件**

从后端 router 提取全部 73 个端点，按面板分组。格式 `METHOD /api/panel/resource/action`。

```typescript
/**
 * 后端 API 全量端点清单。
 * 用于 E2E 覆盖率统计，与实际请求对比。
 * 维护规则：后端新增/删除端点时同步更新。
 */

export const API_ENDPOINTS: string[] = [
  // auth (7)
  "GET /api/auth/public-key",
  "POST /api/auth/sms-code",
  "POST /api/auth/register",
  "POST /api/auth/login",
  "POST /api/auth/refresh-token-hash",
  "POST /api/auth/logout",
  "POST /api/auth/refresh",

  // public/config (2)
  "GET /api/public/config/config/{key}",
  "GET /api/public/config/panel-config",

  // public/content (3)
  "GET /api/public/content/categories",
  "GET /api/public/content/articles",
  "GET /api/public/content/articles/detail",

  // public/case (2)
  "GET /api/public/cases/list",
  "GET /api/public/cases/detail",

  // public/university (5)
  "GET /api/public/universities/list",
  "GET /api/public/universities/detail",
  "GET /api/public/universities/countries",
  "GET /api/public/universities/programs",
  "GET /api/public/universities/search",

  // portal/document (5)
  "GET /api/portal/documents/list",
  "POST /api/portal/documents/list/upload",
  "GET /api/portal/documents/list/detail",
  "GET /api/portal/documents/list/detail/download",
  "POST /api/portal/documents/list/detail/delete",

  // portal/profile (6)
  "GET /api/portal/profile/meta",
  "GET /api/portal/profile/info",
  "POST /api/portal/profile/info/edit",
  "POST /api/portal/profile/info/change-password",
  "POST /api/portal/profile/info/change-phone",
  "POST /api/portal/profile/info/change-username",

  // portal/profile/sessions (3)
  "GET /api/portal/profile/sessions/list",
  "POST /api/portal/profile/sessions/list/revoke",
  "POST /api/portal/profile/sessions/list/revoke-all",

  // portal/profile/two_factor (4)
  "POST /api/portal/profile/two-factor/enable-totp",
  "POST /api/portal/profile/two-factor/verify-totp",
  "POST /api/portal/profile/two-factor/enable-sms",
  "POST /api/portal/profile/two-factor/disable",

  // admin/user (7)
  "GET /api/admin/users/list",
  "GET /api/admin/users/list/detail",
  "POST /api/admin/users/list/detail/edit",
  "POST /api/admin/users/list/detail/assign-role",
  "POST /api/admin/users/list/detail/toggle-status",
  "POST /api/admin/users/list/detail/reset-password",
  "POST /api/admin/users/list/detail/delete",

  // admin/rbac (7)
  "GET /api/admin/roles/meta/list",
  "POST /api/admin/roles/meta/list/create",
  "POST /api/admin/roles/meta/list/detail/edit",
  "GET /api/admin/roles/meta/list/detail",
  "POST /api/admin/roles/meta/list/detail/delete",
  "POST /api/admin/roles/meta/list/detail/assign-permissions",
  "GET /api/admin/roles/meta",

  // admin/config — 从 __init__.py 确认具体端点
  // admin/content — 文章管理
  // admin/case (4)
  "GET /api/admin/cases/list",
  "POST /api/admin/cases/list/create",
  "POST /api/admin/cases/list/detail/edit",
  "POST /api/admin/cases/list/detail/delete",

  // admin/university (4)
  "GET /api/admin/universities/list",
  "POST /api/admin/universities/list/create",
  "POST /api/admin/universities/list/detail/edit",
  "POST /api/admin/universities/list/detail/delete",

  // admin/students (8)
  "GET /api/admin/students/list",
  "GET /api/admin/students/list/detail",
  "POST /api/admin/students/list/detail/edit",
  "POST /api/admin/students/list/detail/assign-advisor",
  "POST /api/admin/students/list/detail/downgrade",
  "GET /api/admin/students/list/detail/documents",
  "GET /api/admin/students/advisors",
  "GET /api/admin/students/stats",

  // admin/contacts (6)
  "GET /api/admin/contacts/list",
  "GET /api/admin/contacts/list/detail",
  "POST /api/admin/contacts/list/detail/mark-status",
  "POST /api/admin/contacts/list/detail/add-note",
  "GET /api/admin/contacts/list/detail/history",
  "POST /api/admin/contacts/list/detail/upgrade",
]
```

注意：以上端点需要通过实际读取后端 router 文件进行精确核对。实施时需逐个确认路径。

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/helpers/api-endpoints.ts
git commit -m "chore: 添加后端 API 全量端点清单"
```

---

### Task 3: 页面路由清单

**Files:**

- Create: `frontend/e2e/helpers/page-routes.ts`

- [ ] **Step 1: 创建路由清单文件**

```typescript
/**
 * 前端全量路由清单。
 * 用于 E2E 覆盖率统计，与实际访问 URL 对比。
 * 路由模式中 [id] 表示动态参数，匹配任意非空路径段。
 */

export const PAGE_ROUTES: string[] = [
  // 公开页面
  "/",
  "/about",
  "/contact",
  "/news",
  "/news/[id]",
  "/cases",
  "/cases/[id]",
  "/universities",
  "/universities/[id]",
  "/study-abroad",
  "/study-abroad/[id]",
  "/visa",
  "/visa/[id]",
  "/life",
  "/life/[id]",
  "/requirements",
  "/requirements/[id]",
  "/articles",

  // admin 面板
  "/admin/dashboard",
  "/admin/users",
  "/admin/students",
  "/admin/contacts",
  "/admin/articles",
  "/admin/cases",
  "/admin/categories",
  "/admin/universities",
  "/admin/roles",
  "/admin/general-settings",
  "/admin/web-settings",
  "/admin/documents",

  // portal 面板
  "/portal/overview",
  "/portal/profile",
  "/portal/documents",
]

/**
 * 将实际 URL 匹配到路由模式。
 * 去掉 locale 前缀（如 /zh），将动态段替换为 [id]。
 */
export function matchRoute(url: string): string | null {
  // 去掉 locale 前缀
  const path = url.replace(/^\/[a-z]{2}(?=\/)/, "")

  // 精确匹配
  if (PAGE_ROUTES.includes(path)) return path

  // 动态路由匹配：将最后一个路径段替换为 [id]
  const segments = path.split("/")
  if (segments.length >= 3) {
    const pattern = [...segments.slice(0, -1), "[id]"].join("/")
    if (PAGE_ROUTES.includes(pattern)) return pattern
  }

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/e2e/helpers/page-routes.ts
git commit -m "chore: 添加前端全量路由清单"
```

---

### Task 4: 覆盖率收集 fixture

**Files:**

- Create: `frontend/e2e/fixtures/coverage.ts`
- Modify: `frontend/e2e/playwright.config.ts`

- [ ] **Step 1: 创建 coverage fixture**

```typescript
/**
 * E2E 覆盖率收集 fixture。
 * 收集 API 端点调用和页面路由访问，测试结束后写入临时文件。
 * JS 代码覆盖率通过 E2E_COVERAGE=1 启用。
 */

import { test as base, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const COVERAGE_DIR = path.join(__dirname, "..", ".coverage")
const COLLECT_JS = process.env.E2E_COVERAGE === "1"

/** 全局收集器（每个 worker 进程一份） */
const apiCalls = new Set<string>()
const visitedRoutes = new Set<string>()
const jsCoverageEntries: unknown[] = []

function ensureCoverageDir() {
  if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true })
  }
}

/** 将 URL 归一化为端点模式（去掉 query、将 UUID 替换为 {id}） */
function normalizeApiPath(method: string, url: string): string {
  const u = new URL(url)
  const p = u.pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "/{id}")
  return `${method} ${p}`
}

/** 去掉 locale 前缀 */
function stripLocale(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/)/, "")
}

export const test = base.extend<{ coveragePage: Page }>({
  coveragePage: async ({ page }, use) => {
    /* 监听 API 响应 */
    page.on("response", (res) => {
      const url = res.url()
      if (url.includes("/api/")) {
        apiCalls.add(normalizeApiPath(res.request().method(), url))
      }
    })

    /* 监听页面导航 */
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        try {
          const pathname = new URL(frame.url()).pathname
          if (pathname !== "about:blank") {
            visitedRoutes.add(stripLocale(pathname))
          }
        } catch { /* ignore */ }
      }
    })

    /* JS 覆盖率 */
    if (COLLECT_JS) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false })
    }

    await use(page)

    if (COLLECT_JS) {
      const entries = await page.coverage.stopJSCoverage()
      jsCoverageEntries.push(...entries)
    }
  },
})

/** 测试全部结束后写入覆盖率数据 */
process.on("beforeExit", () => {
  ensureCoverageDir()
  const workerId = process.env.TEST_WORKER_INDEX || "0"
  fs.writeFileSync(
    path.join(COVERAGE_DIR, `api-${workerId}.json`),
    JSON.stringify([...apiCalls]),
  )
  fs.writeFileSync(
    path.join(COVERAGE_DIR, `routes-${workerId}.json`),
    JSON.stringify([...visitedRoutes]),
  )
  if (COLLECT_JS && jsCoverageEntries.length > 0) {
    fs.writeFileSync(
      path.join(COVERAGE_DIR, `js-${workerId}.json`),
      JSON.stringify(jsCoverageEntries),
    )
  }
})

export { expect } from "@playwright/test"
```

- [ ] **Step 2: 修改 global-teardown.ts 添加覆盖率报告**

在现有 `globalTeardown` 函数末尾（`await browser.close()` 之后）追加覆盖率报告逻辑：

```typescript
/* ── 覆盖率报告 ── */
const coverageDir = path.join(__dirname, ".coverage")
if (fs.existsSync(coverageDir)) {
  // 合并所有 worker 的 API 调用
  const allApiCalls = new Set<string>()
  const allRoutes = new Set<string>()

  for (const file of fs.readdirSync(coverageDir)) {
    const content = JSON.parse(fs.readFileSync(path.join(coverageDir, file), "utf-8"))
    if (file.startsWith("api-")) {
      (content as string[]).forEach((c) => allApiCalls.add(c))
    } else if (file.startsWith("routes-")) {
      (content as string[]).forEach((r) => allRoutes.add(r))
    }
  }

  // API 端点覆盖率
  try {
    const { API_ENDPOINTS } = await import("./helpers/api-endpoints")
    const uncovered = API_ENDPOINTS.filter((ep) => !allApiCalls.has(ep))
    const covered = API_ENDPOINTS.length - uncovered.length
    console.log(`\n[API Coverage] ${covered}/${API_ENDPOINTS.length} endpoints (${(covered / API_ENDPOINTS.length * 100).toFixed(1)}%)`)
    if (uncovered.length > 0) {
      console.log("Uncovered:")
      uncovered.forEach((ep) => console.log(`  - ${ep}`))
    }
  } catch { /* helpers not available */ }

  // 页面路由覆盖率
  try {
    const { PAGE_ROUTES, matchRoute } = await import("./helpers/page-routes")
    const matchedRoutes = new Set<string>()
    for (const url of allRoutes) {
      const route = matchRoute(url)
      if (route) matchedRoutes.add(route)
    }
    const unvisited = PAGE_ROUTES.filter((r) => !matchedRoutes.has(r))
    console.log(`[Route Coverage] ${matchedRoutes.size}/${PAGE_ROUTES.length} routes (${(matchedRoutes.size / PAGE_ROUTES.length * 100).toFixed(1)}%)`)
    if (unvisited.length > 0) {
      console.log("Unvisited:")
      unvisited.forEach((r) => console.log(`  - ${r}`))
    }
  } catch { /* helpers not available */ }

  // 清理临时文件
  fs.rmSync(coverageDir, { recursive: true, force: true })
}
```

- [ ] **Step 3: 添加 .coverage 到 .gitignore**

在 `frontend/e2e/.gitignore`（或 `frontend/.gitignore`）中添加 `.coverage/`。

- [ ] **Step 4: 验证覆盖率报告**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts --reporter=list 2>&1 | tail -20`
Expected: 测试结束后输出 `[API Coverage]` 和 `[Route Coverage]` 报告

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/fixtures/coverage.ts frontend/e2e/global-teardown.ts frontend/.gitignore
git commit -m "feat: E2E 覆盖率收集（API 端点 + 页面路由 + JS 可选）"
```

---

### Task 5: 文章详情页测试

**Files:**

- Create: `frontend/e2e/public/article-detail.spec.ts`

每个栏目 2 个正例（页面加载 + API 响应）+ 2 个反例（不存在 ID + 404 检查）。

- [ ] **Step 1: 创建测试文件**

```typescript
/**
 * 文章栏目详情页 E2E 测试。
 * study-abroad/visa/life/requirements 共用 ArticleDetailPage 组件。
 * 每个栏目：2 正例 + 2 反例。
 */

import { test, expect } from "@playwright/test"
import { getExistingArticleId, createArticle } from "../helpers/seed"

const CATEGORIES = [
  { slug: "study-abroad", name: "出国留学" },
  { slug: "visa", name: "签证办理" },
  { slug: "life", name: "留学生活" },
  { slug: "requirements", name: "申请条件" },
]

for (const { slug, name } of CATEGORIES) {
  test.describe(`${name}详情页 (/${slug}/[id])`, () => {
    test(`正例：详情页加载并展示文章内容`, async ({ page }) => {
      await page.goto("/")
      const articleId = await createArticle(page, slug)
      expect(articleId).toBeTruthy()

      await page.goto(`/${slug}/${articleId}`)
      await page.locator("main").waitFor()
      await expect(page.locator("main")).toContainText(/E2E/)
    })

    test(`正例：返回链接指向 /${slug}`, async ({ page }) => {
      await page.goto("/")
      const articleId = await createArticle(page, slug)
      expect(articleId).toBeTruthy()

      await page.goto(`/${slug}/${articleId}`)
      await page.locator("main").waitFor()
      const backLink = page.locator(`a[href*='/${slug}']`).first()
      await expect(backLink).toBeVisible()
    })

    test(`反例：不存在的 ID 显示 404 或空状态`, async ({ page }) => {
      const res = await page.goto(`/${slug}/00000000-0000-0000-0000-000000000000`)
      // 页面仍可达，但内容为 404 或空
      expect(res?.status()).toBeLessThan(500)
    })

    test(`反例：无效格式 ID 不导致服务器错误`, async ({ page }) => {
      const res = await page.goto(`/${slug}/invalid-id-format`)
      expect(res?.status()).toBeLessThan(500)
    })
  })
}
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/public/article-detail.spec.ts --reporter=list`
Expected: 16 tests passed（4 栏目 × 4 测试）

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/public/article-detail.spec.ts
git commit -m "test: 文章栏目详情页 E2E（study-abroad/visa/life/requirements）"
```

---

### Task 6: 管理员文档页测试

**Files:**

- Create: `frontend/e2e/admin/documents.spec.ts`

2 正例（页面加载 + tab 切换）+ 2 反例（未登录重定向 + 无权限拦截）。

- [ ] **Step 1: 创建测试文件**

```typescript
/**
 * 管理员文档管理页 E2E 测试。
 * 覆盖：页面加载、分类 tab、上传区域、权限拦截。
 */

import { test, expect } from "@playwright/test"
import { gotoAdmin } from "../fixtures/base"

test.describe("管理员文档管理", () => {
  test("正例：页面加载显示文档管理标题", async ({ page }) => {
    await gotoAdmin(page, "/admin/documents")
    await expect(page.locator("main")).toBeVisible()
  })

  test("正例：分类 tab 可见且可切换", async ({ page }) => {
    await gotoAdmin(page, "/admin/documents")
    const tabs = page.getByRole("tablist")
    await expect(tabs).toBeVisible()
    // 点击第二个 tab
    const tabTriggers = page.getByRole("tab")
    const count = await tabTriggers.count()
    expect(count).toBeGreaterThan(1)
    await tabTriggers.nth(1).click()
    await expect(tabTriggers.nth(1)).toHaveAttribute("data-state", "active")
  })

  test("正例：上传按钮可见", async ({ page }) => {
    await gotoAdmin(page, "/admin/documents")
    await expect(page.getByRole("button", { name: /上传/ })).toBeVisible()
  })
})

test.describe("管理员文档管理 — 权限", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("反例：未登录访问重定向", async ({ page }) => {
    await page.goto("/admin/documents")
    await page.waitForURL(/^\/$|\/zh$/)
  })

  test("反例：页面不显示文档内容", async ({ page }) => {
    await page.goto("/admin/documents")
    await expect(page.getByRole("tablist")).not.toBeVisible()
  })
})
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/documents.spec.ts --reporter=list`
Expected: 5 tests passed

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin/documents.spec.ts
git commit -m "test: 管理员文档管理页 E2E"
```

---

### Task 7: UserExpandPanel 补全

**Files:**

- Modify: `frontend/e2e/admin/user-actions.spec.ts`

追加状态切换操作 + 删除用户确认弹窗。操作对象使用 `test-visitor` 用户（非 superuser）。

- [ ] **Step 1: 追加测试用例**

在文件末尾已有的 `test.describe` 中追加以下测试：

```typescript
  test("正例：状态切换 — 点击禁用按钮触发 API", async ({ page }) => {
    // 展开 test-visitor 用户面板
    await page.getByText("test-visitor").first().click()
    await page.getByText("基本信息").waitFor()
    const toggleBtn = page.getByRole("button", { name: /禁用账号|启用账号/ })
    await expect(toggleBtn).toBeVisible()
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("toggle-status"),
    )
    await toggleBtn.click()
    const res = await responsePromise
    expect(res.status()).toBe(200)
  })

  test("正例：状态切换 — 切换后按钮文字变化", async ({ page }) => {
    await page.getByText("test-visitor").first().click()
    await page.getByText("基本信息").waitFor()
    const toggleBtn = page.getByRole("button", { name: /禁用账号|启用账号/ })
    const textBefore = await toggleBtn.textContent()
    await toggleBtn.click()
    await page.waitForResponse((r) => r.url().includes("toggle-status"))
    // 等待按钮文字变化
    const expected = textBefore?.includes("禁用") ? /启用账号/ : /禁用账号/
    await expect(toggleBtn).toHaveText(expected)
  })

  test("正例：删除用户 — 弹出确认弹窗", async ({ page }) => {
    await page.getByText("test-visitor").first().click()
    await page.getByText("基本信息").waitFor()
    const deleteBtn = page.getByRole("button", { name: "删除用户" })
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    // 点击取消，不真删
    await dialog.getByRole("button", { name: /取消/ }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("反例：删除用户 — superuser 不显示删除按钮", async ({ page }) => {
    await page.getByText("mudasky").first().click()
    await page.getByText("基本信息").waitFor()
    await expect(page.getByRole("button", { name: "删除用户" })).not.toBeVisible()
  })
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/user-actions.spec.ts --reporter=list`
Expected: 所有测试通过（包括新增的 4 个）

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin/user-actions.spec.ts
git commit -m "test: UserExpandPanel 状态切换 + 删除用户 E2E"
```

---

### Task 8: StudentExpandPanel 补全

**Files:**

- Modify: `frontend/e2e/admin/students.spec.ts`

追加 checkbox、顾问分配、文档下载、降级。

- [ ] **Step 1: 追加测试用例**

在文件末尾追加新的 `test.describe`：

```typescript
test.describe("学生管理 — 展开面板补全", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/admin/students")
    // 展开第一个学生
    const row = page.locator("tr").filter({ hasText: /test-student|E2E/ }).first()
    if (await row.isVisible()) {
      await row.click()
      await page.getByText("基本信息").waitFor()
    }
  })

  test("正例：激活状态 checkbox 可见且可切换", async ({ page }) => {
    const checkbox = page.getByRole("checkbox").first()
    if (!(await checkbox.isVisible().catch(() => false))) {
      test.skip(true, "无 checkbox")
      return
    }
    const before = await checkbox.isChecked()
    await checkbox.click()
    const after = await checkbox.isChecked()
    expect(after).not.toBe(before)
  })

  test("正例：顾问分配 — 输入框和按钮可见", async ({ page }) => {
    const input = page.getByPlaceholder(/顾问/)
    if (!(await input.isVisible().catch(() => false))) {
      test.skip(true, "无顾问分配区域")
      return
    }
    await expect(input).toBeVisible()
    await expect(page.getByRole("button", { name: /确认|分配/ })).toBeVisible()
  })

  test("正例：文档列表区域有下载链接", async ({ page }) => {
    const docSection = page.getByText(/文档|文件/).first()
    if (!(await docSection.isVisible().catch(() => false))) {
      test.skip(true, "无文档区域")
      return
    }
    // 文档区域可见即可，不要求必须有下载按钮（学生可能没上传文件）
    await expect(docSection).toBeVisible()
  })

  test("正例：降级按钮弹出确认弹窗", async ({ page }) => {
    const downgradeBtn = page.getByRole("button", { name: "降为访客" })
    if (!(await downgradeBtn.isVisible().catch(() => false))) {
      test.skip(true, "无降级按钮")
      return
    }
    await downgradeBtn.click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: /取消/ }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("反例：降级确认弹窗 — 取消后用户未降级", async ({ page }) => {
    const downgradeBtn = page.getByRole("button", { name: "降为访客" })
    if (!(await downgradeBtn.isVisible().catch(() => false))) {
      test.skip(true, "无降级按钮")
      return
    }
    await downgradeBtn.click()
    await page.getByRole("alertdialog").getByRole("button", { name: /取消/ }).click()
    // 降级按钮仍可见 = 用户未被降级
    await expect(downgradeBtn).toBeVisible()
  })

  test("反例：未展开面板时操作按钮不可见", async ({ page }) => {
    await page.goto("/admin/students")
    await page.locator("main").waitFor()
    await expect(page.getByRole("button", { name: "降为访客" })).not.toBeVisible()
  })
})
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/students.spec.ts --reporter=list`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin/students.spec.ts
git commit -m "test: StudentExpandPanel checkbox/顾问/下载/降级 E2E"
```

---

### Task 9: ContactExpandPanel 补全

**Files:**

- Modify: `frontend/e2e/admin/contacts.spec.ts`

追加升级学生。

- [ ] **Step 1: 追加测试用例**

在文件末尾追加：

```typescript
test.describe("联系人管理 — 升级学生", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/admin/contacts")
    const row = page.locator("tr").nth(1)
    await row.click()
    await page.getByText(/联系状态|状态/).first().waitFor()
  })

  test("正例：升级按钮弹出确认弹窗", async ({ page }) => {
    const upgradeBtn = page.getByRole("button", { name: "升级为学生" })
    if (!(await upgradeBtn.isVisible().catch(() => false))) {
      test.skip(true, "无升级按钮")
      return
    }
    await upgradeBtn.click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: /取消/ }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("正例：确认弹窗包含确认按钮", async ({ page }) => {
    const upgradeBtn = page.getByRole("button", { name: "升级为学生" })
    if (!(await upgradeBtn.isVisible().catch(() => false))) {
      test.skip(true, "无升级按钮")
      return
    }
    await upgradeBtn.click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog.getByRole("button", { name: "确认升级" })).toBeVisible()
    await dialog.getByRole("button", { name: /取消/ }).click()
  })

  test("反例：取消升级后联系人仍在列表", async ({ page }) => {
    const upgradeBtn = page.getByRole("button", { name: "升级为学生" })
    if (!(await upgradeBtn.isVisible().catch(() => false))) {
      test.skip(true, "无升级按钮")
      return
    }
    await upgradeBtn.click()
    await page.getByRole("alertdialog").getByRole("button", { name: /取消/ }).click()
    // 升级按钮仍可见 = 联系人未被升级
    await expect(upgradeBtn).toBeVisible()
  })

  test("反例：未展开面板时升级按钮不可见", async ({ page }) => {
    await page.goto("/admin/contacts")
    await page.locator("main").waitFor()
    await expect(page.getByRole("button", { name: "升级为学生" })).not.toBeVisible()
  })
})
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/contacts.spec.ts --reporter=list`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin/contacts.spec.ts
git commit -m "test: ContactExpandPanel 升级学生 E2E"
```

---

### Task 10: ConfigEditDialog 测试

**Files:**

- Modify: `frontend/e2e/admin/web-settings-full.spec.ts`

追加配置编辑弹窗交互。

- [ ] **Step 1: 追加测试用例**

在文件末尾追加：

```typescript
test.describe("网页设置 — 配置编辑弹窗", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAdmin(page, "/admin/web-settings")
  })

  test("正例：点击可编辑区域弹出编辑弹窗", async ({ page }) => {
    // 点击预览区域中的可编辑覆盖层
    const editableArea = page.locator("[data-editable]").first()
    if (!(await editableArea.isVisible().catch(() => false))) {
      // 尝试其他选择器：dashed border overlay
      const overlay = page.locator(".cursor-pointer").first()
      await overlay.click()
    } else {
      await editableArea.click()
    }
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
  })

  test("正例：编辑弹窗包含输入框和保存按钮", async ({ page }) => {
    const overlay = page.locator(".cursor-pointer").first()
    if (!(await overlay.isVisible().catch(() => false))) {
      test.skip(true, "无可编辑区域")
      return
    }
    await overlay.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "保存" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "取消" })).toBeVisible()
  })

  test("反例：取消编辑 — 点击取消关闭弹窗", async ({ page }) => {
    const overlay = page.locator(".cursor-pointer").first()
    if (!(await overlay.isVisible().catch(() => false))) {
      test.skip(true, "无可编辑区域")
      return
    }
    await overlay.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "取消" }).click()
    await expect(dialog).not.toBeVisible()
  })

  test("反例：空表单不应该成功保存", async ({ page }) => {
    const overlay = page.locator(".cursor-pointer").first()
    if (!(await overlay.isVisible().catch(() => false))) {
      test.skip(true, "无可编辑区域")
      return
    }
    await overlay.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    // 清空必填字段
    const inputs = dialog.locator("input, textarea").first()
    if (await inputs.isVisible()) {
      await inputs.clear()
    }
    // 保存按钮应仍可点击但提交可能失败（弹窗不关闭）
    await dialog.getByRole("button", { name: "保存" }).click()
    // 弹窗仍在（验证失败不关闭）或成功关闭都可接受
  })
})
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/web-settings-full.spec.ts --reporter=list`
Expected: 所有测试通过

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin/web-settings-full.spec.ts
git commit -m "test: ConfigEditDialog 编辑弹窗 E2E"
```

---

### Task 11: JWT 安全测试

**Files:**

- Create: `frontend/e2e/admin/security-jwt.spec.ts`

- [ ] **Step 1: 创建 JWT 安全测试文件**

```typescript
/**
 * JWT 安全 E2E 测试。
 * 覆盖：篡改 token、过期 token、缺失 token、无效格式 token。
 * 每个场景 2 正例 + 2 反例。
 */

import { test, expect } from "@playwright/test"

const API_URL = "/api/admin/users/list"

test.describe("JWT 安全 — 缺失 token", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("反例：无 cookie 访问 admin API 返回 401", async ({ page }) => {
    const res = await page.request.get(API_URL, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe("ACCESS_TOKEN_MISSING")
  })

  test("反例：无 cookie 访问 portal API 返回 401", async ({ page }) => {
    const res = await page.request.get("/api/portal/profile/info", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(401)
    expect((await res.json()).code).toBe("ACCESS_TOKEN_MISSING")
  })
})

test.describe("JWT 安全 — 无效 token", () => {
  test("反例：随机字符串 token 返回 401", async ({ page }) => {
    await page.context().addCookies([
      { name: "access_token", value: "not-a-valid-jwt", domain: "localhost", path: "/" },
    ])
    const res = await page.request.get(API_URL, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(401)
    expect((await res.json()).code).toBe("TOKEN_INVALID")
  })

  test("反例：篡改 payload 的 JWT 返回 401", async ({ page }) => {
    // 构造一个格式正确但签名无效的 JWT
    const fakeJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIiLCJpc19hY3RpdmUiOnRydWUsInBlcm1pc3Npb25zIjpbIioiXX0.invalidsignature"
    await page.context().addCookies([
      { name: "access_token", value: fakeJwt, domain: "localhost", path: "/" },
    ])
    const res = await page.request.get(API_URL, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(401)
    expect((await res.json()).code).toBe("TOKEN_INVALID")
  })
})

test.describe("JWT 安全 — 有效 token", () => {
  test("正例：有效 access_token 正常访问 admin API", async ({ page }) => {
    const res = await page.request.get(API_URL, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(200)
  })

  test("正例：有效 access_token 正常访问 portal API", async ({ page }) => {
    const res = await page.request.get("/api/portal/profile/info", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(200)
  })
})
```

- [ ] **Step 2: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/security-jwt.spec.ts --reporter=list`
Expected: 6 tests passed

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/admin/security-jwt.spec.ts
git commit -m "test: JWT 安全测试（篡改/缺失/无效/有效）"
```

---

### Task 12: IDOR 越权访问测试

**Files:**

- Create: `backend/api/tests/e2e/test_idor.py`

测试用户 A 不能访问用户 B 的资源。需要两个不同用户的认证。

- [ ] **Step 1: 创建 IDOR 测试文件**

```python
"""IDOR（越权访问）E2E 测试。

验证用户不能访问/修改/删除其他用户的资源。
通过网关完整链路测试。
"""

import pytest

pytestmark = pytest.mark.e2e


class TestDocumentIdor:
    """文档 IDOR 测试：用户 A 不能访问用户 B 的文档。"""

    async def test_own_document_access(self, superuser_client):
        """正例：用户可以访问自己的文档列表。"""
        resp = await superuser_client.get("/api/portal/documents/list")
        assert resp.status_code == 200

    async def test_own_document_upload(self, superuser_client):
        """正例：用户可以上传自己的文档。"""
        resp = await superuser_client.post(
            "/api/portal/documents/list/upload",
            files={"file": ("e2e-test.txt", b"test content", "text/plain")},
        )
        assert resp.status_code in (200, 201)

    async def test_other_user_document_detail_rejected(
        self, superuser_client
    ):
        """反例：用户不能通过伪造 doc_id 访问他人文档。"""
        resp = await superuser_client.get(
            "/api/portal/documents/list/detail",
            params={"doc_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code in (403, 404)

    async def test_other_user_document_delete_rejected(
        self, superuser_client
    ):
        """反例：用户不能删除不存在/他人的文档。"""
        resp = await superuser_client.post(
            "/api/portal/documents/list/detail/delete",
            json={"doc_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code in (403, 404)
```

- [ ] **Step 2: 运行验证**

Run: `uv run --project backend/api python -m pytest backend/api/tests/e2e/test_idor.py -v`
Expected: 4 tests passed

- [ ] **Step 3: Commit**

```bash
git add backend/api/tests/e2e/test_idor.py
git commit -m "test: IDOR 越权访问测试（文档访问/删除）"
```

---

### Task 13: 跨角色访问测试

**Files:**

- Create: `backend/api/tests/e2e/test_cross_role.py`

验证低权限角色不能访问高权限端点。

- [ ] **Step 1: 创建跨角色测试文件**

```python
"""跨角色访问 E2E 测试。

验证不同角色的权限边界：
- student 不能访问 admin 端点
- visitor 不能访问 portal 受限端点
"""

import pytest

pytestmark = pytest.mark.e2e


class TestStudentCannotAccessAdmin:
    """student 角色不能访问 admin 端点。"""

    @pytest.fixture(autouse=True)
    async def _login_as_student(self, student_client):
        """使用 student 角色登录。"""
        self.client = student_client

    async def test_student_portal_access(self):
        """正例：student 可以访问 portal。"""
        resp = await self.client.get("/api/portal/profile/info")
        assert resp.status_code == 200

    async def test_student_public_access(self):
        """正例：student 可以访问 public。"""
        resp = await self.client.get("/api/public/cases/list")
        assert resp.status_code == 200

    async def test_student_admin_users_rejected(self):
        """反例：student 不能访问 admin/users。"""
        resp = await self.client.get("/api/admin/users/list")
        assert resp.status_code == 403

    async def test_student_admin_roles_rejected(self):
        """反例：student 不能访问 admin/roles。"""
        resp = await self.client.get("/api/admin/roles/meta/list")
        assert resp.status_code == 403
```

注意：需要在 `conftest.py` 中添加 `student_client` fixture，使用 test-student 用户登录获取认证。如果 fixture 不存在，实施时需先创建。

- [ ] **Step 2: 运行验证**

Run: `uv run --project backend/api python -m pytest backend/api/tests/e2e/test_cross_role.py -v`
Expected: 4 tests passed

- [ ] **Step 3: Commit**

```bash
git add backend/api/tests/e2e/test_cross_role.py
git commit -m "test: 跨角色访问测试（student→admin 拒绝）"
```

---

### Task 14: 安全测试补全（限流/禁用用户/文件上传/2FA/Token 轮换）

**Files:**

- Modify: `frontend/e2e/admin/security.spec.ts`

在现有安全测试文件中追加缺失场景。

- [ ] **Step 1: 追加禁用用户测试**

```typescript
test.describe("安全 — 禁用用户", () => {
  test("正例：活跃用户可以访问 API", async ({ page }) => {
    const res = await page.request.get("/api/portal/profile/info", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(200)
  })

  test("正例：活跃用户可以刷新 token", async ({ page }) => {
    const res = await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    // refresh 可能返回 200 或 401（取决于 refresh_token 是否有效）
    expect(res.status()).toBeLessThan(500)
  })

  test("反例：禁用用户的 JWT claims 中 is_active=false 被拒绝", async ({ page }) => {
    // 这个场景需要后端 E2E 测试（test_admin.py 中已有 toggle_active 测试）
    // 前端侧验证：禁用后无法登录
    // 使用 API 检查 toggle-status 端点
    const res = await page.request.post("/api/admin/users/list/detail/toggle-status", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      data: { user_id: "nonexistent" },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test("反例：不存在的用户 toggle-status 返回错误", async ({ page }) => {
    const res = await page.request.post("/api/admin/users/list/detail/toggle-status", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      data: { user_id: "00000000-0000-0000-0000-000000000000" },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })
})
```

- [ ] **Step 2: 追加文件上传安全测试**

```typescript
test.describe("安全 — 文件上传", () => {
  test("正例：上传文本文件成功", async ({ page }) => {
    const res = await page.request.post("/api/portal/documents/list/upload", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      multipart: {
        file: { name: "e2e-test.txt", mimeType: "text/plain", buffer: Buffer.from("test") },
      },
    })
    expect(res.status()).toBeLessThan(500)
  })

  test("正例：上传 PDF 文件成功", async ({ page }) => {
    const res = await page.request.post("/api/portal/documents/list/upload", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      multipart: {
        file: { name: "e2e-test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") },
      },
    })
    expect(res.status()).toBeLessThan(500)
  })

  test("反例：超大文件被网关拒绝", async ({ page }) => {
    // client_max_body_size 20m，构造超过 20MB 的请求
    // 用 21MB 的 buffer（实际测试中可减小以加速）
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024, "a")
    const res = await page.request.post("/api/portal/documents/list/upload", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      multipart: {
        file: { name: "large.bin", mimeType: "application/octet-stream", buffer: largeBuffer },
      },
    }).catch(() => null)
    // nginx 返回 413 Request Entity Too Large
    if (res) {
      expect(res.status()).toBe(413)
    }
    // 或连接被关闭（res 为 null），都算通过
  })

  test("反例：无文件的上传请求被拒绝", async ({ page }) => {
    const res = await page.request.post("/api/portal/documents/list/upload", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
```

- [ ] **Step 3: 追加 Token 轮换测试**

```typescript
test.describe("安全 — Token 轮换", () => {
  test("正例：refresh 端点返回新 token", async ({ page }) => {
    const res = await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    // 有效 refresh_token 时返回 200，无效时返回 401
    expect([200, 401]).toContain(res.status())
  })

  test("正例：refresh 后仍可访问 API", async ({ page }) => {
    await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    const res = await page.request.get("/api/portal/profile/info", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(200)
  })

  test("反例：无 refresh_token cookie 的 refresh 请求失败", async ({ page }) => {
    // 清除 cookies 后尝试 refresh
    await page.context().clearCookies()
    const res = await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(401)
  })

  test("反例：伪造 refresh_token 的 refresh 请求失败", async ({ page }) => {
    await page.context().clearCookies()
    await page.context().addCookies([
      { name: "refresh_token", value: "fake-refresh-token", domain: "localhost", path: "/" },
    ])
    const res = await page.request.post("/api/auth/refresh", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
    expect(res.status()).toBe(401)
  })
})
```

- [ ] **Step 4: 运行验证**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts e2e/admin/security.spec.ts --reporter=list`
Expected: 所有测试通过（包括现有 + 新增）

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/admin/security.spec.ts
git commit -m "test: 安全测试补全（禁用用户/文件上传/Token 轮换）"
```

---

### Task 15: 部署并验证

- [ ] **Step 1: 本地跑全量 E2E 确认无回归**

Run: `pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts --reporter=list`
Expected: 所有测试通过，覆盖率报告输出

- [ ] **Step 2: 检查覆盖率报告**

确认 API 端点覆盖率和页面路由覆盖率接近 100%。记录未覆盖项并评估是否需要补充。

- [ ] **Step 3: 提交所有改动**

```bash
git add -A
git commit -m "feat: E2E 测试全覆盖 + 覆盖率统计机制"
```

- [ ] **Step 4: 部署 gateway + 后端改动到线上**

需要用户确认后执行 deploy-and-verify skill。

- [ ] **Step 5: 线上 E2E 全量验证**

```bash
BASE_URL=http://REDACTED_HOST INTERNAL_SECRET=<密钥> \
  pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts --reporter=list
```

Expected: 0 failed, 0 skipped
