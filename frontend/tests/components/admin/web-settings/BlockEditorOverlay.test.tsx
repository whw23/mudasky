/**
 * BlockEditorOverlay Block 编辑覆盖层组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BlockEditorOverlay } from "@/components/admin/web-settings/BlockEditorOverlay"
import type { Block } from "@/types/block"

/** 构造测试用 Block */
function mockBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "block-1",
    type: "intro",
    showTitle: true,
    sectionTag: "TEST",
    sectionTitle: { zh: "测试标题" },
    bgColor: "white",
    options: {},
    data: null,
    ...overrides,
  }
}

describe("BlockEditorOverlay", () => {
  const defaultProps = {
    block: mockBlock(),
    onDelete: vi.fn(),
    onEditConfig: vi.fn(),
    children: <div data-testid="block-content">内容</div>,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染子组件内容", () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    expect(screen.getByTestId("block-content")).toBeInTheDocument()
    expect(screen.getByText("内容")).toBeInTheDocument()
  })

  it("显示区块类型名称", () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    expect(screen.getByText("介绍")).toBeInTheDocument()
  })

  it("card_grid 类型显示卡片网格名称", () => {
    render(
      <BlockEditorOverlay
        {...defaultProps}
        block={mockBlock({ type: "card_grid" })}
      />,
    )

    expect(screen.getByText("卡片网格")).toBeInTheDocument()
  })

  it("step_list 类型显示步骤列表名称", () => {
    render(
      <BlockEditorOverlay
        {...defaultProps}
        block={mockBlock({ type: "step_list" })}
      />,
    )

    expect(screen.getByText("步骤列表")).toBeInTheDocument()
  })

  it("点击设置按钮调用 onEditConfig", async () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    /* 设置按钮和删除按钮 */
    const buttons = screen.getAllByRole("button")
    /* 第一个按钮是设置 */
    await userEvent.click(buttons[0])

    expect(defaultProps.onEditConfig).toHaveBeenCalledWith(
      defaultProps.block,
      "config",
    )
  })

  it("点击删除按钮打开确认弹窗", async () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    /* 第二个按钮是删除 */
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])

    expect(screen.getByText("删除区块")).toBeInTheDocument()
    expect(screen.getByText(/确定要删除「介绍」区块吗/)).toBeInTheDocument()
  })

  it("确认删除时调用 onDelete", async () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    /* 打开删除确认弹窗 */
    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])

    /* 点击确认删除 */
    await userEvent.click(screen.getByText("确认删除"))

    expect(defaultProps.onDelete).toHaveBeenCalledWith("block-1")
  })

  it("取消删除不调用 onDelete", async () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onDelete).not.toHaveBeenCalled()
  })

  it("删除确认弹窗包含不可撤销提示", async () => {
    render(<BlockEditorOverlay {...defaultProps} />)

    const buttons = screen.getAllByRole("button")
    await userEvent.click(buttons[1])

    expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument()
  })

  it("使用 data-editable 属性包裹", () => {
    const { container } = render(<BlockEditorOverlay {...defaultProps} />)

    expect(container.querySelector("[data-editable]")).toBeTruthy()
  })

  it("未知类型显示 type 原始值", () => {
    render(
      <BlockEditorOverlay
        {...defaultProps}
        block={mockBlock({ type: "unknown_type" as any })}
      />,
    )

    expect(screen.getByText("unknown_type")).toBeInTheDocument()
  })
})
