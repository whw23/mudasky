/**
 * 权限检查逻辑测试。
 * 直接测试权限判断纯逻辑，避免 hook 上下文依赖。
 */

import { describe, it, expect } from 'vitest'
import type { User } from '@/types'

/**
 * 模拟 hasPermission 逻辑（与 use-permissions.ts 一致）。
 * 抽取为纯函数方便测试。
 */
function hasPermission(user: Partial<User> | null, perm: string): boolean {
  return user?.is_superuser || user?.permissions?.includes(perm) || false
}

/** 模拟 hasAnyPermission 逻辑 */
function hasAnyPermission(user: Partial<User> | null, ...perms: string[]): boolean {
  return user?.is_superuser || perms.some(p => user?.permissions?.includes(p)) || false
}

describe('权限检查逻辑', () => {
  const normalUser: Partial<User> = {
    is_superuser: false,
    permissions: ['post:manage', 'blog:manage'],
  }

  const superUser: Partial<User> = {
    is_superuser: true,
    permissions: [],
  }

  describe('hasPermission', () => {
    it('拥有该权限时返回 true', () => {
      expect(hasPermission(normalUser, 'post:manage')).toBe(true)
    })

    it('没有该权限时返回 false', () => {
      expect(hasPermission(normalUser, 'staff:manage')).toBe(false)
    })

    it('超级管理员始终返回 true', () => {
      expect(hasPermission(superUser, 'staff:manage')).toBe(true)
    })

    it('user 为 null 时返回 false', () => {
      expect(hasPermission(null, 'post:manage')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('拥有其中一个权限时返回 true', () => {
      expect(hasAnyPermission(normalUser, 'staff:manage', 'post:manage')).toBe(true)
    })

    it('没有任何权限时返回 false', () => {
      expect(hasAnyPermission(normalUser, 'staff:manage', 'member:manage')).toBe(false)
    })

    it('超级管理员始终返回 true', () => {
      expect(hasAnyPermission(superUser, 'staff:manage')).toBe(true)
    })

    it('user 为 null 时返回 false', () => {
      expect(hasAnyPermission(null, 'post:manage')).toBe(false)
    })
  })
})
