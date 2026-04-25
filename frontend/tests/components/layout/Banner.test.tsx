/**
 * Banner 页面横幅组件测试。
 * 验证标题、副标题、图片轮播和子元素渲染。
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { Banner } from "@/components/layout/Banner"

describe("Banner", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("渲染标题", () => {
    render(<Banner title="关于我们" />)

    expect(screen.getByText(/关于我们/)).toBeInTheDocument()
  })

  it("标题包裹在中文方括号中", () => {
    render(<Banner title="关于我们" />)

    expect(screen.getByRole("heading").textContent).toBe("【关于我们】")
  })

  it("渲染副标题", () => {
    render(<Banner title="关于我们" subtitle="ABOUT US" />)

    expect(screen.getByText("ABOUT US")).toBeInTheDocument()
  })

  it("无副标题时不渲染副标题元素", () => {
    const { container } = render(<Banner title="关于我们" />)

    const subtitle = container.querySelector(".uppercase")
    expect(subtitle).toBeNull()
  })

  it("渲染子元素", () => {
    render(
      <Banner title="首页">
        <div data-testid="search-box">搜索框</div>
      </Banner>,
    )

    expect(screen.getByTestId("search-box")).toBeInTheDocument()
    expect(screen.getByText("搜索框")).toBeInTheDocument()
  })

  it("large 模式使用 min-h-screen", () => {
    const { container } = render(<Banner title="首页" large />)

    const banner = container.firstChild as HTMLElement
    expect(banner.className).toContain("min-h-screen")
  })

  it("普通模式不使用 min-h-screen", () => {
    const { container } = render(<Banner title="关于我们" />)

    const banner = container.firstChild as HTMLElement
    expect(banner.className).not.toContain("min-h-screen")
    expect(banner.className).toContain("min-h-[240px]")
  })

  it("无图片时显示渐变动画背景", () => {
    const { container } = render(<Banner title="关于我们" />)

    const gradientBg = container.querySelector(".bg-\\[\\#88c8f7\\]")
    expect(gradientBg).toBeInTheDocument()
  })

  it("有图片时渲染背景图片", () => {
    const { container } = render(
      <Banner title="关于我们" imageIds={["img-1", "img-2"]} />,
    )

    const gradientBg = container.querySelector(".bg-\\[\\#88c8f7\\]")
    expect(gradientBg).toBeNull()

    const bgElements = container.querySelectorAll(".bg-cover")
    expect(bgElements.length).toBe(2)
  })

  it("单张图片不启动轮播定时器", () => {
    vi.useFakeTimers()

    const { container } = render(
      <Banner title="关于我们" imageIds={["img-1"]} />,
    )

    const bgElement = container.querySelector(".bg-cover")!
    expect(bgElement).toBeInTheDocument()
    expect((bgElement as HTMLElement).style.opacity).toBe("1")

    vi.useRealTimers()
  })

  it("多图片轮播切换", () => {
    vi.useFakeTimers()

    const { container } = render(
      <Banner title="关于我们" imageIds={["img-1", "img-2", "img-3"]} />,
    )

    const bgElements = container.querySelectorAll(".bg-cover")
    expect((bgElements[0] as HTMLElement).style.opacity).toBe("1")
    expect((bgElements[1] as HTMLElement).style.opacity).toBe("0")

    act(() => { vi.advanceTimersByTime(5000) })

    expect((bgElements[0] as HTMLElement).style.opacity).toBe("0")
    expect((bgElements[1] as HTMLElement).style.opacity).toBe("1")

    vi.useRealTimers()
  })
})
