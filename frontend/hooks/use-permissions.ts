'use client'

/**
 * 权限检查 hook。
 * 提供 hasPermission、hasAnyPermission、isAdmin 方法。
 */

import { useAuth } from './use-auth'

/** 管理侧权限列表 */
const ADMIN_PERMISSIONS = [
  'member:manage',
  'staff:manage',
  'group:manage',
  'post:manage',
  'blog:manage',
  'category:manage',
  'document:manage',
]

/** 权限检查 hook */
export function usePermissions() {
  const { user } = useAuth()

  /** 检查是否拥有指定权限 */
  const hasPermission = (perm: string): boolean =>
    user?.is_superuser || user?.permissions?.includes(perm) || false

  /** 检查是否拥有任一权限 */
  const hasAnyPermission = (...perms: string[]): boolean =>
    user?.is_superuser || perms.some(p => user?.permissions?.includes(p)) || false

  /** 是否有管理后台权限 */
  const isAdmin = user?.is_superuser || ADMIN_PERMISSIONS.some(p => user?.permissions?.includes(p)) || false

  return { hasPermission, hasAnyPermission, isAdmin }
}
