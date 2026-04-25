/**
 * UserSidebar 用户中心侧边栏组件测试。
 * 验证菜单项渲染、激活状态和"返回官网"链接。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

let mockPathname = "/portal/profile"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
  usePathname: () => mockPathname,
}))

import { UserSidebar } from "@/components/layout/UserSidebar"

describe("UserSidebar", () => {
  it("渲染所有菜单项", () => {
    mockPathname = "/portal/profile"

    render(<UserSidebar />)

    expect(screen.getByText("overview")).toBeInTheDocument()
    expect(screen.getByText("profile")).toBeInTheDocument()
    expect(screen.getByText("documents")).toBeInTheDocument()
  })

  it("当前页面对应菜单项高亮", () => {
    mockPathname = "/portal/profile"

    render(<UserSidebar />)

    const profileLink = screen.getByText("profile").closest("a")!
    expect(profileLink.className).toContain("bg-primary/10")

    const overviewLink = screen.getByText("overview").closest("a")!
    expect(overviewLink.className).toContain("text-muted-foreground")
  })

  it("documents 页面激活时高亮", () => {
    mockPathname = "/portal/documents"

    render(<UserSidebar />)

    const documentsLink = screen.getByText("documents").closest("a")!
    expect(documentsLink.className).toContain("bg-primary/10")
  })

  it("显示返回官网链接", () => {
    mockPathname = "/portal/profile"

    render(<UserSidebar />)

    expect(screen.getByText("backToSite")).toBeInTheDocument()
    const backLink = screen.getByText("backToSite").closest("a")!
    expect(backLink.getAttribute("href")).toBe("/")
  })

  it("显示用户中心标题", () => {
    mockPathname = "/portal/profile"

    render(<UserSidebar />)

    expect(screen.getByText("title")).toBeInTheDocument()
  })

  it("菜单项链接路径正确", () => {
    mockPathname = "/portal/profile"

    render(<UserSidebar />)

    const overviewLink = screen.getByText("overview").closest("a")!
    expect(overviewLink.getAttribute("href")).toBe("/portal/overview")

    const profileLink = screen.getByText("profile").closest("a")!
    expect(profileLink.getAttribute("href")).toBe("/portal/profile")

    const documentsLink = screen.getByText("documents").closest("a")!
    expect(documentsLink.getAttribute("href")).toBe("/portal/documents")
  })
})
