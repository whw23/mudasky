/**
 * 权限管理器的 Panel 和页面配置数据。
 * 从 AdminSidebar / UserSidebar 的 MENU_KEYS 提取，供 PermissionTree 组件使用。
 */

/** 页面配置项 */
export interface PageConfig {
  /** 页面唯一键 */
  key: string
  /** 页面路径（如 /admin/users），用于匹配 API 路由前缀 */
  href: string
  /** 页面关联的 API 路径前缀（从 href 提取，如 /admin/users → admin/users） */
  apiPrefix: string
}

/** Panel 配置项 */
export interface PanelConfig {
  /** Panel 唯一键 */
  key: string
  /** Panel 路径前缀（如 admin、portal） */
  prefix: string
  /** Panel 下的页面列表 */
  pages: PageConfig[]
}

/** 管理后台页面 */
const ADMIN_PAGES: PageConfig[] = [
  { key: "dashboard", href: "/admin/dashboard", apiPrefix: "admin/dashboard" },
  { key: "userManagement", href: "/admin/users", apiPrefix: "admin/users" },
  { key: "roleManagement", href: "/admin/roles", apiPrefix: "admin/roles" },
  { key: "articleManagement", href: "/admin/articles", apiPrefix: "admin/articles" },
  { key: "categoryManagement", href: "/admin/categories", apiPrefix: "admin/categories" },
  { key: "universityManagement", href: "/admin/universities", apiPrefix: "admin/universities" },
  { key: "caseManagement", href: "/admin/cases", apiPrefix: "admin/cases" },
  { key: "generalSettings", href: "/admin/general-settings", apiPrefix: "admin/general-settings" },
  { key: "webSettings", href: "/admin/web-settings", apiPrefix: "admin/web-settings" },
]

/** 用户中心页面 */
const PORTAL_PAGES: PageConfig[] = [
  { key: "overview", href: "/portal/overview", apiPrefix: "portal/overview" },
  { key: "profile", href: "/portal/profile", apiPrefix: "portal/profile" },
  { key: "documents", href: "/portal/documents", apiPrefix: "portal/documents" },
]

/** 所有 Panel 配置 */
export const PANEL_CONFIG: PanelConfig[] = [
  { key: "admin", prefix: "admin", pages: ADMIN_PAGES },
  { key: "portal", prefix: "portal", pages: PORTAL_PAGES },
]

/**
 * 根据页面 key 获取 API 路径前缀。
 * 组件用此前缀拼接 CRUD 路径：`/${prefix}/list`、`/${prefix}/create` 等。
 */
export function getApiPrefix(pageKey: string): string {
  for (const panel of PANEL_CONFIG) {
    const page = panel.pages.find((p) => p.key === pageKey)
    if (page) return `/${page.apiPrefix}`
  }
  return ""
}
