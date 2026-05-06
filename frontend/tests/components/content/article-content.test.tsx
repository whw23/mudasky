/**
 * ArticleContent 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/components/common/SafeHtml", () => ({
  SafeHtml: ({ html, className }: { html: string; className?: string }) => (
    <div className={className} data-testid="safe-html">{html}</div>
  ),
}))

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: unknown }>) => {
    const Component = (props: Record<string, unknown>) => (
      <div data-testid="pdf-viewer" data-url={props.url as string} />
    )
    Component.displayName = "DynamicPdfViewer"
    void loader
    return Component
  },
}))

import { ArticleContent } from "@/components/content/ArticleContent"

describe("ArticleContent", () => {
  it("HTML 类型渲染富文本内容", () => {
    render(
      <ArticleContent
        contentType="html"
        content="<p>Hello World</p>"
      />,
    )
    expect(screen.getByTestId("safe-html")).toBeTruthy()
  })

  it("PDF 文件渲染 PdfViewer", () => {
    render(
      <ArticleContent
        contentType="file"
        content=""
        fileId="pdf-123"
      />,
    )
    const viewer = screen.getByTestId("pdf-viewer")
    expect(viewer).toBeTruthy()
    expect(viewer.getAttribute("data-url")).toBe(
      "/api/public/images/detail?id=pdf-123",
    )
  })

  it("无 fileId 时 file 类型回退为 SafeHtml", () => {
    render(
      <ArticleContent
        contentType="file"
        content=""
        fileId={null}
      />,
    )
    expect(screen.queryByTestId("pdf-viewer")).toBeNull()
  })
})
