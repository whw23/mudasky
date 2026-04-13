"use client"

/**
 * 面板权限守卫。
 * 未登录 → 重定向首页；无面板权限 → 重定向用户中心。
 */

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "@/i18n/navigation"

interface PanelGuardProps {
  /** 当前面板名（如 "admin"、"portal"） */
  panel: string
  children: React.ReactNode
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

/** 面板权限守卫组件 */
export function PanelGuard({ panel, children }: PanelGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/")
      return
    }

    if (!hasPanelAccess(user.permissions, panel)) {
      router.replace("/portal/overview")
    }
  }, [user, loading, panel, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!user || !hasPanelAccess(user.permissions, panel)) {
    return null
  }

  return <>{children}</>
}
