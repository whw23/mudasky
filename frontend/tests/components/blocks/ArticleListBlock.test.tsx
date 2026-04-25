/**
 * ArticleListBlock 组件测试。
 * 验证文章列表区块的基本渲染和编辑模式。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock("@/components/public/ArticleListClient", () => ({
  ArticleListClient: ({ categorySlug, editable }: any) => (
    <div data-testid="article-list-client" data-slug={categorySlug} data-editable={editable} />
  ),
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children, label }: any) => (
    <div data-testid="editable-overlay" data-label={label}>{children}</div>
  ),
}))

vi.mock("@/components/admin/web-settings/ManageToolbar", () => ({
  ManageToolbar: ({ children }: any) => <div data-testid="manage-toolbar">{children}</div>,
}))

vi.mock("@/components/admin/web-settings/ArticleEditDialog", () => ({
  ArticleEditDialog: () => <div data-testid="article-edit-dialog" />,
}))

vi.mock("@/components/admin/ImportExportToolbar", () => ({
  ImportExportToolbar: () => <div data-testid="import-export-toolbar" />,
}))

vi.mock("@/components/admin/ImportPreviewDialog", () => ({
  ImportPreviewDialog: () => <div data-testid="import-preview-dialog" />,
}))

import { ArticleListBlock } from "@/components/blocks/ArticleListBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "article-1",
    type: "article_list",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: { categorySlug: "news" },
    data: null,
    ...overrides,
  }
}

describe("ArticleListBlock", () => {
  it("渲染 ArticleListClient 组件", () => {
    render(<ArticleListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByTestId("article-list-client")).toBeInTheDocument()
  })

  it("传递 categorySlug 到 ArticleListClient", () => {
    render(<ArticleListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByTestId("article-list-client")).toHaveAttribute("data-slug", "news")
  })

  it("渲染传入的 header", () => {
    render(
      <ArticleListBlock
        block={makeBlock()}
        header={<h2>新闻资讯</h2>}
        bg=""
      />,
    )

    expect(screen.getByText("新闻资讯")).toBeInTheDocument()
  })

  it("非 editable 模式不渲染管理工具栏", () => {
    render(<ArticleListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.queryByTestId("manage-toolbar")).not.toBeInTheDocument()
    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })

  it("editable 模式渲染管理工具栏和 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <ArticleListBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("manage-toolbar")).toBeInTheDocument()
    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })

  it("无 categorySlug 时 ArticleListClient 仍渲染", () => {
    render(
      <ArticleListBlock
        block={makeBlock({ options: {} })}
        header={null}
        bg=""
      />,
    )

    expect(screen.getByTestId("article-list-client")).toBeInTheDocument()
  })

  it("应用灰色背景样式", () => {
    const { container } = render(
      <ArticleListBlock block={makeBlock()} header={null} bg="bg-gray-50" />,
    )

    const section = container.querySelector("section")
    expect(section!.className).toContain("bg-gray-50")
  })
})
