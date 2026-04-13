"use client"

/**
 * 面板权限守卫。
 * 未登录 → 重定向首页；无面板权限 → 重定向用户中心。
 * 面板-页面不匹配 → 重定向到对应面板的默认页。
 */

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "@/i18n/navigation"

interface PanelGuardProps {
  /** 当前面板名（如 "admin"、"portal"） */
  panel: string
  children: React.ReactNode
}

/** 各面板允许的子路由 */
const PANEL_ROUTES: Record<string, string[]> = {
  admin: [
    "dashboard",
    "users",
    "roles",
    "articles",
    "general-settings",
    "web-settings",
  ],
  portal: ["overview", "profile", "documents"],
}

/** 检查用户是否拥有指定面板的任意权限 */
function hasPanelAccess(permissions: string[], panel: string): boolean {
  return permissions.some(
    (code) =>
      code === "*" ||
      code === `${panel}/*` ||
      code.startsWith(`${panel}/`),
  )
}

/** 从路径中提取面板下的子路由名 */
function getSubRoute(pathname: string, panel: string): string | null {
  const prefix = `/${panel}/`
  const idx = pathname.indexOf(prefix)
  if (idx === -1) return null
  const rest = pathname.slice(idx + prefix.length)
  return rest.split("/")[0] || null
}

/** 面板权限守卫组件 */
export function PanelGuard({ panel, children }: PanelGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const subRoute = getSubRoute(pathname, panel)
  const allowedRoutes = PANEL_ROUTES[panel]
  const isValidRoute = allowedRoutes
    ? subRoute !== null && allowedRoutes.includes(subRoute)
    : true

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/")
      return
    }

    if (!hasPanelAccess(user.permissions, panel)) {
      router.replace("/portal/overview")
      return
    }

    if (!isValidRoute) {
      const defaultPage = panel === "admin" ? "/admin/dashboard" : "/portal/overview"
      router.replace(defaultPage)
    }
  }, [user, loading, panel, router, isValidRoute])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!user || !hasPanelAccess(user.permissions, panel) || !isValidRoute) {
    return null
  }

  return <>{children}</>
}
