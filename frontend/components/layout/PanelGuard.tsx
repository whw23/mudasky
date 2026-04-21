"use client"

/**
 * 面板权限守卫。
 * 未登录 → 重定向首页；无面板权限 → 重定向用户中心。
 * 面板-页面不匹配 → 重定向到对应面板的默认页。
 * 无 module 权限 → 重定向到默认页或首页。
 */

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { usePermissions } from "@/hooks/use-permissions"
import { useRouter, usePathname } from "@/i18n/navigation"

interface PanelGuardProps {
  /** 当前面板名（如 "admin"、"portal"） */
  panel: string
  children: React.ReactNode
}

/** 各面板的 module 及其对应的权限码 */
const MODULE_PERMISSIONS: Record<string, Record<string, string>> = {
  admin: {
    dashboard: "admin/dashboard",
    users: "admin/users",
    roles: "admin/roles",
    "general-settings": "admin/general-settings",
    "web-settings": "admin/web-settings",
    students: "admin/students",
    contacts: "admin/contacts",
  },
  portal: {
    overview: "portal/overview",
    profile: "portal/profile",
    documents: "portal/documents",
  },
}

/** 各面板的默认 module */
const DEFAULT_MODULE: Record<string, string> = {
  admin: "dashboard",
  portal: "profile",
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
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  const subRoute = getSubRoute(pathname, panel)
  const moduleMap = MODULE_PERMISSIONS[panel] || {}
  const isValidRoute = subRoute !== null && subRoute in moduleMap

  // 检查 module 级权限
  const hasModulePermission =
    isValidRoute && hasPermission(moduleMap[subRoute])

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

    // 非法路由或无 module 权限 → 重定向到默认页
    if (!isValidRoute || !hasModulePermission) {
      const defaultModule = DEFAULT_MODULE[panel]
      const defaultPerm = moduleMap[defaultModule]

      // 检查默认页权限
      if (defaultPerm && hasPermission(defaultPerm)) {
        router.replace(`/${panel}/${defaultModule}`)
      } else {
        // 默认页也无权限 → 重定向首页
        router.replace("/")
      }
    }
  }, [user, loading, panel, router, isValidRoute, hasModulePermission, hasPermission, moduleMap])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!user || !hasPanelAccess(user.permissions, panel) || !isValidRoute || !hasModulePermission) {
    return null
  }

  return <>{children}</>
}
