/**
 * CaseDialog 成功案例创建/编辑对话框组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/cases",
}))

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
import { CaseDialog } from "@/components/admin/CaseDialog"
import type { SuccessCase } from "@/types"

/** 构造模拟案例数据 */
function mockCase(overrides: Partial<SuccessCase> = {}): SuccessCase {
  return {
    id: "case1",
    student_name: "张三",
    university: "牛津大学",
    program: "计算机科学",
    year: 2024,
    testimonial: "非常满意",
    avatar_url: null,
    is_featured: false,
    sort_order: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  }
}

describe("CaseDialog", () => {
  const defaultProps = {
    successCase: null as SuccessCase | null,
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("创建模式：渲染空表单和创建标题", () => {
    render(<CaseDialog {...defaultProps} />)

    expect(screen.getByText("createTitle")).toBeInTheDocument()
    expect(screen.getByText("createDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("studentNamePlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("universityPlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("programPlaceholder")).toHaveValue("")
  })

  it("编辑模式：填充已有案例数据", () => {
    const sc = mockCase()
    render(<CaseDialog {...defaultProps} successCase={sc} />)

    expect(screen.getByText("editTitle")).toBeInTheDocument()
    expect(screen.getByText("editDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("studentNamePlaceholder")).toHaveValue("张三")
    expect(screen.getByPlaceholderText("universityPlaceholder")).toHaveValue("牛津大学")
    expect(screen.getByPlaceholderText("programPlaceholder")).toHaveValue("计算机科学")
  })

  it("渲染所有表单字段标签", () => {
    render(<CaseDialog {...defaultProps} />)

    expect(screen.getByText("studentName")).toBeInTheDocument()
    expect(screen.getByText("university")).toBeInTheDocument()
    expect(screen.getByText("program")).toBeInTheDocument()
    expect(screen.getByText("year")).toBeInTheDocument()
    expect(screen.getByText("sortOrder")).toBeInTheDocument()
    expect(screen.getByText("testimonial")).toBeInTheDocument()
    expect(screen.getByText("isFeatured")).toBeInTheDocument()
  })

  it("学生姓名为空时保存触发错误提示", async () => {
    render(<CaseDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("save"))

    expect(toast.error).toHaveBeenCalledWith("nameRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("姓名有值但大学为空时保存触发错误提示", async () => {
    render(<CaseDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("studentNamePlaceholder"), "李四")
    await userEvent.click(screen.getByText("save"))

    expect(toast.error).toHaveBeenCalledWith("universityRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("姓名和大学有值但专业为空时保存触发错误提示", async () => {
    render(<CaseDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("studentNamePlaceholder"), "李四")
    await userEvent.type(screen.getByPlaceholderText("universityPlaceholder"), "清华大学")
    await userEvent.click(screen.getByText("save"))

    expect(toast.error).toHaveBeenCalledWith("programRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("创建成功调用 onSave", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<CaseDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("studentNamePlaceholder"), "王五")
    await userEvent.type(screen.getByPlaceholderText("universityPlaceholder"), "哈佛大学")
    await userEvent.type(screen.getByPlaceholderText("programPlaceholder"), "法学")
    await userEvent.click(screen.getByText("save"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("createSuccess")
      expect(defaultProps.onSave).toHaveBeenCalled()
    })
  })

  it("编辑成功调用 onSave", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const sc = mockCase()

    render(<CaseDialog {...defaultProps} successCase={sc} />)

    await userEvent.click(screen.getByText("save"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("updateSuccess")
      expect(defaultProps.onSave).toHaveBeenCalled()
    })
  })

  it("保存失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))
    const sc = mockCase()

    render(<CaseDialog {...defaultProps} successCase={sc} />)

    await userEvent.click(screen.getByText("save"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("saveError")
    })
  })

  it("取消按钮调用 onClose", async () => {
    render(<CaseDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("cancel"))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it("未 open 时不渲染内容", () => {
    render(<CaseDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("createTitle")).not.toBeInTheDocument()
  })
})
