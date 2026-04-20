/**
 * ArticleContent 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("dompurify", () => ({
  default: { sanitize: (html: string) => html },
}))

import { ArticleContent } from "@/components/content/ArticleContent"

describe("ArticleContent", () => {
  it("HTML 类型渲染富文本内容", () => {
    const { container } = render(
      <ArticleContent
        contentType="html"
        content="<p>Hello World</p>"
      />,
    )
    expect(container.querySelector("p")).toBeTruthy()
    expect(screen.getByText("Hello World")).toBeTruthy()
  })

  it("PDF 文件渲染 iframe", () => {
    const { container } = render(
      <ArticleContent
        contentType="file"
        content=""
        fileId="pdf-123"
      />,
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute("src")).toBe(
      "/api/public/images/detail?id=pdf-123",
    )
  })

  it("PDF 文件显示下载链接", () => {
    render(
      <ArticleContent
        contentType="file"
        content=""
        fileId="pdf-123"
      />,
    )
    expect(screen.getByText("下载 PDF")).toBeTruthy()
  })

  it("无 fileId 时 file 类型回退为空", () => {
    const { container } = render(
      <ArticleContent
        contentType="file"
        content=""
        fileId={null}
      />,
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toBeNull()
  })
})
