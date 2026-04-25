/**
 * ImportPreviewDialog 导入预览弹窗组件测试。
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
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"

/** 构造预览数据 */
function mockPreviewData(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      { row: 1, status: "new" as const, name: "项目A" },
      { row: 2, status: "update" as const, name: "项目B" },
    ],
    errors: [] as Array<{ row?: number; error: string }>,
    summary: { new: 1, update: 1 },
    ...overrides,
  }
}

describe("ImportPreviewDialog", () => {
  const columns = [{ key: "name", label: "名称" }]
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    data: mockPreviewData(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    columns,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    defaultProps.onConfirm = vi.fn().mockResolvedValue(undefined)
  })

  it("渲染标题和描述", () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    expect(screen.getByText("导入预览")).toBeInTheDocument()
    expect(screen.getByText(/请检查导入数据/)).toBeInTheDocument()
  })

  it("渲染摘要统计条", () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    /* "新增" 出现在摘要条和表格状态列，使用 getAllByText */
    expect(screen.getAllByText("新增").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("更新").length).toBeGreaterThanOrEqual(1)
  })

  it("渲染数据表格（表头和数据行）", () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    /* 表头 */
    expect(screen.getByText("行号")).toBeInTheDocument()
    expect(screen.getByText("状态")).toBeInTheDocument()
    expect(screen.getByText("名称")).toBeInTheDocument()

    /* 数据行 */
    expect(screen.getByText("项目A")).toBeInTheDocument()
    expect(screen.getByText("项目B")).toBeInTheDocument()
  })

  it("渲染取消和确认导入按钮", () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    expect(screen.getByText("取消")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /确认导入/ })).toBeInTheDocument()
  })

  it("确认导入显示有效条目数", () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    /* 2 条有效（1 new + 1 update） */
    expect(screen.getByText("确认导入 (2 条)")).toBeInTheDocument()
  })

  it("点击确认调用 onConfirm", async () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    await userEvent.click(screen.getByRole("button", { name: /确认导入/ }))

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("导入成功")
    })
  })

  it("确认失败时显示错误提示", async () => {
    defaultProps.onConfirm = vi.fn().mockRejectedValue(new Error("fail"))

    render(<ImportPreviewDialog {...defaultProps} />)

    await userEvent.click(screen.getByRole("button", { name: /确认导入/ }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("导入失败")
    })
  })

  it("有错误时渲染错误区块", () => {
    const data = mockPreviewData({
      errors: [{ row: 3, error: "字段缺失" }],
    })

    render(<ImportPreviewDialog {...defaultProps} data={data} />)

    expect(screen.getByText(/数据错误/)).toBeInTheDocument()
    expect(screen.getByText(/字段缺失/)).toBeInTheDocument()
  })

  it("有错误时确认按钮被禁用", () => {
    const data = mockPreviewData({
      errors: [{ row: 3, error: "字段缺失" }],
    })

    render(<ImportPreviewDialog {...defaultProps} data={data} />)

    const confirmBtn = screen.getByRole("button", { name: /确认导入/ })
    expect(confirmBtn).toBeDisabled()
  })

  it("有未知学科冲突时渲染冲突区块", () => {
    const data = mockPreviewData({
      unknown_disciplines: ["量子计算"],
    })

    render(<ImportPreviewDialog {...defaultProps} data={data} />)

    expect(screen.getByText(/数据冲突/)).toBeInTheDocument()
    expect(screen.getByText("量子计算")).toBeInTheDocument()
  })

  it("data 为 null 时不渲染", () => {
    const { container } = render(
      <ImportPreviewDialog {...defaultProps} data={null} />,
    )

    expect(container.innerHTML).toBe("")
  })

  it("取消按钮调用 onOpenChange(false)", async () => {
    render(<ImportPreviewDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })
})
