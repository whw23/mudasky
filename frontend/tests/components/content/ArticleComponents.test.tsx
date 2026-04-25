/**
 * ArticleSidebar + ArticleSection 组件测试。
 * 验证侧边栏区块渲染和文章区块的列表/空状态展示。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (params?.index) return `${key}_${params.index}`
    return key
  },
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import { ArticleSidebar } from "@/components/content/ArticleSidebar"
import { ArticleSection } from "@/components/content/ArticleSection"

/* ─── ArticleSidebar ─── */

describe("ArticleSidebar", () => {
  it("渲染'最新文章'标题", () => {
    render(<ArticleSidebar />)

    expect(screen.getByText("latestArticles")).toBeInTheDocument()
  })

  it("渲染'精彩专题'标题", () => {
    render(<ArticleSidebar />)

    expect(screen.getByText("featuredTopics")).toBeInTheDocument()
  })

  it("渲染 5 个文章占位符", () => {
    render(<ArticleSidebar />)

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`articlePlaceholder_${i}`)).toBeInTheDocument()
    }
  })

  it("渲染 3 个专题占位符", () => {
    render(<ArticleSidebar />)

    for (let i = 1; i <= 3; i++) {
      expect(screen.getByText(`topicPlaceholder_${i}`)).toBeInTheDocument()
    }
  })
})

/* ─── ArticleSection ─── */

const mockArticles = [
  {
    id: 101,
    title: "留学趋势分析",
    excerpt: "2024年留学趋势",
    published_at: "2024-06-01T00:00:00",
    created_at: "2024-05-28T00:00:00",
    content: "",
    slug: "trend",
    category_id: "c1",
    status: "published" as const,
  },
  {
    id: 102,
    title: "奖学金申请指南",
    excerpt: null,
    published_at: null,
    created_at: "2024-07-10T00:00:00",
    content: "",
    slug: "scholarship",
    category_id: "c2",
    status: "published" as const,
  },
]

describe("ArticleSection", () => {
  it("渲染区块标题", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    expect(screen.getByText("相关文章")).toBeInTheDocument()
  })

  it("渲染文章标题列表", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    expect(screen.getByText("留学趋势分析")).toBeInTheDocument()
    expect(screen.getByText("奖学金申请指南")).toBeInTheDocument()
  })

  it("渲染文章日期（优先 published_at）", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    expect(screen.getByText("2024-06-01")).toBeInTheDocument()
    expect(screen.getByText("2024-07-10")).toBeInTheDocument()
  })

  it("渲染'阅读更多'文本", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    const readMoreLinks = screen.getAllByText(/阅读更多/)
    expect(readMoreLinks).toHaveLength(2)
  })

  it("有摘要时渲染摘要", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    expect(screen.getByText("2024年留学趋势")).toBeInTheDocument()
  })

  it("无文章时显示空状态", () => {
    render(
      <ArticleSection
        articles={[]}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    expect(screen.getByText("暂无文章")).toBeInTheDocument()
  })

  it("默认链接路径为 /news/{id}", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    const links = screen.getAllByRole("link")
    expect(links[0]).toHaveAttribute("href", "/news/101")
  })

  it("自定义 basePath 改变链接路径", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
        basePath="/study-abroad"
      />,
    )

    const links = screen.getAllByRole("link")
    expect(links[0]).toHaveAttribute("href", "/study-abroad/101")
  })

  it("渲染 Related Articles 英文标签", () => {
    render(
      <ArticleSection
        articles={mockArticles}
        title="相关文章"
        emptyText="暂无文章"
        readMoreText="阅读更多"
      />,
    )

    expect(screen.getByText("Related Articles")).toBeInTheDocument()
  })
})
