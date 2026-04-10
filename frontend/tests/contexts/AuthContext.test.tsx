/**
 * AuthContext 认证上下文测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

import { AuthProvider, AuthContext } from "@/contexts/AuthContext"
import { useContext } from "react"
import api from "@/lib/api"

/** 辅助组件：渲染 context 值 */
function TestConsumer() {
  const ctx = useContext(AuthContext)
  if (!ctx) return <div>no context</div>
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="user">{ctx.user ? ctx.user.id : "null"}</span>
      <span data-testid="isLoggedIn">{String(ctx.isLoggedIn)}</span>
      <span data-testid="authModal">{String(ctx.authModal)}</span>
      <button data-testid="logout" onClick={ctx.logout}>退出</button>
      <button data-testid="showLogin" onClick={ctx.showLoginModal}>登录</button>
      <button data-testid="showRegister" onClick={ctx.showRegisterModal}>注册</button>
      <button data-testid="hideModal" onClick={ctx.hideAuthModal}>关闭</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  )
}

const MOCK_USER = { id: "user-1", username: "testuser", is_active: true }

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetchUser 成功后设置用户信息", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: MOCK_USER })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-1")
      expect(screen.getByTestId("isLoggedIn").textContent).toBe("true")
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })
  })

  it("fetchUser 失败时 user 为 null", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("401"))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("null")
      expect(screen.getByTestId("isLoggedIn").textContent).toBe("false")
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })
  })

  it("logout 清除用户", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: MOCK_USER })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-1")
    })

    await userEvent.click(screen.getByTestId("logout"))

    expect(screen.getByTestId("user").textContent).toBe("null")
    expect(screen.getByTestId("isLoggedIn").textContent).toBe("false")
  })

  it("authModal 状态切换", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("401"))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("authModal").textContent).toBe("null")
    })

    await userEvent.click(screen.getByTestId("showLogin"))
    expect(screen.getByTestId("authModal").textContent).toBe("login")

    await userEvent.click(screen.getByTestId("showRegister"))
    expect(screen.getByTestId("authModal").textContent).toBe("register")

    await userEvent.click(screen.getByTestId("hideModal"))
    expect(screen.getByTestId("authModal").textContent).toBe("null")
  })
})
