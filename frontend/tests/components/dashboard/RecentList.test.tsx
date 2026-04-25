/**
 * RecentList 最近列表组件测试。
 * 验证列表渲染、空状态、加载状态和"查看全部"链接。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}))

import { RecentList, type RecentItem } from "@/components/dashboard/RecentList"

const MOCK_ITEMS: RecentItem[] = [
  { id: "1", title: "文档A", subtitle: "今天上传" },
  { id: "2", title: "文档B", subtitle: "昨天上传", href: "/portal/documents" },
  { id: "3", title: "文档C", extra: <span>已审核</span> },
]

describe("RecentList", () => {
  it("渲染列表标题", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    expect(screen.getByText("最近文档")).toBeInTheDocument()
  })

  it("渲染列表项标题", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    expect(screen.getByText("文档A")).toBeInTheDocument()
    expect(screen.getByText("文档B")).toBeInTheDocument()
    expect(screen.getByText("文档C")).toBeInTheDocument()
  })

  it("渲染列表项副标题", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    expect(screen.getByText("今天上传")).toBeInTheDocument()
    expect(screen.getByText("昨天上传")).toBeInTheDocument()
  })

  it("渲染列表项附加内容", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    expect(screen.getByText("已审核")).toBeInTheDocument()
  })

  it("有 href 的项渲染为链接", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    const link = screen.getByText("文档B").closest("a")
    expect(link).toBeInTheDocument()
    expect(link!.getAttribute("href")).toBe("/portal/documents")
  })

  it("无 href 的项不渲染为链接", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    const textA = screen.getByText("文档A")
    expect(textA.closest("a")).toBeNull()
  })

  it("空列表显示空状态文本", () => {
    render(<RecentList title="最近文档" items={[]} />)

    expect(screen.getByText("暂无数据")).toBeInTheDocument()
  })

  it("自定义空状态文本", () => {
    render(
      <RecentList title="最近文档" items={[]} emptyText="没有记录" />,
    )

    expect(screen.getByText("没有记录")).toBeInTheDocument()
  })

  it("加载状态显示骨架屏", () => {
    render(<RecentList title="最近文档" items={[]} loading />)

    const skeletons = document.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBeGreaterThan(0)
    expect(screen.queryByText("暂无数据")).not.toBeInTheDocument()
  })

  it("渲染查看全部链接", () => {
    render(
      <RecentList
        title="最近文档"
        items={MOCK_ITEMS}
        viewAllHref="/documents"
        viewAllText="全部文档"
      />,
    )

    const viewAllLink = screen.getByText("全部文档")
    expect(viewAllLink).toBeInTheDocument()
    expect(viewAllLink.closest("a")!.getAttribute("href")).toBe("/documents")
  })

  it("无 viewAllHref 时不渲染查看全部链接", () => {
    render(<RecentList title="最近文档" items={MOCK_ITEMS} />)

    expect(screen.queryByText("查看全部")).not.toBeInTheDocument()
  })
})
