/**
 * ArticleContent 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}))

vi.mock("remark-gfm", () => ({
  default: {},
}))

import { ArticleContent } from "@/components/content/ArticleContent"

describe("ArticleContent", () => {
  it("Markdown 类型渲染 Markdown 内容", () => {
    render(
      <ArticleContent
        contentType="markdown"
        content="# Hello"
        fileUrl={null}
        title="测试"
      />,
    )
    expect(screen.getByTestId("markdown")).toBeTruthy()
    expect(screen.getByText("# Hello")).toBeTruthy()
  })

  it("文件类型渲染下载按钮", () => {
    render(
      <ArticleContent
        contentType="file"
        content=""
        fileUrl="/test.pdf"
        title="测试文件"
      />,
    )
    expect(screen.getByText("下载文件")).toBeTruthy()
  })

  it("PDF 文件渲染 iframe", () => {
    const { container } = render(
      <ArticleContent
        contentType="file"
        content=""
        fileUrl="/test.pdf"
        title="PDF 测试"
      />,
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute("src")).toBe("/test.pdf")
  })

  it("Office 文件显示下载提示", () => {
    render(
      <ArticleContent
        contentType="file"
        content=""
        fileUrl="/test.docx"
        title="Word 测试"
      />,
    )
    expect(screen.getByText("此文件需要下载后查看")).toBeTruthy()
  })
})
