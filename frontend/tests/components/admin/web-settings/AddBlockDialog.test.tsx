/**
 * AddBlockDialog 添加区块弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddBlockDialog } from "@/components/admin/web-settings/AddBlockDialog"

describe("AddBlockDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("open 时渲染弹窗标题和描述", () => {
    render(<AddBlockDialog {...defaultProps} />)

    expect(screen.getByText("添加区块")).toBeInTheDocument()
    expect(screen.getByText("选择要添加的区块类型")).toBeInTheDocument()
  })

  it("渲染所有区块类型选项", () => {
    render(<AddBlockDialog {...defaultProps} />)

    expect(screen.getByText("介绍")).toBeInTheDocument()
    expect(screen.getByText("卡片网格")).toBeInTheDocument()
    expect(screen.getByText("步骤列表")).toBeInTheDocument()
    expect(screen.getByText("文档清单")).toBeInTheDocument()
    expect(screen.getByText("图片墙")).toBeInTheDocument()
    expect(screen.getByText("文章列表")).toBeInTheDocument()
    expect(screen.getByText("院校列表")).toBeInTheDocument()
    expect(screen.getByText("案例网格")).toBeInTheDocument()
    expect(screen.getByText("精选展示")).toBeInTheDocument()
    expect(screen.getByText("行动号召")).toBeInTheDocument()
    expect(screen.getByText("联系方式")).toBeInTheDocument()
  })

  it("每个选项显示描述文本", () => {
    render(<AddBlockDialog {...defaultProps} />)

    expect(screen.getByText("标题 + 描述段落")).toBeInTheDocument()
    expect(screen.getByText("图标卡片 / 时间线 / 城市指南")).toBeInTheDocument()
    expect(screen.getByText("编号步骤纵向列表")).toBeInTheDocument()
    expect(screen.getByText("图标 + 文本列表")).toBeInTheDocument()
    expect(screen.getByText("水平滚动图片画廊")).toBeInTheDocument()
  })

  it("所有选项可通过 role=button 访问", () => {
    render(<AddBlockDialog {...defaultProps} />)

    const buttons = screen.getAllByRole("button")
    /* 11 个区块类型选项 */
    expect(buttons.length).toBeGreaterThanOrEqual(11)
  })

  it("点击选项调用 onSelect 并关闭弹窗", async () => {
    render(<AddBlockDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("介绍"))

    expect(defaultProps.onSelect).toHaveBeenCalledWith("intro")
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("点击卡片网格调用 onSelect('card_grid')", async () => {
    render(<AddBlockDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("卡片网格"))

    expect(defaultProps.onSelect).toHaveBeenCalledWith("card_grid")
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("点击联系方式调用 onSelect('contact_info')", async () => {
    render(<AddBlockDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("联系方式"))

    expect(defaultProps.onSelect).toHaveBeenCalledWith("contact_info")
  })

  it("键盘 Enter 也触发选择", async () => {
    render(<AddBlockDialog {...defaultProps} />)

    const introButton = screen.getByText("介绍").closest("[role='button']")!
    introButton.focus()
    await userEvent.keyboard("{Enter}")

    expect(defaultProps.onSelect).toHaveBeenCalledWith("intro")
  })

  it("未 open 时不渲染内容", () => {
    render(<AddBlockDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("添加区块")).not.toBeInTheDocument()
  })

  it("区块类型总数为 11", () => {
    render(<AddBlockDialog {...defaultProps} />)

    /* 验证网格中有 11 个可点击项 */
    const items = screen.getAllByRole("button")
    /* 至少 11 个（不计对话框关闭按钮等） */
    expect(items.filter((el) => el.tabIndex === 0).length).toBeGreaterThanOrEqual(11)
  })
})
