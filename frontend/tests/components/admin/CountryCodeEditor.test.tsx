/**
 * CountryCodeEditor 国家码编辑器组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

/** 稳定引用的翻译函数，避免 useEffect 无限循环 */
const stableT = (key: string, params?: Record<string, string>) => {
  if (params) return `${key}(${JSON.stringify(params)})`
  return key
}

vi.mock("next-intl", () => ({
  useTranslations: () => stableT,
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

vi.mock("@/lib/api-error", () => ({
  getApiError: (_err: unknown, _t: unknown, fallback: string) => fallback,
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { CountryCodeEditor } from "@/components/admin/CountryCodeEditor"

/** 模拟配置数据 */
const mockCountryCodes = [
  { code: "+86", country: "CN", label: "中国 +86", digits: 11, enabled: true },
  { code: "+1", country: "US", label: "美国 +1", digits: 10, enabled: true },
]

describe("CountryCodeEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue({
      data: [{ key: "phone_country_codes", value: mockCountryCodes }],
    })
  })

  it("加载中显示 Loading 文本", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<CountryCodeEditor />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("渲染卡片标题和描述", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => {
      expect(screen.getByText("phoneCountryCodes")).toBeInTheDocument()
      expect(screen.getByText("phoneCountryCodesDesc")).toBeInTheDocument()
    })
  })

  it("渲染国家码行数据", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("+86")).toBeInTheDocument()
      expect(screen.getByDisplayValue("CN")).toBeInTheDocument()
      expect(screen.getByDisplayValue("+1")).toBeInTheDocument()
      expect(screen.getByDisplayValue("US")).toBeInTheDocument()
    })
  })

  it("渲染表头", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => {
      expect(screen.getByText("enabled")).toBeInTheDocument()
      expect(screen.getByText("code")).toBeInTheDocument()
      expect(screen.getByText("country")).toBeInTheDocument()
      expect(screen.getByText("labelField")).toBeInTheDocument()
      expect(screen.getByText("digits")).toBeInTheDocument()
    })
  })

  it("点击添加按钮增加空行", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => screen.getByText("add"))

    /* 记录初始输入框数量 */
    const initialInputs = screen.getAllByRole("textbox")
    const addBtn = screen.getByText("add")
    await userEvent.click(addBtn)

    /* 新增行后输入框数量增加 */
    await waitFor(() => {
      const newInputs = screen.getAllByRole("textbox")
      expect(newInputs.length).toBeGreaterThan(initialInputs.length)
    })
  })

  it("无数据时显示 noData", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ key: "phone_country_codes", value: [] }],
    })

    render(<CountryCodeEditor />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })

  it("保存调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<CountryCodeEditor />)

    await waitFor(() => screen.getByText("save"))

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/list/edit",
        expect.objectContaining({ key: "phone_country_codes" }),
      )
      expect(toast.success).toHaveBeenCalledWith("saveSuccess")
    })
  })

  it("保存失败显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))
    render(<CountryCodeEditor />)

    await waitFor(() => screen.getByText("save"))

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("saveError")
    })
  })

  it("点击删除已有行弹出确认对话框", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => screen.getByDisplayValue("+86"))

    /* 找到删除按钮（Trash2 图标按钮），class 包含 text-destructive */
    const allButtons = screen.getAllByRole("button")
    const deleteBtn = allButtons.find(
      (btn) => btn.className.includes("text-destructive"),
    )
    expect(deleteBtn).toBeTruthy()
    await userEvent.click(deleteBtn!)

    await waitFor(() => {
      expect(screen.getByText("confirmDelete")).toBeInTheDocument()
    })
  })

  it("API 加载失败时显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))
    render(<CountryCodeEditor />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("fetchError")
    })
  })

  it("编辑 code 字段值更新", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => screen.getByDisplayValue("+86"))

    const codeInput = screen.getByDisplayValue("+86")
    /* 使用 fireEvent 直接设置值，绕过 userEvent 的兼容问题 */
    fireEvent.change(codeInput, { target: { value: "+81" } })

    expect(screen.getByDisplayValue("+81")).toBeInTheDocument()
  })

  it("渲染添加和保存按钮", async () => {
    render(<CountryCodeEditor />)

    await waitFor(() => {
      expect(screen.getByText("add")).toBeInTheDocument()
      expect(screen.getByText("save")).toBeInTheDocument()
    })
  })
})
