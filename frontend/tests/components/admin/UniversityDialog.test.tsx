/**
 * UniversityDialog 合作院校创建/编辑对话框组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/universities",
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
import { UniversityDialog } from "@/components/admin/UniversityDialog"
import type { University } from "@/types"

/** 构造模拟院校数据 */
function mockUniversity(overrides: Partial<University> = {}): University {
  return {
    id: "uni1",
    name: "北京大学",
    name_en: "Peking University",
    country: "中国",
    province: "北京",
    city: "北京",
    logo_url: null,
    description: "顶尖学府",
    programs: ["计算机科学", "数学"],
    website: "https://pku.edu.cn",
    is_featured: true,
    sort_order: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    logo_image_id: null,
    image_ids: [],
    disciplines: [],
    admission_requirements: null,
    scholarship_info: null,
    qs_rankings: null,
    latitude: null,
    longitude: null,
    ...overrides,
  }
}

describe("UniversityDialog", () => {
  const defaultProps = {
    university: null as University | null,
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("创建模式：渲染空表单和创建标题", () => {
    render(<UniversityDialog {...defaultProps} />)

    expect(screen.getByText("createTitle")).toBeInTheDocument()
    expect(screen.getByText("createDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("namePlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("nameEnPlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("countryPlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("cityPlaceholder")).toHaveValue("")
  })

  it("编辑模式：填充已有院校数据", () => {
    const uni = mockUniversity()
    render(<UniversityDialog {...defaultProps} university={uni} />)

    expect(screen.getByText("editTitle")).toBeInTheDocument()
    expect(screen.getByText("editDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("namePlaceholder")).toHaveValue("北京大学")
    expect(screen.getByPlaceholderText("nameEnPlaceholder")).toHaveValue("Peking University")
    expect(screen.getByPlaceholderText("countryPlaceholder")).toHaveValue("中国")
    expect(screen.getByPlaceholderText("cityPlaceholder")).toHaveValue("北京")
  })

  it("渲染所有表单字段标签", () => {
    render(<UniversityDialog {...defaultProps} />)

    expect(screen.getByText("name")).toBeInTheDocument()
    expect(screen.getByText("nameEn")).toBeInTheDocument()
    expect(screen.getByText("country")).toBeInTheDocument()
    expect(screen.getByText("city")).toBeInTheDocument()
    expect(screen.getByText("description")).toBeInTheDocument()
    expect(screen.getByText("programs")).toBeInTheDocument()
    expect(screen.getByText("website")).toBeInTheDocument()
    expect(screen.getByText("logoUrl")).toBeInTheDocument()
    expect(screen.getByText("isFeatured")).toBeInTheDocument()
    expect(screen.getByText("sortOrder")).toBeInTheDocument()
  })

  it("名称为空时保存触发错误提示", async () => {
    render(<UniversityDialog {...defaultProps} />)

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    expect(toast.error).toHaveBeenCalledWith("nameRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("名称有值但国家为空时保存触发错误提示", async () => {
    render(<UniversityDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("namePlaceholder"), "测试大学")
    await userEvent.click(screen.getByText("save"))

    expect(toast.error).toHaveBeenCalledWith("countryRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("名称和国家有值但城市为空时保存触发错误提示", async () => {
    render(<UniversityDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("namePlaceholder"), "测试大学")
    await userEvent.type(screen.getByPlaceholderText("countryPlaceholder"), "中国")
    await userEvent.click(screen.getByText("save"))

    expect(toast.error).toHaveBeenCalledWith("cityRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("创建成功调用 onSave", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<UniversityDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("namePlaceholder"), "新大学")
    await userEvent.type(screen.getByPlaceholderText("countryPlaceholder"), "英国")
    await userEvent.type(screen.getByPlaceholderText("cityPlaceholder"), "伦敦")
    await userEvent.click(screen.getByText("save"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("createSuccess")
      expect(defaultProps.onSave).toHaveBeenCalled()
    })
  })

  it("编辑成功调用 onSave", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const uni = mockUniversity()

    render(<UniversityDialog {...defaultProps} university={uni} />)

    await userEvent.click(screen.getByText("save"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("updateSuccess")
      expect(defaultProps.onSave).toHaveBeenCalled()
    })
  })

  it("保存失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))
    const uni = mockUniversity()

    render(<UniversityDialog {...defaultProps} university={uni} />)

    await userEvent.click(screen.getByText("save"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("saveError")
    })
  })

  it("取消按钮调用 onClose", async () => {
    render(<UniversityDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("cancel"))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it("未 open 时不渲染内容", () => {
    render(<UniversityDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("createTitle")).not.toBeInTheDocument()
  })
})
