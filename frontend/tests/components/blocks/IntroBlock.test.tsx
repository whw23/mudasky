/**
 * IntroBlock 组件测试。
 * 验证介绍区块的标题和内容渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <div data-testid="editable-overlay">{children}</div>,
}))

import { IntroBlock } from "@/components/blocks/IntroBlock"
import type { Block } from "@/types/block"

/** 创建基础 Block 数据 */
function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "intro-1",
    type: "intro",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: { content: { zh: "这是介绍内容", en: "This is intro content" } },
    ...overrides,
  }
}

describe("IntroBlock", () => {
  it("渲染多语言内容", () => {
    render(<IntroBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("这是介绍内容")).toBeInTheDocument()
  })

  it("渲染纯字符串内容", () => {
    render(
      <IntroBlock
        block={makeBlock({ data: { content: "纯文本介绍" } })}
        header={null}
        bg=""
      />,
    )

    expect(screen.getByText("纯文本介绍")).toBeInTheDocument()
  })

  it("内容为空时渲染空段落", () => {
    render(
      <IntroBlock
        block={makeBlock({ data: {} })}
        header={null}
        bg=""
      />,
    )

    const p = document.querySelector("p")
    expect(p).toBeInTheDocument()
    expect(p!.textContent).toBe("")
  })

  it("渲染传入的 header", () => {
    render(
      <IntroBlock
        block={makeBlock()}
        header={<h2>区块标题</h2>}
        bg=""
      />,
    )

    expect(screen.getByText("区块标题")).toBeInTheDocument()
  })

  it("应用灰色背景样式", () => {
    const { container } = render(
      <IntroBlock block={makeBlock()} header={null} bg="bg-gray-50" />,
    )

    const section = container.querySelector("section")
    expect(section!.className).toContain("bg-gray-50")
  })

  it("editable 模式下包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <IntroBlock
        block={makeBlock()}
        header={null}
        bg=""
        editable
        onEdit={onEdit}
      />,
    )

    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })

  it("非 editable 模式下不包裹 EditableOverlay", () => {
    render(<IntroBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })
})
