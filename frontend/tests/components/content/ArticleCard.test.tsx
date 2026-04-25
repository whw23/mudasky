/**
 * ArticleCard 文章卡片组件测试。
 * 验证标题、摘要、日期格式化、封面图渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import { ArticleCard } from "@/components/content/ArticleCard"

describe("ArticleCard", () => {
  const baseProps = {
    id: 1,
    title: "留学申请攻略",
    summary: "2024年最新留学申请指南",
    date: "2024-03-15T00:00:00",
  }

  it("渲染文章标题", () => {
    render(<ArticleCard {...baseProps} />)

    expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
  })

  it("渲染文章摘要", () => {
    render(<ArticleCard {...baseProps} />)

    expect(screen.getByText("2024年最新留学申请指南")).toBeInTheDocument()
  })

  it("正确格式化日期 - 显示日期和年月", () => {
    render(<ArticleCard {...baseProps} />)

    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("2024-03")).toBeInTheDocument()
  })

  it("链接指向文章详情页", () => {
    render(<ArticleCard {...baseProps} />)

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/news/1")
  })

  it("有封面图时渲染图片", () => {
    render(<ArticleCard {...baseProps} image="/img/cover.jpg" />)

    const img = screen.getByAltText("留学申请攻略")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "/img/cover.jpg")
  })

  it("无封面图时不渲染图片", () => {
    render(<ArticleCard {...baseProps} />)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("日期个位数补零", () => {
    render(<ArticleCard {...baseProps} date="2024-01-05T00:00:00" />)

    expect(screen.getByText("05")).toBeInTheDocument()
    expect(screen.getByText("2024-01")).toBeInTheDocument()
  })

  it("月份个位数补零", () => {
    render(<ArticleCard {...baseProps} date="2024-09-20T00:00:00" />)

    expect(screen.getByText("20")).toBeInTheDocument()
    expect(screen.getByText("2024-09")).toBeInTheDocument()
  })
})
