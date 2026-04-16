/**
 * Playwright 全局清理。
 * 测试结束后删除所有 E2E 测试创建的数据。
 */

import { chromium, type FullConfig } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.join(__dirname, ".auth", "admin.json")
const BASE = process.env.BASE_URL || "http://localhost"

async function globalTeardown(_config: FullConfig) {
  if (!fs.existsSync(AUTH_FILE)) return

  const browser = await chromium.launch()
  const context = await browser.newContext({
    locale: "zh-CN",
    storageState: AUTH_FILE,
  })
  const page = await context.newPage()

  const headers = { "X-Requested-With": "XMLHttpRequest" }

  /* 清理所有以 E2E 开头的测试数据 */
  const cleanups: { listPath: string; deletePath: string; nameField: string; idField: string }[] = [
    { listPath: "roles/meta/list", deletePath: "roles/meta/list/detail/delete", nameField: "name", idField: "role_id" },
    { listPath: "categories/list", deletePath: "categories/list/detail/delete", nameField: "name", idField: "category_id" },
    { listPath: "cases/list", deletePath: "cases/list/detail/delete", nameField: "student_name", idField: "case_id" },
    { listPath: "universities/list", deletePath: "universities/list/detail/delete", nameField: "name", idField: "university_id" },
    { listPath: "articles/list", deletePath: "articles/list/detail/delete", nameField: "title", idField: "article_id" },
  ]

  for (const { listPath, deletePath, nameField, idField } of cleanups) {
    try {
      const res = await page.request.get(
        `${BASE}/api/admin/${listPath}`,
        { headers },
      )
      if (res.ok()) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items ?? [])
        for (const item of items) {
          const name = typeof item[nameField] === "object"
            ? item[nameField]?.zh
            : item[nameField]
          if (name?.startsWith("E2E")) {
            await page.request.post(
              `${BASE}/api/admin/${deletePath}`,
              { headers, data: { [idField]: item.id } },
            ).catch(() => {})
          }
        }
      }
    } catch {
      /* 清理失败不阻塞 */
    }
  }

  /* 清理 E2E 测试用户 */
  try {
    const res = await page.request.get(
      `${BASE}/api/admin/users/list?keyword=E2E`,
      { headers },
    )
    if (res.ok()) {
      const data = await res.json()
      const items = data.items ?? data ?? []
      for (const user of items) {
        if (user.username?.startsWith("E2E")) {
          await page.request.post(
            `${BASE}/api/admin/users/list/detail/delete`,
            { headers, data: { user_id: user.id } },
          ).catch(() => {})
        }
      }
    }
  } catch {
    /* 清理失败不阻塞 */
  }

  await browser.close()

  /* === 覆盖率报告 === */
  const coverageDir = path.join(__dirname, ".coverage")
  if (fs.existsSync(coverageDir)) {
    try {
      // 手动解析 TS 文件中的数组（避免 Node 无法 import .ts）
      const parseArrayFromTs = (filePath: string): string[] => {
        const content = fs.readFileSync(filePath, "utf-8")
        const match = content.match(/\[[\s\S]*\]/)
        if (!match) return []
        // 提取引号内的字符串
        const items: string[] = []
        for (const m of match[0].matchAll(/"([^"]+)"/g)) {
          items.push(m[1])
        }
        return items
      }

      const API_ENDPOINTS = parseArrayFromTs(path.join(__dirname, "helpers", "api-endpoints.ts"))
      const PAGE_ROUTES = parseArrayFromTs(path.join(__dirname, "helpers", "page-routes.ts"))

      /** 路由匹配：去掉 locale 前缀，尝试动态段替换 */
      const matchRoute = (url: string): string | null => {
        const p = url.replace(/^\/[a-z]{2}(?=\/)/, "")
        if (PAGE_ROUTES.includes(p)) return p
        const segments = p.split("/")
        if (segments.length >= 3) {
          const pattern = [...segments.slice(0, -1), "[id]"].join("/")
          if (PAGE_ROUTES.includes(pattern)) return pattern
        }
        return null
      }

      /* 合并所有 worker 的 API 调用数据 */
      const allApiCalls = new Set<string>()
      const allRoutes = new Set<string>()

      const files = fs.readdirSync(coverageDir)
      for (const file of files) {
        const filePath = path.join(coverageDir, file)
        if (file.startsWith("api-") && file.endsWith(".json")) {
          const data: string[] = JSON.parse(fs.readFileSync(filePath, "utf-8"))
          data.forEach((ep) => allApiCalls.add(ep))
        } else if (file.startsWith("routes-") && file.endsWith(".json")) {
          const data: string[] = JSON.parse(fs.readFileSync(filePath, "utf-8"))
          data.forEach((r) => allRoutes.add(r))
        }
      }

      /* API 覆盖率 */
      const coveredApis = API_ENDPOINTS.filter((ep) => allApiCalls.has(ep))
      const uncoveredApis = API_ENDPOINTS.filter((ep) => !allApiCalls.has(ep))
      const apiPct = API_ENDPOINTS.length > 0
        ? ((coveredApis.length / API_ENDPOINTS.length) * 100).toFixed(1)
        : "0.0"

      console.log(`\n[API Coverage] ${coveredApis.length}/${API_ENDPOINTS.length} (${apiPct}%)`)
      if (uncoveredApis.length > 0) {
        console.log("  Uncovered:")
        uncoveredApis.forEach((ep) => console.log(`    - ${ep}`))
      }

      /* 路由覆盖率 */
      const matchedRoutes = new Set<string>()
      for (const url of allRoutes) {
        const matched = matchRoute(url)
        if (matched) matchedRoutes.add(matched)
      }
      const coveredRoutes = PAGE_ROUTES.filter((r) => matchedRoutes.has(r))
      const uncoveredRoutes = PAGE_ROUTES.filter((r) => !matchedRoutes.has(r))
      const routePct = PAGE_ROUTES.length > 0
        ? ((coveredRoutes.length / PAGE_ROUTES.length) * 100).toFixed(1)
        : "0.0"

      console.log(`\n[Route Coverage] ${coveredRoutes.length}/${PAGE_ROUTES.length} (${routePct}%)`)
      if (uncoveredRoutes.length > 0) {
        console.log("  Uncovered:")
        uncoveredRoutes.forEach((r) => console.log(`    - ${r}`))
      }
      console.log()

      /* 清理 .coverage/ 目录 */
      fs.rmSync(coverageDir, { recursive: true, force: true })
    } catch (e) {
      console.warn("[Coverage] 报告生成失败:", e)
    }
  }
}

export default globalTeardown
