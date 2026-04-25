/**
 * CtaBlock 组件测试。
 * 验证行动号召区块的标题、描述和咨询按钮渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <div data-testid="editable-overlay">{children}</div>,
}))

vi.mock("@/components/common/ConsultButton", () => ({
  ConsultButton: ({ children, className }: any) => (
    <button className={className} data-testid="consult-button">{children}</button>
  ),
}))

import { CtaBlock } from "@/components/blocks/CtaBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "cta-1",
    type: "cta",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: {
      title: { zh: "开始你的留学之旅", en: "Start Your Journey" },
      desc: { zh: "联系我们获取专业咨询", en: "Contact us for consultation" },
    },
    ...overrides,
  }
}

describe("CtaBlock", () => {
  it("渲染标题和描述", () => {
    render(<CtaBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("开始你的留学之旅")).toBeInTheDocument()
    expect(screen.getByText("联系我们获取专业咨询")).toBeInTheDocument()
  })

  it("渲染咨询按钮", () => {
    render(<CtaBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByTestId("consult-button")).toBeInTheDocument()
    expect(screen.getByText("立即咨询")).toBeInTheDocument()
  })

  it("标题和描述为空时不渲染对应元素", () => {
    render(
      <CtaBlock
        block={makeBlock({ data: {} })}
        header={null}
        bg=""
      />,
    )

    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument()
  })

  it("border-t 变体使用白色背景 + 上边框", () => {
    const { container } = render(
      <CtaBlock
        block={makeBlock({ options: { variant: "border-t" } })}
        header={null}
        bg=""
      />,
    )

    const section = container.querySelector("section")
    expect(section!.className).toContain("border-t")
    expect(section!.className).toContain("bg-white")
  })

  it("默认变体使用灰色背景", () => {
    const { container } = render(
      <CtaBlock block={makeBlock()} header={null} bg="" />,
    )

    const section = container.querySelector("section")
    expect(section!.className).toContain("bg-gray-50")
  })

  it("editable 模式包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <CtaBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })
})
