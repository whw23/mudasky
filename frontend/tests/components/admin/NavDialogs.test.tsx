/**
 * AddNavItemDialog + RemoveNavItemDialog 导航项弹窗组件测试。
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

import api from "@/lib/api"
import { toast } from "sonner"
import { AddNavItemDialog } from "@/components/admin/web-settings/AddNavItemDialog"
import { RemoveNavItemDialog } from "@/components/admin/web-settings/RemoveNavItemDialog"

/* ================================================================
   AddNavItemDialog
   ================================================================ */

describe("AddNavItemDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染标题和表单字段", () => {
    render(<AddNavItemDialog {...defaultProps} />)

    expect(screen.getByText("新增导航项")).toBeInTheDocument()
    expect(screen.getByLabelText("名称")).toBeInTheDocument()
    expect(screen.getByLabelText("Slug")).toBeInTheDocument()
  })

  it("渲染取消和添加按钮", () => {
    render(<AddNavItemDialog {...defaultProps} />)

    expect(screen.getByText("取消")).toBeInTheDocument()
    expect(screen.getByText("添加")).toBeInTheDocument()
  })

  it("名称和 slug 为空时提交触发错误提示", async () => {
    render(<AddNavItemDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("添加"))

    expect(toast.error).toHaveBeenCalledWith("名称和 slug 不能为空")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("slug 格式错误时提交触发错误提示", async () => {
    render(<AddNavItemDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("名称"), "测试页")
    await userEvent.type(screen.getByLabelText("Slug"), "INVALID_slug")
    await userEvent.click(screen.getByText("添加"))

    expect(toast.error).toHaveBeenCalledWith("slug 格式错误，仅支持英文小写和连字符")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("提交成功调用 onSuccess 和 onOpenChange", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<AddNavItemDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("名称"), "校园风采")
    await userEvent.type(screen.getByLabelText("Slug"), "campus-life")
    await userEvent.click(screen.getByText("添加"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/web-settings/nav/add-item", {
        slug: "campus-life",
        name: "校园风采",
        description: "",
      })
      expect(toast.success).toHaveBeenCalledWith("导航项已添加")
      expect(defaultProps.onSuccess).toHaveBeenCalled()
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("提交失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<AddNavItemDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("名称"), "测试")
    await userEvent.type(screen.getByLabelText("Slug"), "test")
    await userEvent.click(screen.getByText("添加"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("添加失败")
    })
  })

  it("取消按钮调用 onOpenChange(false)", async () => {
    render(<AddNavItemDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("未 open 时不渲染内容", () => {
    render(<AddNavItemDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("新增导航项")).not.toBeInTheDocument()
  })

  it("显示 slug 格式提示文本", () => {
    render(<AddNavItemDialog {...defaultProps} />)

    expect(screen.getByText("仅支持英文小写字母和连字符")).toBeInTheDocument()
  })
})

/* ================================================================
   RemoveNavItemDialog
   ================================================================ */

describe("RemoveNavItemDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    slug: "custom-page",
    name: "自定义页面",
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染标题和描述", () => {
    render(<RemoveNavItemDialog {...defaultProps} />)

    expect(screen.getByText(/删除导航项「自定义页面」/)).toBeInTheDocument()
    expect(screen.getByText(/是否同时删除该分类下的文章/)).toBeInTheDocument()
  })

  it("渲染三个按钮：取消、仅删除导航项、删除导航项及文章", () => {
    render(<RemoveNavItemDialog {...defaultProps} />)

    expect(screen.getByText("取消")).toBeInTheDocument()
    expect(screen.getByText("仅删除导航项")).toBeInTheDocument()
    expect(screen.getByText("删除导航项及文章")).toBeInTheDocument()
  })

  it("点击仅删除导航项调用 API（delete_content=false）", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<RemoveNavItemDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("仅删除导航项"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/web-settings/nav/remove-item", {
        slug: "custom-page",
        delete_content: false,
      })
      expect(toast.success).toHaveBeenCalledWith("导航项已删除")
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("点击删除导航项及文章调用 API（delete_content=true）", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<RemoveNavItemDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("删除导航项及文章"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/admin/web-settings/nav/remove-item", {
        slug: "custom-page",
        delete_content: true,
      })
      expect(toast.success).toHaveBeenCalledWith("导航项已删除")
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("删除失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<RemoveNavItemDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("仅删除导航项"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("删除失败")
    })
  })

  it("未 open 时不渲染内容", () => {
    render(<RemoveNavItemDialog {...defaultProps} open={false} />)

    expect(screen.queryByText(/删除导航项/)).not.toBeInTheDocument()
  })
})
