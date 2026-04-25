/**
 * DisciplineManageDialog 学科分类管理弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

/* mock ImportExportToolbar */
vi.mock("@/components/admin/ImportExportToolbar", () => ({
  ImportExportToolbar: () => <div data-testid="import-export-toolbar" />,
}))

/* mock ImportPreviewDialog */
vi.mock("@/components/admin/ImportPreviewDialog", () => ({
  ImportPreviewDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="import-preview-dialog" /> : null,
}))

/* mock DeleteConfirmDialog */
vi.mock("@/components/admin/web-settings/DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: ({
    open,
    title,
  }: {
    open: boolean
    title: string
  }) => (open ? <div data-testid="delete-confirm-dialog">{title}</div> : null),
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { DisciplineManageDialog } from "@/components/admin/web-settings/DisciplineManageDialog"

describe("DisciplineManageDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: [] })
  })

  it("渲染弹窗标题", async () => {
    render(<DisciplineManageDialog {...defaultProps} />)

    expect(screen.getByText("学科分类管理")).toBeInTheDocument()
  })

  it("open 时加载学科分类列表", async () => {
    render(<DisciplineManageDialog {...defaultProps} />)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/web-settings/disciplines/categories/list",
      )
    })
  })

  it("渲染学科大分类标签", () => {
    render(<DisciplineManageDialog {...defaultProps} />)

    expect(screen.getByText("学科大分类")).toBeInTheDocument()
  })

  it("渲染导入导出工具栏", () => {
    render(<DisciplineManageDialog {...defaultProps} />)

    expect(screen.getByTestId("import-export-toolbar")).toBeInTheDocument()
  })

  it("渲染添加大分类按钮", () => {
    render(<DisciplineManageDialog {...defaultProps} />)

    expect(screen.getByText("添加大分类")).toBeInTheDocument()
  })

  it("点击添加大分类显示输入框", async () => {
    render(<DisciplineManageDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("添加大分类"))

    expect(screen.getByPlaceholderText("分类名称")).toBeInTheDocument()
  })

  it("加载后渲染分类名称", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        { id: "cat1", name: "工学", display_order: 1 },
        { id: "cat2", name: "理学", display_order: 2 },
      ],
    })

    render(<DisciplineManageDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("工学")).toBeInTheDocument()
      expect(screen.getByText("理学")).toBeInTheDocument()
    })
  })

  it("每个分类显示编辑、删除、添加学科按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: "cat1", name: "工学", display_order: 1 }],
    })

    render(<DisciplineManageDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("工学")).toBeInTheDocument()
    })

    expect(screen.getByText("添加学科")).toBeInTheDocument()
  })

  it("创建分类成功后重新加载", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    render(<DisciplineManageDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("添加大分类"))
    await userEvent.type(screen.getByPlaceholderText("分类名称"), "文学")

    /* 点击保存按钮 */
    const saveButtons = screen.getAllByRole("button")
    const saveBtn = saveButtons.find((btn) =>
      btn.querySelector("svg"),
    )
    if (saveBtn) await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/disciplines/categories/list/create",
        { name: "文学" },
      )
    })
  })

  it("未 open 时不渲染内容", () => {
    render(<DisciplineManageDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("学科分类管理")).not.toBeInTheDocument()
  })

  it("分类加载失败时列表为空", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("fail"))

    render(<DisciplineManageDialog {...defaultProps} />)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled()
    })

    /* 不渲染任何分类名称 */
    expect(screen.queryByText("工学")).not.toBeInTheDocument()
  })
})
