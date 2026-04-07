'use client'

/** 认证状态 hook。 */

import { useContext } from 'react'
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext'

/** 获取认证上下文，必须在 AuthProvider 内使用 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用')
  }
  return ctx
}
