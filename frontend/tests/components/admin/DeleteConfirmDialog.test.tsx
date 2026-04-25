/**
 * DeleteConfirmDialog 通用删除确认弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { toast } from "sonner"
import { DeleteConfirmDialog } from "@/components/admin/web-settings/DeleteConfirmDialog"

describe("DeleteConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "确认删除",
    description: "删除后不可恢复，确认要删除吗？",
    onConfirm: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onConfirm = vi.fn().mockResolvedValue(undefined)
  })

  it("渲染标题和描述", () => {
    render(<DeleteConfirmDialog {...defaultProps} />)

    expect(screen.getByRole("heading", { name: "确认删除" })).toBeInTheDocument()
    expect(screen.getByText("删除后不可恢复，确认要删除吗？")).toBeInTheDocument()
  })

  it("渲染取消和确认按钮", () => {
    render(<DeleteConfirmDialog {...defaultProps} />)

    expect(screen.getByText("取消")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "确认删除" })).toBeInTheDocument()
  })

  it("点击确认后调用 onConfirm 和 onSuccess", async () => {
    render(<DeleteConfirmDialog {...defaultProps} />)

    /* 有两个"确认删除"文本：标题和按钮。按钮是 button 角色 */
    const confirmBtn = screen.getByRole("button", { name: "确认删除" })
    await userEvent.click(confirmBtn)

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("删除成功")
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("删除失败时显示错误提示", async () => {
    defaultProps.onConfirm = vi.fn().mockRejectedValue(new Error("fail"))

    render(<DeleteConfirmDialog {...defaultProps} />)

    const confirmBtn = screen.getByRole("button", { name: "确认删除" })
    await userEvent.click(confirmBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("删除失败")
    })

    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
  })

  it("显示自定义标题和描述", () => {
    render(
      <DeleteConfirmDialog
        {...defaultProps}
        title="删除文章"
        description="此文章将被永久删除"
      />,
    )

    expect(screen.getByText("删除文章")).toBeInTheDocument()
    expect(screen.getByText("此文章将被永久删除")).toBeInTheDocument()
  })

  it("未 open 时不渲染内容", () => {
    render(<DeleteConfirmDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("确认删除")).not.toBeInTheDocument()
  })
})
