/**
 * StudentTable 学生管理列表组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/students",
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

vi.mock("@/components/admin/StudentExpandPanel", () => ({
  StudentExpandPanel: ({ userId }: { userId: string }) => (
    <div data-testid="student-expand-panel">{userId}</div>
  ),
}))

import api from "@/lib/api"
import { StudentTable } from "@/components/admin/StudentTable"

/** 构造模拟学生数据 */
function mockStudent(overrides: Partial<{
  id: string
  username: string | null
  phone: string | null
  is_active: boolean
  contact_status: string | null
  advisor_id: string | null
  created_at: string
}> = {}) {
  return {
    id: overrides.id ?? "s1",
    username: overrides.username ?? "学生A",
    phone: overrides.phone ?? "13900000001",
    is_active: overrides.is_active ?? true,
    contact_status: overrides.contact_status ?? "new",
    contact_note: null,
    advisor_id: overrides.advisor_id ?? "adv1",
    storage_quota: 100,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: null,
  }
}

describe("StudentTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染表格和筛选控件", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [mockStudent()], total: 1, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<StudentTable />)

    /* 筛选复选框 */
    expect(screen.getByText("filterMyStudents")).toBeInTheDocument()
    expect(screen.getByRole("checkbox")).toBeChecked()

    /* 顾问 ID 输入 */
    expect(screen.getByPlaceholderText("advisorIdPlaceholder")).toBeInTheDocument()

    /* 表头 */
    await waitFor(() => {
      expect(screen.getByText("col_username")).toBeInTheDocument()
      expect(screen.getByText("col_phone")).toBeInTheDocument()
      expect(screen.getByText("col_status")).toBeInTheDocument()
      expect(screen.getByText("col_contactStatus")).toBeInTheDocument()
      expect(screen.getByText("col_advisor")).toBeInTheDocument()
      expect(screen.getByText("col_createdAt")).toBeInTheDocument()
    })
  })

  it("渲染学生行数据", async () => {
    const students = [
      mockStudent({ id: "s1", username: "学生A", phone: "13900000001", advisor_id: "adv1" }),
      mockStudent({ id: "s2", username: "学生B", phone: "13900000002", is_active: false, advisor_id: "adv2" }),
    ]
    vi.mocked(api.get).mockResolvedValue({
      data: { items: students, total: 2, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<StudentTable />)

    await waitFor(() => {
      expect(screen.getByText("学生A")).toBeInTheDocument()
      expect(screen.getByText("学生B")).toBeInTheDocument()
      expect(screen.getByText("13900000001")).toBeInTheDocument()
      expect(screen.getByText("13900000002")).toBeInTheDocument()
    })

    expect(screen.getByText("statusActive")).toBeInTheDocument()
    expect(screen.getByText("statusInactive")).toBeInTheDocument()
  })

  it("无数据时显示空状态", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<StudentTable />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })

  it("复选框可切换「仅我的学生」筛选", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<StudentTable />)

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).toBeChecked()

    await userEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it("顾问筛选输入框可输入", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<StudentTable />)

    const input = screen.getByPlaceholderText("advisorIdPlaceholder")
    await userEvent.type(input, "adv-test")

    expect(input).toHaveValue("adv-test")
  })

  it("加载中显示 loading 文本", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    render(<StudentTable />)

    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("API 失败时清空学生列表", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    render(<StudentTable />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })
})
