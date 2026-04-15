/**
 * 前端全量路由清单。
 * 用于 E2E 覆盖率统计，与实际访问 URL 对比。
 */

export const PAGE_ROUTES: string[] = [
  // 公开页面
  "/",
  "/about",
  "/articles",
  "/cases",
  "/cases/[id]",
  "/life",
  "/life/[id]",
  "/news",
  "/news/[id]",
  "/requirements",
  "/requirements/[id]",
  "/study-abroad",
  "/study-abroad/[id]",
  "/contact",
  "/universities",
  "/universities/[id]",
  "/visa",
  "/visa/[id]",

  // admin 面板
  "/admin/dashboard",
  "/admin/users",
  "/admin/roles",
  "/admin/articles",
  "/admin/categories",
  "/admin/universities",
  "/admin/cases",
  "/admin/general-settings",
  "/admin/web-settings",
  "/admin/students",
  "/admin/contacts",
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
  const path = url.replace(/^\/[a-z]{2}(?=\/)/, "")
  if (PAGE_ROUTES.includes(path)) return path
  const segments = path.split("/")
  if (segments.length >= 3) {
    const pattern = [...segments.slice(0, -1), "[id]"].join("/")
    if (PAGE_ROUTES.includes(pattern)) return pattern
  }
  return null
}
