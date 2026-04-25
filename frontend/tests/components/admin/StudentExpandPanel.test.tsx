/**
 * StudentExpandPanel 学生详情展开面板组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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
import { StudentExpandPanel } from "@/components/admin/StudentExpandPanel"
import type { Student, Document } from "@/types"

/** 构造模拟学生数据 */
function mockStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: overrides.id ?? "s1",
    username: overrides.username ?? "学生A",
    phone: overrides.phone ?? "13900000001",
    is_active: overrides.is_active ?? true,
    contact_status: overrides.contact_status ?? "new",
    contact_note: overrides.contact_note ?? "备注信息",
    advisor_id: overrides.advisor_id ?? null,
    storage_quota: overrides.storage_quota ?? 100,
    created_at: overrides.created_at ?? "2024-06-01T00:00:00Z",
    updated_at: null,
  }
}

/** 构造模拟文档数据 */
function mockDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: overrides.id ?? "d1",
    user_id: overrides.user_id ?? "s1",
    filename: overrides.filename ?? "file.pdf",
    original_name: overrides.original_name ?? "成绩单.pdf",
    file_size: overrides.file_size ?? 102400,
    mime_type: overrides.mime_type ?? "application/pdf",
    category: overrides.category ?? "transcript",
    created_at: overrides.created_at ?? "2024-06-15T00:00:00Z",
    updated_at: null,
  }
}

describe("StudentExpandPanel", () => {
  const onUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("students/list/detail") && !url.includes("documents")) {
        return Promise.resolve({ data: mockStudent() })
      }
      if (url.includes("documents/list")) {
        return Promise.resolve({ data: { items: [] } })
      }
      if (url.includes("meta/advisors")) {
        return Promise.resolve({
          data: [
            { id: "adv1", username: "顾问A", phone: "13700000001" },
            { id: "adv2", username: null, phone: "13700000002" },
          ],
        })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it("加载中显示 loading 文本", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)
    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("渲染学生基本信息", async () => {
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("学生A")).toBeInTheDocument()
      expect(screen.getByText("13900000001")).toBeInTheDocument()
      /* statusActive 同时出现在基本信息和编辑区域 */
      expect(screen.getAllByText("statusActive").length).toBeGreaterThanOrEqual(2)
    })
  })

  it("非活跃学生显示 statusInactive", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("students/list/detail") && !url.includes("documents")) {
        return Promise.resolve({ data: mockStudent({ is_active: false }) })
      }
      if (url.includes("documents/list")) {
        return Promise.resolve({ data: { items: [] } })
      }
      return Promise.resolve({ data: [] })
    })

    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("statusInactive")).toBeInTheDocument()
    })
  })

  it("渲染编辑区域含状态复选框和备注", async () => {
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("edit")).toBeInTheDocument()
      expect(screen.getByText("note")).toBeInTheDocument()
    })

    /* 备注 textarea 有初始值 */
    const textarea = screen.getByDisplayValue("备注信息")
    expect(textarea).toBeInTheDocument()
  })

  it("保存编辑调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("edit"))

    const saveBtn = screen.getAllByText("save")[0]
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/students/list/detail/edit",
        expect.objectContaining({ user_id: "s1" }),
      )
      expect(toast.success).toHaveBeenCalledWith("saveSuccess")
      expect(onUpdate).toHaveBeenCalled()
    })
  })

  it("渲染顾问分配区域", async () => {
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("assignAdvisor")).toBeInTheDocument()
      expect(screen.getByText("confirm")).toBeInTheDocument()
    })
  })

  it("分配顾问调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("confirm"))
    await userEvent.click(screen.getByText("confirm"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/students/list/detail/assign-advisor",
        expect.objectContaining({ user_id: "s1" }),
      )
      expect(toast.success).toHaveBeenCalledWith("assignAdvisorSuccess")
    })
  })

  it("无文档时显示 noFiles", async () => {
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("noFiles")).toBeInTheDocument()
    })
  })

  it("有文档时渲染文档表格", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("students/list/detail") && !url.includes("documents")) {
        return Promise.resolve({ data: mockStudent() })
      }
      if (url.includes("documents/list")) {
        return Promise.resolve({
          data: { items: [mockDocument({ original_name: "成绩单.pdf", file_size: 1048576 })] },
        })
      }
      return Promise.resolve({ data: [] })
    })

    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("成绩单.pdf")).toBeInTheDocument()
      expect(screen.getByText("1.0 MB")).toBeInTheDocument()
      expect(screen.getByText("download")).toBeInTheDocument()
    })
  })

  it("渲染降级按钮", async () => {
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("downgradeDesc")).toBeInTheDocument()
    })
  })

  it("点击降级弹出确认对话框", async () => {
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("downgradeDesc"))

    /* downgrade 同时是标题和按钮 */
    const buttons = screen.getAllByText("downgrade")
    const btn = buttons.find((el) => el.tagName === "BUTTON")!
    await userEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText("confirmDowngradeTitle")).toBeInTheDocument()
      expect(screen.getByText("confirmDowngradeDesc")).toBeInTheDocument()
    })
  })

  it("API 获取学生失败时显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))
    render(<StudentExpandPanel userId="s1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("fetchError")
    })
  })
})
