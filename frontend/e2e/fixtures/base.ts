/**
 * E2E 测试共享 fixtures。
 * 登录通过 globalSetup + storageState 处理。
 * 覆盖率收集（API 端点 + 页面路由 + 组件交互 + 安全场景）自动启用。
 */

import { test as pwTest, expect, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

/* ── 覆盖率收集 ── */

const COVERAGE_DIR = path.join(__dirname, "..", ".coverage")
const UUID_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const LOCALE_PREFIX_RE = /^\/[a-z]{2}(?=\/)/

const apiCalls = new Set<string>()
const visitedRoutes = new Set<string>()
const componentInteractions = new Set<string>()
const securityScenarios = new Set<string>()
let exitRegistered = false

/** 注册进程退出钩子，将覆盖率数据写入磁盘。 */
function ensureExitHook() {
  if (exitRegistered) return
  exitRegistered = true

  const workerId = process.env.TEST_WORKER_INDEX || "0"

  process.on("exit", () => {
    if (apiCalls.size === 0 && visitedRoutes.size === 0 && componentInteractions.size === 0 && securityScenarios.size === 0) return
    fs.mkdirSync(COVERAGE_DIR, { recursive: true })

    const write = (name: string, data: Set<string>) => {
      if (data.size > 0) {
        fs.writeFileSync(
          path.join(COVERAGE_DIR, `${name}-${workerId}.json`),
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

/** 将 API 路径中的 UUID 替换为 {id}。 */
function normalizeApiPath(urlPath: string): string {
  return urlPath.replace(UUID_RE, "/{id}")
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

/** 给 page 绑定覆盖率监听器。 */
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
      if (parsed.pathname !== "/" || parsed.pathname === "/") {
        const stripped = parsed.pathname.replace(LOCALE_PREFIX_RE, "")
        if (!stripped.startsWith("/api/")) {
          visitedRoutes.add(stripped)
        }
      }
    } catch { /* 忽略 */ }
  })
}

/* ── 辅助函数 ── */

/**
 * 导航到页面并等待 main 区域渲染。
 * 不加自定义超时 — 页面已在 globalSetup 中预热编译。
 */
export async function gotoAdmin(page: Page, pagePath: string) {
  await page.goto(pagePath)
  await page.locator("main").waitFor()
}

/**
 * 点击按钮并等待 dialog 出现。
 * 处理 JS 还未水合导致首次 click 无效的情况。
 */
export async function clickAndWaitDialog(page: Page, buttonName: string) {
  const btn = page.getByRole("button", { name: buttonName })
  const dialog = page.getByRole("dialog")

  for (let i = 0; i < 3; i++) {
    await btn.click()
    try {
      await dialog.waitFor({ timeout: 2_000 })
      return
    } catch {
      /* 水合未完成，重试 */
    }
  }
  await btn.click()
  await dialog.waitFor()
}

/** 包装 page.request 的 get/post 方法，记录 API 调用。 */
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

/* ── 熔断机制 ── */

const BREAKER_DIR = path.join(__dirname, "..", ".circuit-breaker")

/**
 * 触发熔断 — 当前 project 后续所有测试立即终止。
 * 典型场景：auth 失败（非预期 401）、关键依赖不可用。
 */
export function tripBreaker(project: string, reason: string): void {
  fs.mkdirSync(BREAKER_DIR, { recursive: true })
  fs.writeFileSync(path.join(BREAKER_DIR, `${project}.txt`), reason)
}

/** 检查当前 project 是否已熔断。 */
function checkBreaker(project: string): void {
  const file = path.join(BREAKER_DIR, `${project}.txt`)
  if (fs.existsSync(file)) {
    const reason = fs.readFileSync(file, "utf-8")
    throw new Error(`[熔断] ${project} 已终止: ${reason}`)
  }
}

/** 清理所有熔断信号（global-setup / global-teardown 调用）。 */
export function cleanupBreakers(): void {
  if (fs.existsSync(BREAKER_DIR)) {
    fs.rmSync(BREAKER_DIR, { recursive: true, force: true })
  }
}

/* ── test fixture ── */

export const test = pwTest.extend<{
  adminPage: Page
}>({
  // 每个测试开始前：检查熔断 → 绑定覆盖率监听 → 监控 auth 失败
  page: async ({ page }, use, testInfo) => {
    checkBreaker(testInfo.project.name)
    attachCoverageListeners(page)
    wrapApiRequest(page)

    // 监控非预期 401 — 自动触发熔断
    page.on("response", (res) => {
      if (
        res.status() === 401 &&
        res.url().includes("/api/") &&
        !res.url().includes("/api/auth/") && // auth 端点的 401 是正常的
        !testInfo.title.includes("反例") &&
        !testInfo.title.includes("负向") &&
        !testInfo.title.includes("被拒") &&
        !testInfo.title.includes("401") &&
        !testInfo.title.includes("禁用")
      ) {
        tripBreaker(
          testInfo.project.name,
          `非预期 401: ${res.url()} (in: ${testInfo.title})`,
        )
      }
    })

    await use(page)
  },
  adminPage: async ({ page }, use) => {
    await use(page)
  },
})

export { expect }
