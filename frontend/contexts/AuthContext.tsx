'use client'

/**
 * 认证上下文。
 * 通过请求 /api/users/me 获取用户信息，不使用 localStorage。
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

export interface AuthContextType {
  user: User | null
  loading: boolean
  isLoggedIn: boolean
  fetchUser: () => Promise<void>
  logout: () => void
  loginModalOpen: boolean
  showLoginModal: () => void
  hideLoginModal: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

/** 认证上下文提供者 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  /** 从后端获取当前用户信息 */
  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/users/me')
      setUser(res.data)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    fetchUser().finally(() => setLoading(false))
  }, [fetchUser])

  /** 退出登录 */
  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const showLoginModal = useCallback(() => setLoginModalOpen(true), [])
  const hideLoginModal = useCallback(() => setLoginModalOpen(false), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        fetchUser,
        logout,
        loginModalOpen,
        showLoginModal,
        hideLoginModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
