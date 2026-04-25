/**
 * Header 顶部导航组件测试。
 * 验证品牌信息、导航栏、用户状态和移动端菜单渲染。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

let mockUser: any = null
let mockIsAdmin = false

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "zh",
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className, onClick }: any) => (
    <a href={href} className={className} onClick={onClick}>{children}</a>
  ),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
    showLoginModal: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ isAdmin: mockIsAdmin }),
}))

vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => ({
    siteInfo: {
      brand_name: "测试教育",
      tagline: "留学无忧",
      hotline: "400-123-4567",
      hotline_contact: "张老师",
      logo_url: "/logo.png",
    },
    navConfig: {
      order: ["home", "universities", "about"],
      custom_items: [],
    },
    pageBanners: {},
  }),
  useConfig: () => ({
    siteInfo: {
      brand_name: { zh: "测试教育", en: "Test Education" },
    },
  }),
}))

vi.mock("@/lib/i18n-config", () => ({
  getLocalizedValue: (_obj: any, _locale: string) => "Test Education",
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <>{children}</>,
}))

vi.mock("@/components/layout/LocaleSwitcher", () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}))

vi.mock("@/components/layout/HeaderLogo", () => ({
  HeaderLogo: ({ brandName }: any) => <span data-testid="header-logo">{brandName}</span>,
}))

import { Header } from "@/components/layout/Header"

describe("Header", () => {
  beforeEach(() => {
    mockUser = null
    mockIsAdmin = false
  })

  it("渲染品牌名称", () => {
    render(<Header />)

    expect(screen.getAllByText("测试教育").length).toBeGreaterThan(0)
  })

  it("渲染热线电话", () => {
    render(<Header />)

    expect(screen.getByText("400-123-4567")).toBeInTheDocument()
  })

  it("渲染热线联系人", () => {
    render(<Header />)

    expect(screen.getByText("张老师")).toBeInTheDocument()
  })

  it("渲染导航链接", () => {
    render(<Header />)

    expect(screen.getAllByText("home").length).toBeGreaterThan(0)
    expect(screen.getAllByText("universities").length).toBeGreaterThan(0)
    expect(screen.getAllByText("about").length).toBeGreaterThan(0)
  })

  it("未登录时显示登录按钮", () => {
    render(<Header />)

    expect(screen.getByText("loginOrRegister")).toBeInTheDocument()
  })

  it("已登录时显示用户名", () => {
    mockUser = { username: "张三", phone: "13800138000" }

    render(<Header />)

    expect(screen.getByText("张三")).toBeInTheDocument()
  })

  it("已登录时显示登出按钮", () => {
    mockUser = { username: "张三", phone: "13800138000" }

    render(<Header />)

    expect(screen.getByText("logout")).toBeInTheDocument()
  })

  it("管理员显示管理后台入口", () => {
    mockUser = { username: "admin", phone: "13800138000" }
    mockIsAdmin = true

    render(<Header />)

    const adminLinks = screen.getAllByText("adminPanel")
    expect(adminLinks.length).toBeGreaterThan(0)
  })

  it("非管理员不显示管理后台入口", () => {
    mockUser = { username: "user", phone: "13800138000" }
    mockIsAdmin = false

    render(<Header />)

    expect(screen.queryByText("adminPanel")).not.toBeInTheDocument()
  })

  it("hideNav 时不渲染导航栏", () => {
    const { container } = render(<Header hideNav />)

    const nav = container.querySelector("nav")
    expect(nav).toBeNull()
  })

  it("渲染标语", () => {
    render(<Header />)

    expect(screen.getAllByText("留学无忧").length).toBeGreaterThan(0)
  })

  it("渲染英文品牌名", () => {
    render(<Header />)

    expect(screen.getAllByText("Test Education").length).toBeGreaterThan(0)
  })
})
