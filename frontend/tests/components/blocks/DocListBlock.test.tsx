/**
 * DocListBlock 组件测试。
 * 验证文档列表区块的图标和文本渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/SpotlightOverlay", () => ({
  SpotlightOverlay: ({ children }: any) => <div data-testid="spotlight-overlay">{children}</div>,
}))

vi.mock("@/components/admin/FieldOverlay", () => ({
  FieldOverlay: ({ children }: any) => <div data-testid="field-overlay">{children}</div>,
}))

vi.mock("@/lib/icon-utils", () => ({
  resolveIcon: (_name: any, fallback: any) => fallback,
}))

import { DocListBlock } from "@/components/blocks/DocListBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "doc-1",
    type: "doc_list",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: [
      { text: { zh: "护照复印件", en: "Passport copy" } },
      { text: { zh: "学历证明", en: "Diploma" } },
      { text: { zh: "语言成绩单", en: "Language score" } },
    ],
    ...overrides,
  }
}

describe("DocListBlock", () => {
  it("渲染所有文档项文本", () => {
    render(<DocListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("护照复印件")).toBeInTheDocument()
    expect(screen.getByText("学历证明")).toBeInTheDocument()
    expect(screen.getByText("语言成绩单")).toBeInTheDocument()
  })

  it("data 为空数组时不渲染任何项", () => {
    const { container } = render(
      <DocListBlock block={makeBlock({ data: [] })} header={null} bg="" />,
    )

    const items = container.querySelectorAll(".flex.items-start")
    expect(items.length).toBe(0)
  })

  it("data 非数组时不渲染任何项", () => {
    const { container } = render(
      <DocListBlock block={makeBlock({ data: "invalid" })} header={null} bg="" />,
    )

    const items = container.querySelectorAll(".flex.items-start")
    expect(items.length).toBe(0)
  })

  it("渲染传入的 header", () => {
    render(
      <DocListBlock
        block={makeBlock()}
        header={<h2>所需材料</h2>}
        bg=""
      />,
    )

    expect(screen.getByText("所需材料")).toBeInTheDocument()
  })

  it("editable 模式包裹 SpotlightOverlay", () => {
    const onEdit = vi.fn()
    render(
      <DocListBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("spotlight-overlay")).toBeInTheDocument()
  })

  it("非 editable 模式不包裹 SpotlightOverlay", () => {
    render(<DocListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.queryByTestId("spotlight-overlay")).not.toBeInTheDocument()
  })
})
