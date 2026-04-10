/**
 * useAuth hook 测试。
 */

import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn().mockRejectedValue(new Error("no session")) },
}))

import { useAuth } from "@/hooks/use-auth"
import { AuthProvider } from "@/contexts/AuthContext"

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe("useAuth", () => {
  it("在 AuthProvider 内调用时返回 context 值", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toHaveProperty("user")
    expect(result.current).toHaveProperty("loading")
    expect(result.current).toHaveProperty("isLoggedIn")
    expect(result.current).toHaveProperty("fetchUser")
    expect(result.current).toHaveProperty("logout")
    expect(result.current).toHaveProperty("authModal")
    expect(result.current).toHaveProperty("showLoginModal")
    expect(result.current).toHaveProperty("showRegisterModal")
    expect(result.current).toHaveProperty("hideAuthModal")
  })

  it("在 AuthProvider 外调用时抛出错误", () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow("useAuth 必须在 AuthProvider 内使用")
  })
})
