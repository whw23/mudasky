/**
 * 权限检查逻辑测试。
 * 直接测试权限判断纯逻辑，避免 hook 上下文依赖。
 */

import { describe, it, expect } from 'vitest'
import type { User } from '@/types'

/**
 * 模拟 hasPermission 逻辑（与 use-permissions.ts 一致）。
 * 支持通配符匹配：`*`、`admin/*`、`admin/users/*` 等。
 */
function hasPermission(user: Partial<User> | null, perm: string): boolean {
  if (!user?.permissions) return false
  for (const p of user.permissions) {
    if (p === "*") return true
    if (p.endsWith("/*") && perm.startsWith(p.slice(0, -1))) return true
    if (p === perm) return true
  }
  return false
}

/** 模拟 hasAnyPermission 逻辑 */
function hasAnyPermission(user: Partial<User> | null, ...perms: string[]): boolean {
  return perms.some(p => hasPermission(user, p))
}

describe('权限检查逻辑', () => {
  const normalUser: Partial<User> = {
    permissions: ['admin/content/edit', 'admin/content/list'],
  }

  const wildcardUser: Partial<User> = {
    permissions: ['*'],
  }

  const adminWildcardUser: Partial<User> = {
    permissions: ['admin/*'],
  }

  describe('hasPermission', () => {
    it('拥有该权限时返回 true', () => {
      expect(hasPermission(normalUser, 'admin/content/edit')).toBe(true)
    })

    it('没有该权限时返回 false', () => {
      expect(hasPermission(normalUser, 'admin/users/list')).toBe(false)
    })

    it('通配符 * 匹配所有权限', () => {
      expect(hasPermission(wildcardUser, 'admin/users/list')).toBe(true)
    })

    it('admin/* 匹配 admin 下所有权限', () => {
      expect(hasPermission(adminWildcardUser, 'admin/users/list')).toBe(true)
      expect(hasPermission(adminWildcardUser, 'admin/content/edit')).toBe(true)
    })

    it('admin/* 不匹配非 admin 权限', () => {
      expect(hasPermission(adminWildcardUser, 'portal/profile/view')).toBe(false)
    })

    it('user 为 null 时返回 false', () => {
      expect(hasPermission(null, 'admin/content/edit')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('拥有其中一个权限时返回 true', () => {
      expect(hasAnyPermission(normalUser, 'admin/users/list', 'admin/content/edit')).toBe(true)
    })

    it('没有任何权限时返回 false', () => {
      expect(hasAnyPermission(normalUser, 'admin/users/list', 'admin/roles/list')).toBe(false)
    })

    it('通配符 * 匹配所有权限', () => {
      expect(hasAnyPermission(wildcardUser, 'admin/users/list')).toBe(true)
    })

    it('user 为 null 时返回 false', () => {
      expect(hasAnyPermission(null, 'admin/content/edit')).toBe(false)
    })
  })
})
