/**
 * ArticleList 布局组件测试。
 * 验证文章列表区域和侧边栏渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, any>) => {
    if (params?.index) return `${key}:${params.index}`
    return key
  },
}))

import { ArticleList } from "@/components/content/ArticleList"

describe("ArticleList", () => {
  it("渲染子元素内容", () => {
    render(
      <ArticleList>
        <div data-testid="article-card">文章1</div>
      </ArticleList>,
    )

    expect(screen.getByTestId("article-card")).toBeInTheDocument()
    expect(screen.getByText("文章1")).toBeInTheDocument()
  })

  it("渲染多个子元素", () => {
    render(
      <ArticleList>
        <div>文章A</div>
        <div>文章B</div>
        <div>文章C</div>
      </ArticleList>,
    )

    expect(screen.getByText("文章A")).toBeInTheDocument()
    expect(screen.getByText("文章B")).toBeInTheDocument()
    expect(screen.getByText("文章C")).toBeInTheDocument()
  })

  it("渲染侧边栏区域", () => {
    render(
      <ArticleList>
        <div>内容</div>
      </ArticleList>,
    )

    /* ArticleSidebar 会渲染 latestArticles 和 featuredTopics */
    expect(screen.getByText("latestArticles")).toBeInTheDocument()
    expect(screen.getByText("featuredTopics")).toBeInTheDocument()
  })

  it("使用 flex 布局", () => {
    const { container } = render(
      <ArticleList>
        <div>内容</div>
      </ArticleList>,
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("flex")
  })
})
