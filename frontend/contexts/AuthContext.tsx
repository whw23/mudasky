'use client'

/**
 * 认证上下文。
 * 通过请求 /api/portal/profile/meta/list 获取用户信息，不使用 localStorage。
 */

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@/types'
import api from '@/lib/api'

export type AuthModal = 'login' | 'register' | null

export interface AuthContextType {
  user: User | null
  loading: boolean
  isLoggedIn: boolean
  fetchUser: () => Promise<void>
  logout: () => void
  /** 当前打开的认证弹窗 */
  authModal: AuthModal
  /** 打开登录弹窗 */
  showLoginModal: () => void
  /** 打开注册弹窗 */
  showRegisterModal: () => void
  /** 关闭弹窗 */
  hideAuthModal: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

/** 认证上下文提供者 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModal, setAuthModal] = useState<AuthModal>(null)

  /** 从后端获取当前用户信息 */
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/portal/profile/meta/list')
      setUser(res.data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    fetchUser().finally(() => setLoading(false))
  }, [fetchUser])

  /** 浏览器前进/后退和页面可见时重新获取用户状态 */
  useEffect(() => {
    const onPopState = () => { fetchUser() }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchUser()
    }
    window.addEventListener('popstate', onPopState)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchUser])

  /** 监听 session 过期事件，清除用户状态。仅 admin/portal 页面跳转首页。 */
  useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      const path = window.location.pathname
      // 只有在 admin/portal 页面时才重定向（公开页面不需要登录，不跳转）
      if (path.includes('/admin/') || path.includes('/portal/')) {
        window.location.href = '/'
      }
    }
    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [])

  /** 退出登录 */
  const logout = useCallback(async () => {
    setUser(null)
    try {
      await api.post('/auth/logout')
    } catch {
      /* 忽略 */
    }
  }, [])

  const showLoginModal = useCallback(() => setAuthModal('login'), [])
  const showRegisterModal = useCallback(() => setAuthModal('register'), [])
  const hideAuthModal = useCallback(() => setAuthModal(null), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        fetchUser,
        logout,
        authModal,
        showLoginModal,
        showRegisterModal,
        hideAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
