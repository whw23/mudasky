/**
 * ContactExpandPanel 联系人详情展开面板组件测试。
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

vi.mock("@/lib/api-error", () => ({
  getApiError: (_err: unknown, _t: unknown, fallback: string) => fallback,
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { ContactExpandPanel } from "@/components/admin/ContactExpandPanel"
import type { ContactRecord } from "@/types"

/** 构造模拟联系人用户 */
function mockContactUser(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? "c1",
    username: overrides.username ?? "联系人A",
    phone: overrides.phone ?? "13600000001",
    is_active: overrides.is_active ?? true,
    two_factor_enabled: false,
    two_factor_method: null,
    storage_quota: 100,
    permissions: [],
    role_id: null,
    role_name: null,
    created_at: overrides.created_at ?? "2024-03-01T00:00:00Z",
    updated_at: null,
    contact_status: overrides.contact_status ?? "new",
    contact_note: overrides.contact_note ?? null,
  }
}

/** 构造模拟联系记录 */
function mockRecord(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    id: overrides.id ?? "rec1",
    user_id: overrides.user_id ?? "c1",
    staff_id: overrides.staff_id ?? "admin1",
    action: overrides.action ?? "mark_status",
    note: overrides.note ?? "标记为已联系",
    created_at: overrides.created_at ?? "2024-03-10T00:00:00Z",
  }
}

describe("ContactExpandPanel", () => {
  const onUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("contacts/list/detail/history")) {
        return Promise.resolve({ data: [] })
      }
      if (url.includes("contacts/list/detail")) {
        return Promise.resolve({ data: mockContactUser() })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it("加载中显示 loading 文本", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)
    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("渲染联系人基本信息", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("联系人A")).toBeInTheDocument()
      expect(screen.getByText("13600000001")).toBeInTheDocument()
      expect(screen.getByText("basicInfo")).toBeInTheDocument()
    })
  })

  it("渲染联系状态选择区域", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("markStatus")).toBeInTheDocument()
    })
  })

  it("标记状态调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("markStatus"))

    /* 点击保存按钮 */
    const saveButtons = screen.getAllByText("save")
    await userEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/contacts/list/detail/mark",
        expect.objectContaining({ user_id: "c1", status: "new" }),
      )
      expect(toast.success).toHaveBeenCalledWith("statusUpdated")
      expect(onUpdate).toHaveBeenCalled()
    })
  })

  it("渲染添加备注区域", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("addNote")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("notePlaceholder")).toBeInTheDocument()
    })
  })

  it("空备注提交时显示错误提示", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("addNote"))

    /* 第二个 save 按钮对应备注 */
    const saveButtons = screen.getAllByText("save")
    await userEvent.click(saveButtons[1])

    expect(toast.error).toHaveBeenCalledWith("noteRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("添加备注调用 API", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByPlaceholderText("notePlaceholder"))

    const textarea = screen.getByPlaceholderText("notePlaceholder")
    await userEvent.type(textarea, "新的备注")

    const saveButtons = screen.getAllByText("save")
    await userEvent.click(saveButtons[1])

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/admin/contacts/list/detail/note",
        expect.objectContaining({ user_id: "c1", note: "新的备注" }),
      )
      expect(toast.success).toHaveBeenCalledWith("noteAdded")
    })
  })

  it("渲染升级为学生按钮", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      /* upgradeToStudent 同时是 heading 和 button 文本 */
      expect(screen.getAllByText("upgradeToStudent").length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText("upgradeToStudentDesc")).toBeInTheDocument()
    })
  })

  it("点击升级弹出确认对话框", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => screen.getByText("upgradeToStudentDesc"))

    const buttons = screen.getAllByText("upgradeToStudent")
    const btn = buttons.find((el) => el.tagName === "BUTTON")!
    await userEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText("confirmUpgradeTitle")).toBeInTheDocument()
      expect(screen.getByText("confirmUpgradeDesc")).toBeInTheDocument()
    })
  })

  it("无联系历史时显示 noHistory", async () => {
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("contactHistory")).toBeInTheDocument()
      expect(screen.getByText("noHistory")).toBeInTheDocument()
    })
  })

  it("有联系历史时渲染记录列表", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("contacts/list/detail/history")) {
        return Promise.resolve({
          data: [
            mockRecord({ action: "mark_status", note: "标记为已联系" }),
            mockRecord({ id: "rec2", action: "add_note", note: "电话沟通" }),
          ],
        })
      }
      if (url.includes("contacts/list/detail")) {
        return Promise.resolve({ data: mockContactUser() })
      }
      return Promise.resolve({ data: {} })
    })

    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(screen.getByText("actionMarkStatus")).toBeInTheDocument()
      expect(screen.getByText("标记为已联系")).toBeInTheDocument()
      expect(screen.getByText("actionAddNote")).toBeInTheDocument()
      expect(screen.getByText("电话沟通")).toBeInTheDocument()
    })
  })

  it("API 获取联系人失败时显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))
    render(<ContactExpandPanel userId="c1" onUpdate={onUpdate} />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("fetchError")
    })
  })
})
