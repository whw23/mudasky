/**
 * PanelGuard 面板权限守卫组件测试。
 * 验证权限匹配、重定向逻辑和加载状态。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

const mockReplace = vi.fn()

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockAuthReturn,
}))

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (perm: string) => {
      if (!mockAuthReturn.user?.permissions) return false
      for (const p of mockAuthReturn.user.permissions) {
        if (p === "*") return true
        if (p.endsWith("/*") && perm.startsWith(p.slice(0, -1))) return true
        if (p === perm) return true
      }
      return false
    },
  }),
}))

import { PanelGuard } from "@/components/layout/PanelGuard"

let mockPathname = "/admin/dashboard"
let mockAuthReturn: {
  user: { permissions: string[] } | null
  loading: boolean
} = { user: null, loading: false }

describe("PanelGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname = "/admin/dashboard"
    mockAuthReturn = { user: null, loading: false }
  })

  it("加载状态下显示加载提示", () => {
    mockAuthReturn = { user: null, loading: true }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    expect(screen.getByText("加载中...")).toBeInTheDocument()
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument()
  })

  it("有权限时渲染子组件", () => {
    mockAuthReturn = {
      user: { permissions: ["admin/dashboard"] },
      loading: false,
    }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    expect(screen.getByText("受保护内容")).toBeInTheDocument()
  })

  it("通配符权限时渲染子组件", () => {
    mockAuthReturn = {
      user: { permissions: ["*"] },
      loading: false,
    }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    expect(screen.getByText("受保护内容")).toBeInTheDocument()
  })

  it("未登录时重定向到首页", async () => {
    mockAuthReturn = { user: null, loading: false }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/")
    })
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument()
  })

  it("无面板权限时重定向到用户中心", async () => {
    mockAuthReturn = {
      user: { permissions: ["portal/profile"] },
      loading: false,
    }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/portal/overview")
    })
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument()
  })

  it("无 module 权限时重定向到默认页", async () => {
    mockPathname = "/admin/users"
    mockAuthReturn = {
      user: { permissions: ["admin/dashboard"] },
      loading: false,
    }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/dashboard")
    })
    expect(screen.queryByText("受保护内容")).not.toBeInTheDocument()
  })

  it("默认页也无权限时重定向到首页", async () => {
    mockPathname = "/admin/users"
    mockAuthReturn = {
      user: { permissions: ["admin/contacts"] },
      loading: false,
    }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/")
    })
  })

  it("非法路由重定向到默认页", async () => {
    mockPathname = "/admin/nonexistent"
    mockAuthReturn = {
      user: { permissions: ["*"] },
      loading: false,
    }

    render(
      <PanelGuard panel="admin">
        <div>受保护内容</div>
      </PanelGuard>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/dashboard")
    })
  })

  it("portal 面板权限检查", () => {
    mockPathname = "/portal/profile"
    mockAuthReturn = {
      user: { permissions: ["portal/profile"] },
      loading: false,
    }

    render(
      <PanelGuard panel="portal">
        <div>用户中心</div>
      </PanelGuard>,
    )

    expect(screen.getByText("用户中心")).toBeInTheDocument()
  })
})
