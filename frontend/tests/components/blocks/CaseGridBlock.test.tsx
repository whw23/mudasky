/**
 * CaseGridBlock 组件测试。
 * 验证案例网格区块的基本渲染和编辑模式。
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

vi.mock("@/components/public/CaseGrid", () => ({
  CaseGrid: ({ editable }: any) => (
    <div data-testid="case-grid" data-editable={editable} />
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

vi.mock("@/components/admin/web-settings/CaseEditDialog", () => ({
  CaseEditDialog: () => <div data-testid="case-edit-dialog" />,
}))

vi.mock("@/components/admin/ImportExportToolbar", () => ({
  ImportExportToolbar: () => <div data-testid="import-export-toolbar" />,
}))

vi.mock("@/components/admin/ImportPreviewDialog", () => ({
  ImportPreviewDialog: () => <div data-testid="import-preview-dialog" />,
}))

import { CaseGridBlock } from "@/components/blocks/CaseGridBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "case-1",
    type: "case_grid",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: null,
    ...overrides,
  }
}

describe("CaseGridBlock", () => {
  it("渲染 CaseGrid 组件", () => {
    render(<CaseGridBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByTestId("case-grid")).toBeInTheDocument()
  })

  it("渲染传入的 header", () => {
    render(
      <CaseGridBlock
        block={makeBlock()}
        header={<h2>成功案例</h2>}
        bg=""
      />,
    )

    expect(screen.getByText("成功案例")).toBeInTheDocument()
  })

  it("非 editable 模式不渲染管理工具栏", () => {
    render(<CaseGridBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.queryByTestId("manage-toolbar")).not.toBeInTheDocument()
    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })

  it("editable 模式渲染管理工具栏", () => {
    const onEdit = vi.fn()
    render(
      <CaseGridBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("manage-toolbar")).toBeInTheDocument()
  })

  it("editable + onEdit 模式包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <CaseGridBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })

  it("editable 但无 onEdit 时不包裹 EditableOverlay", () => {
    render(
      <CaseGridBlock block={makeBlock()} header={null} bg="" editable />,
    )

    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })

  it("应用灰色背景样式", () => {
    const { container } = render(
      <CaseGridBlock block={makeBlock()} header={null} bg="bg-gray-50" />,
    )

    const section = container.querySelector("section")
    expect(section!.className).toContain("bg-gray-50")
  })
})
