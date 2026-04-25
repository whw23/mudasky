/**
 * SidebarShell + HomeBanner + PageBanner 布局组件测试。
 * 验证侧边栏布局、首页 Banner 和页面 Banner 渲染。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => ({
    siteInfo: {
      brand_name: "测试品牌",
      tagline: "品牌标语",
    },
    pageBanners: {
      about: { image_ids: ["img-about-1"] },
      home: { image_ids: ["img-home-1", "img-home-2"] },
    },
  }),
  useConfig: () => ({
    pageBanners: {
      about: { image_ids: ["img-about-1"] },
      home: { image_ids: ["img-home-1", "img-home-2"] },
    },
  }),
}))

vi.mock("@/components/layout/Banner", () => ({
  Banner: ({ title, subtitle, imageIds, large, children }: any) => (
    <div data-testid="banner" data-title={title} data-subtitle={subtitle} data-large={large}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children, onClick, label }: any) => (
    <div data-testid="editable-overlay" onClick={onClick} title={label}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/common/SearchBar", () => ({
  SearchBar: () => <div data-testid="search-bar" />,
}))

import { SidebarShell } from "@/components/layout/SidebarShell"
import { HomeBanner } from "@/components/home/HomeBanner"
import { PageBanner } from "@/components/layout/PageBanner"

/* ─── SidebarShell ─── */

describe("SidebarShell", () => {
  it("渲染侧边栏内容", () => {
    render(
      <SidebarShell sidebar={<div>侧边栏</div>}>
        <div>主区域</div>
      </SidebarShell>,
    )

    expect(screen.getAllByText("侧边栏").length).toBeGreaterThan(0)
  })

  it("渲染主区域内容", () => {
    render(
      <SidebarShell sidebar={<div>侧边栏</div>}>
        <div>主区域内容</div>
      </SidebarShell>,
    )

    expect(screen.getByText("主区域内容")).toBeInTheDocument()
  })

  it("点击汉堡按钮展开移动端抽屉", () => {
    const { container } = render(
      <SidebarShell sidebar={<div>侧边栏</div>}>
        <div>主区域</div>
      </SidebarShell>,
    )

    /* 汉堡按钮在 main > div 区域中 */
    const mainEl = container.querySelector("main")!
    const menuButton = mainEl.querySelector("button")!
    fireEvent.click(menuButton)

    /* 展开后出现固定遮罩层（z-40） */
    const overlay = container.querySelector("[class*='z-40']")
    expect(overlay).toBeInTheDocument()
  })

  it("点击遮罩关闭抽屉", () => {
    const { container } = render(
      <SidebarShell sidebar={<div>侧边栏</div>}>
        <div>主区域</div>
      </SidebarShell>,
    )

    const mainEl = container.querySelector("main")!
    const menuButton = mainEl.querySelector("button")!
    fireEvent.click(menuButton)

    const overlay = container.querySelector("[class*='z-40'][class*='inset-0']")!
    fireEvent.click(overlay)

    const overlayAfter = container.querySelector("[class*='z-40'][class*='inset-0']")
    expect(overlayAfter).toBeNull()
  })

  it("应用自定义 sidebarClass", () => {
    const { container } = render(
      <SidebarShell sidebar={<div>侧边栏</div>} sidebarClass="bg-blue-50">
        <div>主区域</div>
      </SidebarShell>,
    )

    const asides = container.querySelectorAll("aside")
    const hasCustomClass = Array.from(asides).some((a) => a.className.includes("bg-blue-50"))
    expect(hasCustomClass).toBe(true)
  })

  it("默认使用 bg-gray-50 侧边栏背景", () => {
    const { container } = render(
      <SidebarShell sidebar={<div>侧边栏</div>}>
        <div>主区域</div>
      </SidebarShell>,
    )

    const asides = container.querySelectorAll("aside")
    const hasDefaultClass = Array.from(asides).some((a) => a.className.includes("bg-gray-50"))
    expect(hasDefaultClass).toBe(true)
  })

  it("点击关闭按钮关闭抽屉", () => {
    const { container } = render(
      <SidebarShell sidebar={<div>侧边栏</div>}>
        <div>主区域</div>
      </SidebarShell>,
    )

    const mainEl = container.querySelector("main")!
    const menuButton = mainEl.querySelector("button")!
    fireEvent.click(menuButton)

    const buttons = container.querySelectorAll("button")
    const closeButton = Array.from(buttons).find((b) => b.className.includes("absolute"))
    expect(closeButton).toBeInTheDocument()
    fireEvent.click(closeButton!)

    const overlay = container.querySelector("[class*='z-40'][class*='inset-0']")
    expect(overlay).toBeNull()
  })
})

/* ─── HomeBanner ─── */

describe("HomeBanner", () => {
  it("渲染 Banner 组件", () => {
    render(<HomeBanner />)

    expect(screen.getByTestId("banner")).toBeInTheDocument()
  })

  it("非 editable 模式渲染搜索框", () => {
    render(<HomeBanner />)

    expect(screen.getByTestId("search-bar")).toBeInTheDocument()
  })

  it("editable 模式不渲染搜索框", () => {
    render(<HomeBanner editable />)

    expect(screen.queryByTestId("search-bar")).not.toBeInTheDocument()
  })

  it("editable 模式渲染 EditableOverlay", () => {
    render(<HomeBanner editable />)

    const overlays = screen.getAllByTestId("editable-overlay")
    expect(overlays.length).toBeGreaterThan(0)
  })

  it("使用品牌名称作为标题", () => {
    render(<HomeBanner />)

    const banner = screen.getByTestId("banner")
    expect(banner).toHaveAttribute("data-title", "测试品牌")
  })

  it("使用标语作为副标题", () => {
    render(<HomeBanner />)

    const banner = screen.getByTestId("banner")
    expect(banner).toHaveAttribute("data-subtitle", "品牌标语")
  })

  it("Banner 使用 large 模式", () => {
    render(<HomeBanner />)

    const banner = screen.getByTestId("banner")
    expect(banner).toHaveAttribute("data-large", "true")
  })
})

/* ─── PageBanner ─── */

describe("PageBanner", () => {
  it("渲染 Banner 组件", () => {
    render(<PageBanner pageKey="about" title="关于我们" subtitle="ABOUT US" />)

    expect(screen.getByTestId("banner")).toBeInTheDocument()
  })

  it("传递标题", () => {
    render(<PageBanner pageKey="about" title="关于我们" subtitle="ABOUT US" />)

    const banner = screen.getByTestId("banner")
    expect(banner).toHaveAttribute("data-title", "关于我们")
  })

  it("传递副标题", () => {
    render(<PageBanner pageKey="about" title="关于我们" subtitle="ABOUT US" />)

    const banner = screen.getByTestId("banner")
    expect(banner).toHaveAttribute("data-subtitle", "ABOUT US")
  })

  it("无对应 pageKey 配置时传空图片数组", () => {
    render(<PageBanner pageKey="nonexistent" title="不存在" />)

    expect(screen.getByTestId("banner")).toBeInTheDocument()
  })
})
