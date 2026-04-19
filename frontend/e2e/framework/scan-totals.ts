/**
 * 动态扫描 API 端点和前端路由，作为覆盖率 total 基准。
 */

import fs from "node:fs"
import path from "node:path"

const EXCLUDED_API_PATHS = new Set([
  "/meta/routes",
  "/health",
  "/version",
])

/** 从后端 /api/meta/routes 获取所有 API 端点 */
export async function scanApiEndpoints(
  baseUrl: string,
  cookies: string,
): Promise<string[]> {
  const res = await fetch(`${baseUrl}/api/meta/routes`, {
    headers: { Cookie: cookies },
  })
  if (!res.ok) {
    console.warn(`[Scan] API 端点扫描失败: ${res.status}`)
    return []
  }
  const routes: { method: string; path: string }[] = await res.json()
  return [...new Set(
    routes
      .map((r) => r.path)
      .filter((p) => !EXCLUDED_API_PATHS.has(p)),
  )]
}

/** 从 PanelGuard.tsx 动态读取 PANEL_ROUTES 映射表 */
function loadPanelRoutes(): Record<string, string[]> {
  const guardPath = path.resolve(
    __dirname, "../../components/layout/PanelGuard.tsx",
  )
  try {
    const content = fs.readFileSync(guardPath, "utf-8")
    const match = content.match(
      /const PANEL_ROUTES[^=]*=\s*(\{[\s\S]*?\n\})/,
    )
    if (!match) return { admin: [], portal: [] }
    const obj = match[1]
      .replace(/\/\/.*/g, "")
      .replace(/,(\s*[}\]])/g, "$1")
    // eslint-disable-next-line no-eval
    return eval(`(${obj})`)
  } catch {
    return { admin: [], portal: [] }
  }
}

/** 扫描前端 page.tsx 文件，转换为路由列表 */
export function scanFrontendRoutes(): {
  routes: string[]
  panelRoutes: Record<string, string[]>
} {
  const appDir = path.resolve(__dirname, "../../app/[locale]")
  const routes: string[] = []
  const panelRoutes = loadPanelRoutes()

  function walk(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        let segment = entry.name
        if (segment.startsWith("(") && segment.endsWith(")")) {
          walk(path.join(dir, segment), prefix)
          continue
        }
        if (segment === "[panel]") {
          walk(path.join(dir, segment), `${prefix}/admin`)
          walk(path.join(dir, segment), `${prefix}/portal`)
          continue
        }
        if (segment.startsWith("[") && segment.endsWith("]")) {
          segment = `:${segment.slice(1, -1)}`
        }
        walk(path.join(dir, segment), `${prefix}/${segment}`)
      } else if (entry.name === "page.tsx") {
        routes.push(prefix || "/")
      }
    }
  }

  walk(appDir, "")
  return { routes, panelRoutes }
}

/** 保存扫描结果 */
export function saveScanTotals(
  runtimeDir: string,
  api: string[],
  routes: string[],
  panelRoutes: Record<string, string[]>,
): void {
  const filePath = path.join(runtimeDir, "scan-totals.json")
  fs.writeFileSync(filePath, JSON.stringify({ api, routes, panelRoutes }, null, 2))
}

/** 加载扫描结果 */
export function loadScanTotals(
  runtimeDir: string,
): { api: string[]; routes: string[]; panelRoutes: Record<string, string[]> } | null {
  const filePath = path.join(runtimeDir, "scan-totals.json")
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}
