/**
 * E2E 覆盖率收集 fixture。
 * 记录测试期间触发的 API 端点和访问的页面路由，
 * 进程退出时写入 .coverage/ 目录供 global-teardown 汇总。
 */

import { test as base, expect } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const COVERAGE_DIR = path.join(__dirname, "..", ".coverage")
const UUID_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const LOCALE_PREFIX_RE = /^\/[a-z]{2}(?=\/)/

/** 收集到的 API 调用集合（当前 worker） */
const apiCalls = new Set<string>()

/** 收集到的页面路由集合（当前 worker） */
const visitedRoutes = new Set<string>()

/** 是否已注册退出钩子 */
let exitRegistered = false

/**
 * 注册进程退出钩子，将覆盖率数据写入磁盘。
 */
function ensureExitHook() {
  if (exitRegistered) return
  exitRegistered = true

  const workerId = process.env.TEST_WORKER_INDEX || "0"

  process.on("exit", () => {
    if (apiCalls.size === 0 && visitedRoutes.size === 0) return

    fs.mkdirSync(COVERAGE_DIR, { recursive: true })

    if (apiCalls.size > 0) {
      fs.writeFileSync(
        path.join(COVERAGE_DIR, `api-${workerId}.json`),
        JSON.stringify([...apiCalls].sort(), null, 2),
      )
    }

    if (visitedRoutes.size > 0) {
      fs.writeFileSync(
        path.join(COVERAGE_DIR, `routes-${workerId}.json`),
        JSON.stringify([...visitedRoutes].sort(), null, 2),
      )
    }
  })
}

/**
 * 将 API 路径中的 UUID 替换为 {id}。
 */
function normalizeApiPath(urlPath: string): string {
  return urlPath.replace(UUID_RE, "/{id}")
}

/**
 * 去掉 locale 前缀，返回标准化的页面路径。
 */
function normalizePagePath(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(LOCALE_PREFIX_RE, "")
  } catch {
    return url
  }
}

export const test = base.extend<{
  coveragePage: typeof base extends { extend: (f: infer _) => infer _ }
    ? never
    : never
}>({
  coveragePage: [
    async ({ page }, use) => {
      ensureExitHook()

      /* 记录 API 响应 */
      page.on("response", (response) => {
        const url = response.url()
        try {
          const parsed = new URL(url)
          if (parsed.pathname.startsWith("/api/")) {
            const method = response.request().method()
            const normalized = normalizeApiPath(parsed.pathname)
            apiCalls.add(`${method} ${normalized}`)
          }
        } catch {
          /* 忽略无效 URL */
        }
      })

      /* 记录页面导航 */
      page.on("framenavigated", (frame) => {
        /* 只记录主 frame */
        if (frame !== page.mainFrame()) return
        const url = frame.url()
        if (!url || url === "about:blank") return
        const pagePath = normalizePagePath(url)
        if (!pagePath.startsWith("/api/")) {
          visitedRoutes.add(pagePath)
        }
      })

      /* 可选：JS 覆盖率 */
      const collectJsCoverage = process.env.E2E_COVERAGE === "1"
      if (collectJsCoverage) {
        await page.coverage.startJSCoverage()
      }

      await use()

      if (collectJsCoverage) {
        const jsCoverage = await page.coverage.stopJSCoverage()
        const workerId = process.env.TEST_WORKER_INDEX || "0"
        const ts = Date.now()
        fs.mkdirSync(COVERAGE_DIR, { recursive: true })
        fs.writeFileSync(
          path.join(COVERAGE_DIR, `js-${workerId}-${ts}.json`),
          JSON.stringify(jsCoverage),
        )
      }
    },
    { auto: true },
  ],
})

export { expect }
