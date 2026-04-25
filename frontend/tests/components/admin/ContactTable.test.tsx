/**
 * ContactTable 联系人管理列表组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/contacts",
}))

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page, totalPages }: { page: number; totalPages: number }) => (
    <div data-testid="pagination">
      第 {page}/{totalPages} 页
    </div>
  ),
}))

vi.mock("@/components/admin/ContactExpandPanel", () => ({
  ContactExpandPanel: ({ userId }: { userId: string }) => (
    <div data-testid="contact-expand-panel">{userId}</div>
  ),
}))

import api from "@/lib/api"
import { ContactTable } from "@/components/admin/ContactTable"
import type { User } from "@/types"

/** 联系人类型（User 扩展） */
type ContactUser = User & {
  contact_status: string | null
  contact_note: string | null
}

/** 构造模拟联系人数据 */
function mockContact(overrides: Partial<{
  id: string
  username: string | null
  phone: string | null
  contact_status: string | null
  contact_note: string | null
  created_at: string
}> = {}): ContactUser {
  return {
    id: overrides.id ?? "c1",
    username: overrides.username ?? "咨询者A",
    phone: overrides.phone ?? "13700000001",
    is_active: true,
    two_factor_enabled: false,
    two_factor_method: null,
    storage_quota: 100,
    permissions: [],
    role_id: null,
    role_name: null,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: null,
    contact_status: overrides.contact_status ?? "new",
    contact_note: overrides.contact_note ?? null,
  }
}

describe("ContactTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染表格表头", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [mockContact()], total: 1, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<ContactTable />)

    await waitFor(() => {
      expect(screen.getByText("col_username")).toBeInTheDocument()
      expect(screen.getByText("col_phone")).toBeInTheDocument()
      expect(screen.getByText("col_contactStatus")).toBeInTheDocument()
      expect(screen.getByText("col_note")).toBeInTheDocument()
      expect(screen.getByText("col_createdAt")).toBeInTheDocument()
    })
  })

  it("渲染联系人行数据", async () => {
    const contacts = [
      mockContact({ id: "c1", username: "咨询者A", phone: "13700000001", contact_status: "new" }),
      mockContact({ id: "c2", username: "咨询者B", phone: "13700000002", contact_status: "contacted", contact_note: "已回电" }),
    ]
    vi.mocked(api.get).mockResolvedValue({
      data: { items: contacts, total: 2, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<ContactTable />)

    await waitFor(() => {
      expect(screen.getByText("咨询者A")).toBeInTheDocument()
      expect(screen.getByText("咨询者B")).toBeInTheDocument()
      expect(screen.getByText("13700000001")).toBeInTheDocument()
      expect(screen.getByText("13700000002")).toBeInTheDocument()
      expect(screen.getByText("已回电")).toBeInTheDocument()
    })
  })

  it("无数据时显示空状态", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<ContactTable />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })

  it("加载中显示 loading 文本", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    render(<ContactTable />)

    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("不同联系状态显示对应翻译键", async () => {
    const contacts = [
      mockContact({ id: "c1", contact_status: "new" }),
      mockContact({ id: "c2", contact_status: "contacted" }),
      mockContact({ id: "c3", contact_status: "interested" }),
      mockContact({ id: "c4", contact_status: "not_interested" }),
    ]
    vi.mocked(api.get).mockResolvedValue({
      data: { items: contacts, total: 4, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<ContactTable />)

    await waitFor(() => {
      expect(screen.getByText("statusNew")).toBeInTheDocument()
      expect(screen.getByText("statusContacted")).toBeInTheDocument()
      expect(screen.getByText("statusInterested")).toBeInTheDocument()
      expect(screen.getByText("statusNotInterested")).toBeInTheDocument()
    })
  })

  it("多页时渲染分页组件", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [mockContact()], total: 50, page: 1, page_size: 20, total_pages: 3 },
    })

    render(<ContactTable />)

    await waitFor(() => {
      expect(screen.getByTestId("pagination")).toBeInTheDocument()
    })
  })

  it("API 失败时清空联系人列表", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    render(<ContactTable />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })
})
