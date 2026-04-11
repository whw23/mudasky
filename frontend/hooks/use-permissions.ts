'use client'

/**
 * 权限检查 hook。
 * 支持通配符匹配：`*`、`admin/*`、`admin/users/*` 等。
 */

import { useAuth } from './use-auth'

/** 权限检查 hook */
export function usePermissions() {
  const { user } = useAuth()

  /** 检查是否拥有指定权限（支持通配符） */
  const hasPermission = (perm: string): boolean => {
    if (!user?.permissions) return false
    for (const p of user.permissions) {
      if (p === "*") return true
      if (p.endsWith("/*") && perm.startsWith(p.slice(0, -1))) return true
      if (p === perm) return true
    }
    return false
  }

  /** 检查是否拥有任一权限 */
  const hasAnyPermission = (...perms: string[]): boolean =>
    perms.some((p) => hasPermission(p))

  /** 是否有管理后台权限 */
  const isAdmin = hasAnyPermission("admin/*")

  return { hasPermission, hasAnyPermission, isAdmin }
}
