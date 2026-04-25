/**
 * StepListBlock 组件测试。
 * 验证步骤列表区块的编号、标题和描述渲染。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <div data-testid="editable-overlay">{children}</div>,
}))

import { StepListBlock } from "@/components/blocks/StepListBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "step-1",
    type: "step_list",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: {},
    data: [
      { title: { zh: "提交申请" }, desc: { zh: "填写个人信息表" } },
      { title: { zh: "材料审核" }, desc: { zh: "我们会审核您的材料" } },
      { title: { zh: "获得结果" }, desc: { zh: "等待录取通知" } },
    ],
    ...overrides,
  }
}

describe("StepListBlock", () => {
  it("渲染所有步骤标题", () => {
    render(<StepListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("提交申请")).toBeInTheDocument()
    expect(screen.getByText("材料审核")).toBeInTheDocument()
    expect(screen.getByText("获得结果")).toBeInTheDocument()
  })

  it("渲染步骤描述", () => {
    render(<StepListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("填写个人信息表")).toBeInTheDocument()
    expect(screen.getByText("我们会审核您的材料")).toBeInTheDocument()
  })

  it("渲染步骤编号（01, 02, 03）", () => {
    render(<StepListBlock block={makeBlock()} header={null} bg="" />)

    expect(screen.getByText("01")).toBeInTheDocument()
    expect(screen.getByText("02")).toBeInTheDocument()
    expect(screen.getByText("03")).toBeInTheDocument()
  })

  it("data 为空数组时不渲染步骤", () => {
    const { container } = render(
      <StepListBlock block={makeBlock({ data: [] })} header={null} bg="" />,
    )

    const steps = container.querySelectorAll(".flex.gap-4")
    expect(steps.length).toBe(0)
  })

  it("data 非数组时不渲染步骤", () => {
    const { container } = render(
      <StepListBlock block={makeBlock({ data: null })} header={null} bg="" />,
    )

    const steps = container.querySelectorAll(".flex.gap-4")
    expect(steps.length).toBe(0)
  })

  it("渲染传入的 header", () => {
    render(
      <StepListBlock
        block={makeBlock()}
        header={<h2>申请步骤</h2>}
        bg=""
      />,
    )

    expect(screen.getByText("申请步骤")).toBeInTheDocument()
  })

  it("editable 模式包裹 EditableOverlay", () => {
    const onEdit = vi.fn()
    render(
      <StepListBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />,
    )

    expect(screen.getByTestId("editable-overlay")).toBeInTheDocument()
  })
})
