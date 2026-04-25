/**
 * UserExpandPanel 用户详情展开面板组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/crypto", () => ({
  encryptPassword: vi.fn().mockResolvedValue({
    encrypted_password: "enc123",
    nonce: "nonce123",
  }),
}))

vi.mock("@/lib/api-error", () => ({
  getApiError: (_err: unknown, _t: unknown, fallback: string) => fallback,
}))

vi.mock("@/components/auth/PasswordInput", () => ({
  PasswordInput: ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => (
    <input data-testid={id} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { UserExpandPanel } from "@/components/admin/UserExpandPanel"
import type { User } from "@/types"

/** 构造模拟用户数据 */
function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? "u1",
    username: overrides.username ?? "张三",
    phone: overrides.phone ?? "13800000001",
    is_active: overrides.is_active ?? true,
    two_factor_enabled: false,
    two_factor_method: null,
    storage_quota: overrides.storage_quota ?? 100,
    permissions: [],
    role_id: overrides.role_id ?? "r1",
    role_name: overrides.role_name ?? "student",
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: null,
  }
}

describe("UserExpandPanel", () => {
  const onUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("users/list/detail")) {
        return Promise.resolve({ data: mockUser() })
      }
      if (url.includes("roles/meta/list")) {
        return Promise.resolve({ data: [{ id: "r1", name: "student" }, { id: "r2", name: "advisor" }] })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it("加载中显示 loading 文本", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)
    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("渲染用户基本信息", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument()
      expect(screen.getByText("13800000001")).toBeInTheDocument()
      expect(screen.getByText("status_active")).toBeInTheDocument()
    })
  })

  it("活跃用户显示 deactivate 按钮", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("deactivate")).toBeInTheDocument()
    })
  })

  it("非活跃用户显示 activate 按钮", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("users/list/detail")) {
        return Promise.resolve({ data: mockUser({ is_active: false }) })
      }
      if (url.includes("roles/meta/list")) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: {} })
    })

    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("activate")).toBeInTheDocument()
      expect(screen.getByText("status_inactive")).toBeInTheDocument()
    })
  })

  it("切换激活状态调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("deactivate"))
    await userEvent.click(screen.getByText("deactivate"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/users/list/detail/edit",
        expect.objectContaining({ user_id: "u1", is_active: false }),
      )
      expect(toast.success).toHaveBeenCalledWith("toggleActiveSuccess")
      expect(onUpdate).toHaveBeenCalled()
    })
  })

  it("非 superuser 显示删除按钮", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      /* deleteUser 同时是 heading 和 button 文本，用 getAllByText */
      const elements = screen.getAllByText("deleteUser")
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it("superuser 不显示删除按钮", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("users/list/detail")) {
        return Promise.resolve({ data: mockUser({ role_name: "superuser" }) })
      }
      return Promise.resolve({ data: [] })
    })

    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument()
    })
    expect(screen.queryByText("deleteUser")).not.toBeInTheDocument()
  })

  it("渲染角色分配区域和保存按钮", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("assignGroups")).toBeInTheDocument()
      expect(screen.getByText("saveGroups")).toBeInTheDocument()
    })
  })

  it("渲染存储配额区域", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("storageQuota")).toBeInTheDocument()
      expect(screen.getByText("MB")).toBeInTheDocument()
    })
  })

  it("保存配额调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("storageQuota"))

    /* 找到配额 save 按钮（第一个名为 save 的） */
    const saveButtons = screen.getAllByText("save")
    await userEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/users/list/detail/edit",
        expect.objectContaining({ user_id: "u1", storage_quota: 100 }),
      )
    })
  })

  it("渲染密码重置区域", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      /* resetPassword 同时是 heading 和 button 文本 */
      const elements = screen.getAllByText("resetPassword")
      expect(elements.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText("newPassword")).toBeInTheDocument()
      expect(screen.getByText("confirmPassword")).toBeInTheDocument()
    })
  })

  it("渲染强制登出按钮", async () => {
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      /* forceLogout 同时是 heading 和 button 文本 */
      const elements = screen.getAllByText("forceLogout")
      expect(elements.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("强制登出调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getAllByText("forceLogout").length).toBeGreaterThanOrEqual(2)
    })
    /* forceLogout 同时是 section 标题和按钮文本，找按钮 */
    const buttons = screen.getAllByText("forceLogout")
    const btn = buttons.find((el) => el.tagName === "BUTTON")!
    await userEvent.click(btn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/users/list/detail/force-logout",
        { user_id: "u1" },
      )
      expect(toast.success).toHaveBeenCalledWith("forceLogoutSuccess")
    })
  })

  it("API 获取用户失败时显示 loading", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))
    render(<UserExpandPanel userId="u1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("fetchError")
    })
  })
})
