/**
 * 认证 hook
 * 封装 AuthContext 的 useContext 调用
 */

import { useContext } from "react"
import { AuthContext, type AuthContextType } from "@/contexts/AuthContext"

/** 获取认证上下文，必须在 AuthProvider 内使用 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 内使用")
  }
  return context
}
