/**
 * AdminSidebar 后台管理侧边栏组件测试。
 * 验证菜单项渲染、权限过滤、激活状态和"返回官网"链接。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

let mockPathname = "/admin/dashboard"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
  usePathname: () => mockPathname,
}))

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasPermission: (perm: string) => {
      return mockPermissions.some((p: string) => {
        if (p === "*") return true
        if (p.endsWith("/*") && perm.startsWith(p.slice(0, -1))) return true
        return p === perm
      })
    },
  }),
}))

import { AdminSidebar } from "@/components/layout/AdminSidebar"

let mockPermissions: string[] = ["*"]

describe("AdminSidebar", () => {
  it("超级管理员渲染全部菜单项", () => {
    mockPermissions = ["*"]
    mockPathname = "/admin/dashboard"

    render(<AdminSidebar />)

    expect(screen.getByText("dashboard")).toBeInTheDocument()
    expect(screen.getByText("userManagement")).toBeInTheDocument()
    expect(screen.getByText("roleManagement")).toBeInTheDocument()
    expect(screen.getByText("webSettings")).toBeInTheDocument()
    expect(screen.getByText("studentManagement")).toBeInTheDocument()
    expect(screen.getByText("contactManagement")).toBeInTheDocument()
  })

  it("无权限时只显示 dashboard", () => {
    mockPermissions = ["admin/dashboard"]
    mockPathname = "/admin/dashboard"

    render(<AdminSidebar />)

    expect(screen.getByText("dashboard")).toBeInTheDocument()
    expect(screen.queryByText("userManagement")).not.toBeInTheDocument()
    expect(screen.queryByText("roleManagement")).not.toBeInTheDocument()
  })

  it("部分权限时显示对应菜单项", () => {
    mockPermissions = ["admin/dashboard", "admin/users/*"]
    mockPathname = "/admin/dashboard"

    render(<AdminSidebar />)

    expect(screen.getByText("dashboard")).toBeInTheDocument()
    expect(screen.getByText("userManagement")).toBeInTheDocument()
    expect(screen.queryByText("roleManagement")).not.toBeInTheDocument()
    expect(screen.queryByText("webSettings")).not.toBeInTheDocument()
  })

  it("当前页面对应菜单项高亮", () => {
    mockPermissions = ["*"]
    mockPathname = "/admin/users"

    render(<AdminSidebar />)

    const userLink = screen.getByText("userManagement").closest("a")!
    expect(userLink.className).toContain("bg-primary/20")

    const dashboardLink = screen.getByText("dashboard").closest("a")!
    expect(dashboardLink.className).toContain("text-gray-400")
  })

  it("显示返回官网链接", () => {
    mockPermissions = ["*"]
    mockPathname = "/admin/dashboard"

    render(<AdminSidebar />)

    expect(screen.getByText("backToSite")).toBeInTheDocument()
    const backLink = screen.getByText("backToSite").closest("a")!
    expect(backLink.getAttribute("href")).toBe("/")
  })

  it("显示后台管理标题", () => {
    mockPermissions = ["*"]
    mockPathname = "/admin/dashboard"

    render(<AdminSidebar />)

    expect(screen.getByText("title")).toBeInTheDocument()
  })
})
