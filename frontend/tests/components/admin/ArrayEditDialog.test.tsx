/**
 * ArrayEditDialog 通用数组编辑弹窗组件测试。
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

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (p: {
    innerRef: () => void
    droppableProps: Record<string, unknown>
    placeholder: null
  }) => React.ReactNode }) =>
    <div>{children({ innerRef: () => {}, droppableProps: {}, placeholder: null })}</div>,
  Draggable: ({ children }: { children: (p: {
    innerRef: () => void
    draggableProps: { style: Record<string, unknown> }
    dragHandleProps: Record<string, unknown>
  }, s: { isDragging: boolean }) => React.ReactNode }) =>
    <div>{children(
      { innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} },
      { isDragging: false },
    )}</div>,
}))

vi.mock("./ArrayFieldRenderer", () => ({
  ArrayFieldRenderer: ({ field, index }: { field: { key: string; label: string }; index: number }) => (
    <div data-testid={`field-${field.key}-${index}`}>{field.label}</div>
  ),
}))

import { toast } from "sonner"
import { ArrayEditDialog, type ArrayFieldDef } from "@/components/admin/ArrayEditDialog"

const textFields: ArrayFieldDef[] = [
  { key: "title", label: "标题", type: "text", localized: false },
  { key: "desc", label: "描述", type: "textarea", localized: false },
]

describe("ArrayEditDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "编辑列表",
    fields: textFields,
    data: [{ title: "条目1", desc: "描述1" }],
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染弹窗标题和描述", () => {
    render(<ArrayEditDialog {...defaultProps} />)

    expect(screen.getByText("编辑列表")).toBeInTheDocument()
    expect(screen.getByText("编辑列表项，拖动排序。")).toBeInTheDocument()
  })

  it("自定义描述文本", () => {
    render(<ArrayEditDialog {...defaultProps} description="自定义描述" />)

    expect(screen.getByText("自定义描述")).toBeInTheDocument()
  })

  it("渲染现有条目", () => {
    render(<ArrayEditDialog {...defaultProps} />)

    expect(screen.getByText("条目 1")).toBeInTheDocument()
  })

  it("多条目渲染", () => {
    const data = [
      { title: "项目A", desc: "A" },
      { title: "项目B", desc: "B" },
    ]
    render(<ArrayEditDialog {...defaultProps} data={data} />)

    expect(screen.getByText("条目 1")).toBeInTheDocument()
    expect(screen.getByText("条目 2")).toBeInTheDocument()
  })

  it("点击添加按钮增加空条目", async () => {
    render(<ArrayEditDialog {...defaultProps} data={[]} />)

    const addBtn = screen.getByText("添加条目")
    await userEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText("条目 1")).toBeInTheDocument()
    })
  })

  it("点击删除按钮弹出确认对话框", async () => {
    render(<ArrayEditDialog {...defaultProps} />)

    /* 找到删除按钮（Trash2 图标按钮） */
    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.classList.contains("text-muted-foreground") || btn.querySelector("svg"),
    )
    /* 最后一组按钮中找到带 hover:text-destructive 的 */
    const trashBtn = screen.getAllByRole("button").find(
      (btn) => btn.className.includes("hover:text-destructive"),
    )
    if (trashBtn) {
      await userEvent.click(trashBtn)
      await waitFor(() => {
        expect(screen.getByText("确认删除")).toBeInTheDocument()
      })
    }
  })

  it("保存调用 onSave 并关闭弹窗", async () => {
    defaultProps.onSave.mockResolvedValue(undefined)
    render(<ArrayEditDialog {...defaultProps} />)

    const saveBtn = screen.getByText("保存")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(defaultProps.onSave).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("保存成功")
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("保存失败显示错误提示", async () => {
    defaultProps.onSave.mockRejectedValue(new Error("fail"))
    render(<ArrayEditDialog {...defaultProps} />)

    const saveBtn = screen.getByText("保存")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("保存失败")
    })
  })

  it("取消按钮关闭弹窗", async () => {
    render(<ArrayEditDialog {...defaultProps} />)

    const cancelBtn = screen.getByText("取消")
    await userEvent.click(cancelBtn)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("未 open 时不渲染内容", () => {
    render(<ArrayEditDialog {...defaultProps} open={false} />)
    expect(screen.queryByText("编辑列表")).not.toBeInTheDocument()
  })

  it("渲染添加条目按钮", () => {
    render(<ArrayEditDialog {...defaultProps} />)
    expect(screen.getByText("添加条目")).toBeInTheDocument()
  })

  it("渲染保存和取消按钮", () => {
    render(<ArrayEditDialog {...defaultProps} />)
    expect(screen.getByText("保存")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })
})
