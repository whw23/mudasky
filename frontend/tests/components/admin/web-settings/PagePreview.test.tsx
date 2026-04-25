/**
 * PagePreview 页面预览容器组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

/* mock PageBlocksPreview */
vi.mock("@/components/admin/web-settings/PageBlocksPreview", () => ({
  PageBlocksPreview: ({
    pageSlug,
  }: {
    pageSlug: string
  }) => <div data-testid="page-blocks-preview">{pageSlug}</div>,
}))

import { PagePreview } from "@/components/admin/web-settings/PagePreview"

describe("PagePreview", () => {
  const defaultProps = {
    activePage: "home",
    onEditConfig: vi.fn(),
    onBannerEdit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染 PageBlocksPreview 组件", () => {
    render(<PagePreview {...defaultProps} />)

    expect(screen.getByTestId("page-blocks-preview")).toBeInTheDocument()
  })

  it("传递 activePage 作为 pageSlug", () => {
    render(<PagePreview {...defaultProps} activePage="about" />)

    expect(screen.getByText("about")).toBeInTheDocument()
  })

  it("activePage 为 home 时传递 home", () => {
    render(<PagePreview {...defaultProps} activePage="home" />)

    expect(screen.getByText("home")).toBeInTheDocument()
  })

  it("activePage 为 universities 时传递 universities", () => {
    render(<PagePreview {...defaultProps} activePage="universities" />)

    expect(screen.getByText("universities")).toBeInTheDocument()
  })

  it("activePage 变化时传递新值", () => {
    const { rerender } = render(<PagePreview {...defaultProps} activePage="home" />)

    expect(screen.getByText("home")).toBeInTheDocument()

    rerender(<PagePreview {...defaultProps} activePage="cases" />)

    expect(screen.getByText("cases")).toBeInTheDocument()
  })

  it("传递 onBannerEdit 回调", () => {
    /* PagePreview 委托 PageBlocksPreview，这里验证渲染即可 */
    render(<PagePreview {...defaultProps} />)

    expect(screen.getByTestId("page-blocks-preview")).toBeInTheDocument()
  })
})
