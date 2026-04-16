/**
 * Playwright 全局清理。
 * 1. 删除所有 E2E 测试创建的数据（E2E- 前缀）
 * 2. 六维度覆盖率报告（API / 路由 / 组件 / 安全）
 * 3. 清理信号文件和 .coverage 目录
 */

import { chromium, type FullConfig, type Page } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"
import { cleanup as cleanupSignals } from "./helpers/signal"
import { cleanupBreakers } from "./fixtures/base"

const AUTH_FILE = path.join(__dirname, ".auth", "w1.json")
const BASE = process.env.BASE_URL || "http://localhost"
const COVERAGE_DIR = path.join(__dirname, ".coverage")
const HELPERS_DIR = path.join(__dirname, "helpers")

/* ── OpenAPI 端点自动发现 ── */

/** 从 OpenAPI schema 自动发现所有 API 端点。 */
async function discoverApiEndpoints(
  baseUrl: string,
  cookies: string,
): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/openapi.json`, {
    headers: { "X-Requested-With": "XMLHttpRequest", Cookie: cookies },
  })
  if (!res.ok) return []
  const spec = await res.json()
  const endpoints: string[] = []
  for (const [apiPath, methods] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(methods as Record<string, unknown>)) {
      if (["get", "post", "put", "delete", "patch"].includes(method)) {
        endpoints.push(`${method.toUpperCase()} /api${apiPath}`)
      }
    }
  }
  return endpoints.sort()
}

/* ── 页面路由自动发现 ── */

/** 各面板实际存在的页面（[panel] 路由的有效展开映射）。 */
const PANEL_PAGES: Record<string, string[]> = {
  admin: [
    "dashboard", "users", "roles", "articles", "categories",
    "cases", "universities", "students", "contacts",
    "general-settings", "web-settings", "documents",
  ],
  portal: ["overview", "profile", "documents"],
}

/** 扫描 frontend/app/[locale] 目录发现所有页面路由。 */
function discoverRoutes(): string[] {
  const frontendDir = path.resolve(__dirname, "..")
  const localeDir = path.join(frontendDir, "app", "[locale]")
  if (!fs.existsSync(localeDir)) return []
  const allFiles = fs.readdirSync(localeDir, { recursive: true }) as string[]
  const pages = allFiles
    .filter((f) => f.endsWith("page.tsx"))
    .map((f) => `[locale]/${f.replace(/\\/g, "/")}`)
  const routes: string[] = []
  for (const p of pages) {
    let route = p.replace(/^\[locale\]\//, "").replace(/\/page\.tsx$/, "")
    // 移除路由组（如 (public)）
    route = route.replace(/\([^)]+\)\/?/g, "")
    if (route === "") {
      routes.push("/")
      continue
    }
    // 展开 [panel] — 仅生成面板实际拥有的页面
    if (route.startsWith("[panel]/")) {
      const sub = route.replace("[panel]/", "")
      for (const [panel, validPages] of Object.entries(PANEL_PAGES)) {
        if (validPages.includes(sub)) {
          routes.push(`/${panel}/${sub}`)
        }
      }
    } else {
      routes.push(`/${route}`)
    }
  }
  return routes.sort()
}

/* ── 路由匹配 ── */

/** 将访问的 URL 匹配到路由模式（去掉 locale 前缀，支持动态段）。 */
function matchRoute(url: string, routes: string[]): string | null {
  const p = url.replace(/^\/[a-z]{2}(?=\/)/, "")
  if (routes.includes(p)) return p
  const segments = p.split("/")
  if (segments.length >= 3) {
    const pattern = [...segments.slice(0, -1), "[id]"].join("/")
    if (routes.includes(pattern)) return pattern
  }
  return null
}

/* ── 覆盖率数据合并 ── */

interface CoverageData {
  apiCalls: Set<string>
  routes: Set<string>
  components: Set<string>
  security: Set<string>
}

/** 读取 .coverage/ 目录下所有 worker 的覆盖率数据并合并。 */
function mergeCoverageData(): CoverageData {
  const data: CoverageData = {
    apiCalls: new Set(),
    routes: new Set(),
    components: new Set(),
    security: new Set(),
  }
  if (!fs.existsSync(COVERAGE_DIR)) return data

  const files = fs.readdirSync(COVERAGE_DIR)
  for (const file of files) {
    if (!file.endsWith(".json")) continue
    const filePath = path.join(COVERAGE_DIR, file)
    try {
      const items: string[] = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      if (file.startsWith("api-")) {
        items.forEach((ep) => data.apiCalls.add(ep))
      } else if (file.startsWith("routes-")) {
        items.forEach((r) => data.routes.add(r))
      } else if (file.startsWith("components-")) {
        items.forEach((c) => data.components.add(c))
      } else if (file.startsWith("security-")) {
        items.forEach((s) => data.security.add(s))
      }
    } catch {
      /* 单个文件解析失败不阻塞 */
    }
  }
  return data
}

/* ── 覆盖率报告 ── */

/** 生成并输出覆盖率报告。 */
async function printCoverageReport(cookies: string): Promise<void> {
  const coverage = mergeCoverageData()

  // API 端点：优先 OpenAPI 自动发现，fallback 到静态文件
  let apiEndpoints: string[]
  const discovered = await discoverApiEndpoints(BASE, cookies)
  if (discovered.length > 0) {
    apiEndpoints = discovered
  } else {
    const staticFile = path.join(HELPERS_DIR, "api-endpoints.json")
    apiEndpoints = fs.existsSync(staticFile)
      ? JSON.parse(fs.readFileSync(staticFile, "utf-8"))
      : []
  }

  // 页面路由：优先文件系统自动发现，fallback 到静态文件
  let pageRoutes: string[]
  const discoveredRoutes = discoverRoutes()
  if (discoveredRoutes.length > 0) {
    pageRoutes = discoveredRoutes
  } else {
    const staticFile = path.join(HELPERS_DIR, "page-routes.json")
    pageRoutes = fs.existsSync(staticFile)
      ? JSON.parse(fs.readFileSync(staticFile, "utf-8"))
      : []
  }

  // 组件交互：从 helpers/components.json 加载
  interface ComponentDef {
    component: string
    elements: string[]
  }
  const componentsFile = path.join(HELPERS_DIR, "components.json")
  const componentDefs: ComponentDef[] = fs.existsSync(componentsFile)
    ? JSON.parse(fs.readFileSync(componentsFile, "utf-8"))
    : []
  const allComponentKeys: string[] = []
  for (const def of componentDefs) {
    for (const el of def.elements) {
      allComponentKeys.push(`${def.component}::${el}`)
    }
  }

  // 安全场景：从 helpers/security-scenarios.json 加载
  interface SecurityDef {
    category: string
    scenario: string
  }
  const securityFile = path.join(HELPERS_DIR, "security-scenarios.json")
  const securityDefs: SecurityDef[] = fs.existsSync(securityFile)
    ? JSON.parse(fs.readFileSync(securityFile, "utf-8"))
    : []
  const allSecurityKeys = securityDefs.map(
    (s) => `${s.category}::${s.scenario}`,
  )

  /* ── 1. API 覆盖率 ── */
  const coveredApis = apiEndpoints.filter((ep) => coverage.apiCalls.has(ep))
  const uncoveredApis = apiEndpoints.filter((ep) => !coverage.apiCalls.has(ep))
  const apiPct = apiEndpoints.length > 0
    ? ((coveredApis.length / apiEndpoints.length) * 100).toFixed(1)
    : "0.0"

  console.log(
    `\n[API Coverage] ${coveredApis.length}/${apiEndpoints.length} (${apiPct}%)`,
  )
  if (uncoveredApis.length > 0) {
    console.log("  Uncovered:")
    uncoveredApis.forEach((ep) => console.log(`    - ${ep}`))
  }

  /* ── 2. 路由覆盖率 ── */
  const matchedRoutes = new Set<string>()
  Array.from(coverage.routes).forEach((url) => {
    const matched = matchRoute(url, pageRoutes)
    if (matched) matchedRoutes.add(matched)
  })
  const coveredRoutes = pageRoutes.filter((r) => matchedRoutes.has(r))
  const uncoveredRoutes = pageRoutes.filter((r) => !matchedRoutes.has(r))
  const routePct = pageRoutes.length > 0
    ? ((coveredRoutes.length / pageRoutes.length) * 100).toFixed(1)
    : "0.0"

  console.log(
    `\n[Route Coverage] ${coveredRoutes.length}/${pageRoutes.length} (${routePct}%)`,
  )
  if (uncoveredRoutes.length > 0) {
    console.log("  Uncovered:")
    uncoveredRoutes.forEach((r) => console.log(`    - ${r}`))
  }

  /* ── 3. 组件交互覆盖率 ── */
  const coveredComponents = allComponentKeys.filter((k) =>
    coverage.components.has(k),
  )
  const uncoveredComponents = allComponentKeys.filter(
    (k) => !coverage.components.has(k),
  )
  const compPct = allComponentKeys.length > 0
    ? ((coveredComponents.length / allComponentKeys.length) * 100).toFixed(1)
    : "0.0"

  console.log(
    `\n[Component Coverage] ${componentDefs.length} components, ${coveredComponents.length}/${allComponentKeys.length} elements (${compPct}%)`,
  )
  if (uncoveredComponents.length > 0) {
    console.log("  Uncovered:")
    uncoveredComponents.forEach((c) => console.log(`    - ${c}`))
  }

  /* ── 4. 安全场景覆盖率 ── */
  const coveredSecurity = allSecurityKeys.filter((k) =>
    coverage.security.has(k),
  )
  const uncoveredSecurity = allSecurityKeys.filter(
    (k) => !coverage.security.has(k),
  )
  const secPct = allSecurityKeys.length > 0
    ? ((coveredSecurity.length / allSecurityKeys.length) * 100).toFixed(1)
    : "0.0"

  console.log(
    `\n[Security Coverage] ${coveredSecurity.length}/${allSecurityKeys.length} scenarios (${secPct}%)`,
  )
  if (uncoveredSecurity.length > 0) {
    console.log("  Uncovered:")
    uncoveredSecurity.forEach((s) => console.log(`    - ${s}`))
  }
  console.log()
}

/* ── E2E 数据清理 ── */

/** 删除所有以 E2E 开头的测试数据。 */
async function cleanupE2EData(page: Page): Promise<void> {
  const headers = { "X-Requested-With": "XMLHttpRequest" }

  const cleanups = [
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
}

/* ── 主函数 ── */

async function globalTeardown(_config: FullConfig) {
  /* 1. E2E 数据清理 */
  let cookies = ""
  if (fs.existsSync(AUTH_FILE)) {
    const browser = await chromium.launch()
    const context = await browser.newContext({
      locale: "zh-CN",
      storageState: AUTH_FILE,
    })
    const page = await context.newPage()

    // 提取 cookies 用于后续 OpenAPI 请求
    const cookieList = await context.cookies()
    cookies = cookieList.map((c) => `${c.name}=${c.value}`).join("; ")

    await cleanupE2EData(page)
    await browser.close()
  }

  /* 2. 覆盖率报告 */
  if (fs.existsSync(COVERAGE_DIR)) {
    try {
      await printCoverageReport(cookies)
    } catch (e) {
      console.warn("[Coverage] 报告生成失败:", e)
    }
    // 清理 .coverage/ 目录
    fs.rmSync(COVERAGE_DIR, { recursive: true, force: true })
  }

  /* 3. 信号文件 + 熔断状态清理 */
  cleanupSignals()
  cleanupBreakers()
}

export default globalTeardown
