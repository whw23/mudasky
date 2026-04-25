/**
 * ArticleDetailPage 文章详情页组件测试。
 * 验证文章布局、返回链接、分类标签、日期和内容渲染。
 * 此为 async server component，使用 await 获取 JSX 后再 render。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

/* 模拟服务端翻译 */
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}))

/* 模拟 notFound */
const mockNotFound = vi.fn()
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound()
    throw new Error("notFound")
  },
}))

/* 模拟 i18n Link */
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

/* 模拟 Banner */
vi.mock("@/components/layout/Banner", () => ({
  Banner: ({ title, subtitle }: any) => (
    <div data-testid="banner" data-title={title} data-subtitle={subtitle} />
  ),
}))

/* 模拟 ArticleContent */
vi.mock("@/components/content/ArticleContent", () => ({
  ArticleContent: ({ contentType, content }: any) => (
    <div data-testid="article-content" data-type={contentType}>{content}</div>
  ),
}))

/* 模拟 content-api */
const mockFetchArticle = vi.fn()
const mockFetchCategories = vi.fn()
vi.mock("@/lib/content-api", () => ({
  fetchArticle: (...args: any[]) => mockFetchArticle(...args),
  fetchCategories: (...args: any[]) => mockFetchCategories(...args),
}))

import { ArticleDetailPage } from "@/components/content/ArticleDetailPage"

const baseArticle = {
  id: "art-1",
  title: "留学申请攻略",
  slug: "study-abroad",
  content_type: "html",
  content: "<p>文章正文</p>",
  file_id: null,
  excerpt: "这是摘要",
  category_id: "cat-1",
  published_at: "2024-06-15T10:00:00",
  created_at: "2024-06-10T08:00:00",
  view_count: 100,
}

const baseCategories = [
  { id: "cat-1", name: "新闻", slug: "news" },
  { id: "cat-2", name: "留学", slug: "study" },
]

const baseProps = {
  articleId: "art-1",
  backPath: "/news",
  bannerTitle: "新闻中心",
  bannerSubtitle: "News Center",
}

describe("ArticleDetailPage", () => {
  it("渲染 Banner 标题和副标题", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    const banner = screen.getByTestId("banner")
    expect(banner).toHaveAttribute("data-title", "新闻中心")
    expect(banner).toHaveAttribute("data-subtitle", "News Center")
  })

  it("渲染返回链接", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    const backLinks = screen.getAllByText("backToList")
    expect(backLinks.length).toBeGreaterThanOrEqual(2)
    expect(backLinks[0].closest("a")).toHaveAttribute("href", "/news")
  })

  it("渲染文章标题", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
  })

  it("渲染分类标签", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.getByText("新闻")).toBeInTheDocument()
  })

  it("优先显示 published_at 日期", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.getByText("2024-06-15")).toBeInTheDocument()
  })

  it("无 published_at 时显示 created_at 日期", async () => {
    mockFetchArticle.mockResolvedValue({ ...baseArticle, published_at: null })
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.getByText("2024-06-10")).toBeInTheDocument()
  })

  it("渲染摘要", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.getByText("这是摘要")).toBeInTheDocument()
  })

  it("无摘要时不渲染摘要段落", async () => {
    mockFetchArticle.mockResolvedValue({ ...baseArticle, excerpt: "" })
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.queryByText("这是摘要")).not.toBeInTheDocument()
  })

  it("渲染 ArticleContent 组件", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    const content = screen.getByTestId("article-content")
    expect(content).toHaveAttribute("data-type", "html")
  })

  it("文章不存在时调用 notFound", async () => {
    mockFetchArticle.mockResolvedValue(null)
    mockFetchCategories.mockResolvedValue(baseCategories)

    await expect(ArticleDetailPage(baseProps)).rejects.toThrow("notFound")
    expect(mockNotFound).toHaveBeenCalled()
  })

  it("分类不匹配时不渲染分类标签", async () => {
    mockFetchArticle.mockResolvedValue({
      ...baseArticle,
      category_id: "cat-unknown",
    })
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    expect(screen.queryByText("新闻")).not.toBeInTheDocument()
    expect(screen.queryByText("留学")).not.toBeInTheDocument()
  })

  it("底部也渲染返回链接", async () => {
    mockFetchArticle.mockResolvedValue(baseArticle)
    mockFetchCategories.mockResolvedValue(baseCategories)

    const jsx = await ArticleDetailPage(baseProps)
    render(jsx)

    const backLinks = screen.getAllByText("backToList")
    const lastLink = backLinks[backLinks.length - 1]
    expect(lastLink.closest("a")).toHaveAttribute("href", "/news")
  })
})
