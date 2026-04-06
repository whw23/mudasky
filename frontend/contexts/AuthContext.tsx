"use client"

/**
 * 认证上下文
 * 管理用户状态，从 localStorage 恢复登录信息
 */

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { User } from "@/types"

const STORAGE_KEY = "mudasky_user"

export interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

/** 认证上下文提供者 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  /* 初始化时从 localStorage 恢复用户信息 */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUserState(JSON.parse(stored))
      }
    } catch {
      /* localStorage 解析失败时忽略 */
    } finally {
      setLoading(false)
    }
  }, [])

  /** 设置用户信息并同步到 localStorage */
  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  /** 退出登录 */
  const logout = useCallback(() => {
    setUser(null)
  }, [setUser])

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
