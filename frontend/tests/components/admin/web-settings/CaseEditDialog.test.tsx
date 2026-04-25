/**
 * CaseEditDialog 案例编辑弹窗组件测试。
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
import { CaseEditDialog } from "@/components/admin/web-settings/CaseEditDialog"

/** 构造案例数据 */
function mockCaseData() {
  return {
    id: "case-1",
    student_name: "张三",
    university: "牛津大学",
    program: "计算机科学",
    year: 2024,
    testimonial: "非常好的体验",
    is_featured: false,
    avatar_image_id: null,
    offer_image_id: null,
    related_university_id: null,
  }
}

describe("CaseEditDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    caseItem: null as ReturnType<typeof mockCaseData> | null,
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({ data: { items: [] } })
  })

  it("创建模式：渲染添加案例标题", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByText("添加案例")).toBeInTheDocument()
  })

  it("编辑模式：渲染编辑案例标题", () => {
    render(<CaseEditDialog {...defaultProps} caseItem={mockCaseData()} />)

    expect(screen.getByText("编辑案例")).toBeInTheDocument()
  })

  it("渲染学生姓名字段", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("学生姓名")).toBeInTheDocument()
  })

  it("渲染入学年份字段", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("入学年份")).toBeInTheDocument()
  })

  it("渲染录取大学和专业字段", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("录取大学")).toBeInTheDocument()
    expect(screen.getByLabelText("录取专业")).toBeInTheDocument()
  })

  it("渲染学生感言字段", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("学生感言")).toBeInTheDocument()
  })

  it("渲染保存和取消按钮", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByText("保存")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("编辑模式填充已有数据", () => {
    render(<CaseEditDialog {...defaultProps} caseItem={mockCaseData()} />)

    expect(screen.getByLabelText("学生姓名")).toHaveValue("张三")
    expect(screen.getByLabelText("录取大学")).toHaveValue("牛津大学")
    expect(screen.getByLabelText("录取专业")).toHaveValue("计算机科学")
  })

  it("创建模式字段为空", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("学生姓名")).toHaveValue("")
    expect(screen.getByLabelText("录取大学")).toHaveValue("")
    expect(screen.getByLabelText("录取专业")).toHaveValue("")
  })

  it("必填字段为空时提交触发错误提示", async () => {
    render(<CaseEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("保存"))

    expect(toast.error).toHaveBeenCalledWith("姓名、大学、专业不能为空")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("创建成功后关闭弹窗并调用 onSuccess", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<CaseEditDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("学生姓名"), "王五")
    await userEvent.type(screen.getByLabelText("录取大学"), "哈佛")
    await userEvent.type(screen.getByLabelText("录取专业"), "法学")
    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/cases/list/create",
        expect.objectContaining({
          student_name: "王五",
          university: "哈佛",
          program: "法学",
        }),
      )
      expect(toast.success).toHaveBeenCalledWith("案例已创建")
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("编辑成功后显示更新提示", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<CaseEditDialog {...defaultProps} caseItem={mockCaseData()} />)

    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/cases/list/detail/edit",
        expect.objectContaining({
          case_id: "case-1",
          student_name: "张三",
        }),
      )
      expect(toast.success).toHaveBeenCalledWith("案例已更新")
    })
  })

  it("创建失败显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<CaseEditDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("学生姓名"), "测试")
    await userEvent.type(screen.getByLabelText("录取大学"), "大学")
    await userEvent.type(screen.getByLabelText("录取专业"), "专业")
    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("创建失败")
    })
  })

  it("编辑失败显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<CaseEditDialog {...defaultProps} caseItem={mockCaseData()} />)

    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("更新失败")
    })
  })

  it("取消按钮关闭弹窗", async () => {
    render(<CaseEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("未 open 时不渲染内容", () => {
    render(<CaseEditDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("添加案例")).not.toBeInTheDocument()
  })

  it("渲染学生头像上传区域", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByText("学生头像")).toBeInTheDocument()
    expect(screen.getByText("上传头像")).toBeInTheDocument()
  })

  it("渲染录取通知书上传区域", () => {
    render(<CaseEditDialog {...defaultProps} />)

    expect(screen.getByText("录取通知书")).toBeInTheDocument()
    expect(screen.getByText("上传通知书")).toBeInTheDocument()
  })

  it("有头像时显示更换头像按钮", () => {
    const caseWithAvatar = {
      ...mockCaseData(),
      avatar_image_id: "avatar-1",
    }
    render(<CaseEditDialog {...defaultProps} caseItem={caseWithAvatar} />)

    expect(screen.getByText("更换头像")).toBeInTheDocument()
  })

  it("open 时加载院校列表", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [{ id: "u1", name: "北大" }] },
    })

    render(<CaseEditDialog {...defaultProps} />)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        "/admin/web-settings/universities/list",
        expect.objectContaining({ params: { page: 1, page_size: 100 } }),
      )
    })
  })
})
