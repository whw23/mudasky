/**
 * UniversityEditDialog 院校编辑弹窗组件测试。
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

/* mock TiptapEditor */
vi.mock("@/components/editor/TiptapEditor", () => ({
  TiptapEditor: ({
    content,
    placeholder,
    onChange,
  }: {
    content: string
    placeholder: string
    onChange: (html: string) => void
  }) => (
    <textarea
      data-testid={`tiptap-${placeholder}`}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { UniversityEditDialog } from "@/components/admin/web-settings/UniversityEditDialog"

/** 构造院校数据 */
function mockUniversityData() {
  return {
    id: "uni-1",
    name: "慕尼黑大学",
    name_en: "LMU Munich",
    country: "德国",
    province: "巴伐利亚",
    city: "慕尼黑",
    description: "世界知名学府",
    website: "https://lmu.de",
    is_featured: true,
    logo_image_id: null,
    latitude: 48.15,
    longitude: 11.57,
    admission_requirements: "需要 APS 认证",
    scholarship_info: "DAAD 奖学金",
    qs_rankings: [{ year: 2024, ranking: 59 }],
  }
}

describe("UniversityEditDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    university: null as ReturnType<typeof mockUniversityData> | null,
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("创建模式：渲染添加院校标题", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByText("添加院校")).toBeInTheDocument()
  })

  it("编辑模式：渲染编辑院校标题", () => {
    render(
      <UniversityEditDialog {...defaultProps} university={mockUniversityData()} />,
    )

    expect(screen.getByText("编辑院校")).toBeInTheDocument()
  })

  it("渲染校名和英文名字段", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("校名")).toBeInTheDocument()
    expect(screen.getByLabelText("英文名")).toBeInTheDocument()
  })

  it("渲染国家、省份、城市字段", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("国家")).toBeInTheDocument()
    expect(screen.getByLabelText("省份/州")).toBeInTheDocument()
    expect(screen.getByLabelText("城市")).toBeInTheDocument()
  })

  it("渲染官网字段", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("官网")).toBeInTheDocument()
  })

  it("渲染经纬度字段", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("纬度")).toBeInTheDocument()
    expect(screen.getByLabelText("经度")).toBeInTheDocument()
  })

  it("渲染简介、录取要求、奖学金 TiptapEditor", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    /* TiptapEditor 被 mock 为 textarea，通过 placeholder 查找 */
    expect(screen.getByText("简介")).toBeInTheDocument()
    expect(screen.getByText("录取要求")).toBeInTheDocument()
    expect(screen.getByText("奖学金信息")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("院校简介")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("录取要求（可选）")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("奖学金信息（可选）")).toBeInTheDocument()
  })

  it("渲染 QS 排名区域", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByText("QS 世界排名")).toBeInTheDocument()
    expect(screen.getByText("添加")).toBeInTheDocument()
  })

  it("渲染保存和取消按钮", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByText("保存")).toBeInTheDocument()
    expect(screen.getByText("取消")).toBeInTheDocument()
  })

  it("编辑模式填充已有数据", () => {
    render(
      <UniversityEditDialog {...defaultProps} university={mockUniversityData()} />,
    )

    expect(screen.getByLabelText("校名")).toHaveValue("慕尼黑大学")
    expect(screen.getByLabelText("英文名")).toHaveValue("LMU Munich")
    expect(screen.getByLabelText("国家")).toHaveValue("德国")
    expect(screen.getByLabelText("省份/州")).toHaveValue("巴伐利亚")
    expect(screen.getByLabelText("城市")).toHaveValue("慕尼黑")
    expect(screen.getByLabelText("官网")).toHaveValue("https://lmu.de")
  })

  it("创建模式字段为空", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("校名")).toHaveValue("")
    expect(screen.getByLabelText("英文名")).toHaveValue("")
    expect(screen.getByLabelText("国家")).toHaveValue("")
    expect(screen.getByLabelText("城市")).toHaveValue("")
  })

  it("必填字段为空时提交触发错误提示", async () => {
    render(<UniversityEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("保存"))

    expect(toast.error).toHaveBeenCalledWith("校名、国家、城市不能为空")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("创建成功后关闭弹窗并调用 onSuccess", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<UniversityEditDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("校名"), "柏林大学")
    await userEvent.type(screen.getByLabelText("国家"), "德国")
    await userEvent.type(screen.getByLabelText("城市"), "柏林")
    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/universities/list/create",
        expect.objectContaining({
          name: "柏林大学",
          country: "德国",
          city: "柏林",
        }),
      )
      expect(toast.success).toHaveBeenCalledWith("院校已创建")
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("编辑成功后显示更新提示", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(
      <UniversityEditDialog {...defaultProps} university={mockUniversityData()} />,
    )

    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/universities/list/detail/edit",
        expect.objectContaining({
          university_id: "uni-1",
          name: "慕尼黑大学",
        }),
      )
      expect(toast.success).toHaveBeenCalledWith("院校已更新")
    })
  })

  it("创建失败显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(<UniversityEditDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("校名"), "大学")
    await userEvent.type(screen.getByLabelText("国家"), "国家")
    await userEvent.type(screen.getByLabelText("城市"), "城市")
    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("创建失败")
    })
  })

  it("编辑失败显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))

    render(
      <UniversityEditDialog {...defaultProps} university={mockUniversityData()} />,
    )

    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("更新失败")
    })
  })

  it("取消按钮关闭弹窗", async () => {
    render(<UniversityEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("未 open 时不渲染内容", () => {
    render(<UniversityEditDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("添加院校")).not.toBeInTheDocument()
  })

  it("点击添加排名按钮增加排名行", async () => {
    render(<UniversityEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("添加"))

    /* 新增排名行应出现年份和排名输入框 */
    const numberInputs = screen.getAllByRole("spinbutton")
    /* 包含年份和排名（+纬度+经度 = 至少 4 个 number input） */
    expect(numberInputs.length).toBeGreaterThanOrEqual(4)
  })

  it("渲染 Logo 上传区域", () => {
    render(<UniversityEditDialog {...defaultProps} />)

    expect(screen.getByText("Logo")).toBeInTheDocument()
    expect(screen.getByText("上传 Logo")).toBeInTheDocument()
  })
})
