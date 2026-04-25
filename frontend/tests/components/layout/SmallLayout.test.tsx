/**
 * FaviconHead + PublicHeader 小布局组件测试。
 * FaviconHead 验证动态 DOM 操作设置 favicon。
 * PublicHeader 验证 Header 包装器渲染。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"

/* ─── FaviconHead ─── */

vi.mock("@/contexts/ConfigContext", () => ({
  useConfig: vi.fn(() => ({
    siteInfo: { favicon_url: "/favicon-test.png" },
  })),
}))

import { useConfig } from "@/contexts/ConfigContext"
import { FaviconHead } from "@/components/layout/FaviconHead"

describe("FaviconHead", () => {
  beforeEach(() => {
    /* 清理 head 中的 link[rel=icon] */
    document.querySelectorAll("link[rel='icon']").forEach((el) => el.remove())
  })

  afterEach(() => {
    document.querySelectorAll("link[rel='icon']").forEach((el) => el.remove())
  })

  it("创建 link[rel=icon] 并设置 href", () => {
    render(<FaviconHead />)

    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    expect(link).not.toBeNull()
    expect(link!.href).toContain("/favicon-test.png")
  })

  it("已有 link[rel=icon] 时更新 href", () => {
    const existing = document.createElement("link")
    existing.rel = "icon"
    existing.href = "/old-favicon.png"
    document.head.appendChild(existing)

    render(<FaviconHead />)

    const links = document.querySelectorAll("link[rel='icon']")
    expect(links).toHaveLength(1)
    expect((links[0] as HTMLLinkElement).href).toContain("/favicon-test.png")
  })

  it("faviconUrl 为空时不创建 link", () => {
    vi.mocked(useConfig).mockReturnValue({
      siteInfo: { favicon_url: "" },
    } as any)

    render(<FaviconHead />)

    const link = document.querySelector("link[rel='icon']")
    expect(link).toBeNull()
  })

  it("渲染 null（不输出 DOM）", () => {
    vi.mocked(useConfig).mockReturnValue({
      siteInfo: { favicon_url: "/test.ico" },
    } as any)

    const { container } = render(<FaviconHead />)
    expect(container.firstChild).toBeNull()
  })
})

/* ─── PublicHeader ─── */

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="mock-header">Header</div>,
}))

import { PublicHeader } from "@/components/layout/PublicHeader"

describe("PublicHeader", () => {
  it("渲染 Header 组件", () => {
    const { getByTestId } = render(<PublicHeader />)

    expect(getByTestId("mock-header")).toBeInTheDocument()
  })

  it("不传递额外 props", () => {
    const { getByText } = render(<PublicHeader />)

    expect(getByText("Header")).toBeInTheDocument()
  })
})
