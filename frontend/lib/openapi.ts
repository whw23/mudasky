/**
 * OpenAPI spec 解析工具。
 * 从 OpenAPI JSON 中提取 API 路由信息，供权限管理器第三栏使用。
 */

import api from "@/lib/api"

/** 解析后的 API 路由信息 */
export interface ApiRoute {
  /** API 路径（如 /admin/users/list） */
  path: string
  /** HTTP 方法（大写，如 GET、POST） */
  method: string
  /** API 描述（取自 docstring） */
  summary: string
}

/**
 * 从 OpenAPI spec 中提取路由列表。
 * 后端已过滤为权限相关路由，前端只做格式转换。
 */
export function parseRoutes(spec: Record<string, unknown>): ApiRoute[] {
  const paths = spec.paths as Record<string, Record<string, Record<string, string>>> | undefined
  if (!paths) return []

  const routes: ApiRoute[] = []
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, detail] of Object.entries(methods)) {
      if (method === "parameters") continue
      routes.push({
        path,
        method: method.toUpperCase(),
        summary: detail.summary || detail.description || path,
      })
    }
  }
  return routes
}

/**
 * 按路径前缀过滤路由。
 * 例如 prefix="admin/users" 会匹配 /admin/users/list、/admin/users/edit/{id} 等。
 */
export function filterRoutesByPrefix(routes: ApiRoute[], prefix: string): ApiRoute[] {
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`
  return routes.filter((r) => r.path.startsWith(normalized + "/") || r.path === normalized)
}

/** 从后端获取 OpenAPI spec。 */
export async function fetchOpenApiSpec(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>("/admin/roles/list/openapi.json")
  return data
}
