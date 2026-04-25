/**
 * UserTable 用户管理列表组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/users",
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

vi.mock("@/components/admin/UserExpandPanel", () => ({
  UserExpandPanel: ({ userId }: { userId: string }) => (
    <div data-testid="expand-panel">{userId}</div>
  ),
}))

import api from "@/lib/api"
import { UserTable } from "@/components/admin/UserTable"

/** 构造模拟用户数据 */
function mockUser(overrides: Partial<{
  id: string
  username: string | null
  phone: string | null
  is_active: boolean
  role_name: string | null
  created_at: string
}> = {}) {
  return {
    id: overrides.id ?? "u1",
    username: overrides.username ?? "张三",
    phone: overrides.phone ?? "13800000001",
    is_active: overrides.is_active ?? true,
    role_name: overrides.role_name ?? "student",
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
    two_factor_enabled: false,
    two_factor_method: null,
    storage_quota: 100,
    permissions: [],
    role_id: "r1",
    updated_at: null,
  }
}

describe("UserTable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染表格和搜索输入框", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [mockUser()], total: 1, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<UserTable />)

    /* 搜索框 */
    expect(screen.getByPlaceholderText("searchPlaceholder")).toBeInTheDocument()

    /* 表头 */
    await waitFor(() => {
      expect(screen.getByText("col_username")).toBeInTheDocument()
      expect(screen.getByText("col_phone")).toBeInTheDocument()
      expect(screen.getByText("col_status")).toBeInTheDocument()
      expect(screen.getByText("col_role")).toBeInTheDocument()
      expect(screen.getByText("col_createdAt")).toBeInTheDocument()
    })
  })

  it("渲染用户行数据", async () => {
    const users = [
      mockUser({ id: "u1", username: "张三", phone: "13800000001", role_name: "student" }),
      mockUser({ id: "u2", username: "李四", phone: "13800000002", role_name: "advisor", is_active: false }),
    ]
    vi.mocked(api.get).mockResolvedValue({
      data: { items: users, total: 2, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<UserTable />)

    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument()
      expect(screen.getByText("李四")).toBeInTheDocument()
      expect(screen.getByText("13800000001")).toBeInTheDocument()
      expect(screen.getByText("13800000002")).toBeInTheDocument()
    })

    /* 活跃/非活跃状态 */
    expect(screen.getByText("status_active")).toBeInTheDocument()
    expect(screen.getByText("status_inactive")).toBeInTheDocument()

    /* 角色 */
    expect(screen.getByText("student")).toBeInTheDocument()
    expect(screen.getByText("advisor")).toBeInTheDocument()
  })

  it("无数据时显示空状态", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<UserTable />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })

  it("加载中显示 loading 文本", () => {
    /* 让 API 永远不 resolve，保持 loading 状态 */
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    render(<UserTable />)

    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("搜索输入框可输入", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 },
    })

    render(<UserTable />)

    const input = screen.getByPlaceholderText("searchPlaceholder")
    await userEvent.type(input, "测试")

    expect(input).toHaveValue("测试")
  })

  it("多页时渲染分页组件", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [mockUser()], total: 50, page: 1, page_size: 20, total_pages: 3 },
    })

    render(<UserTable />)

    await waitFor(() => {
      expect(screen.getByTestId("pagination")).toBeInTheDocument()
      expect(screen.getByText("totalCount")).toBeInTheDocument()
    })
  })

  it("API 失败时清空用户列表", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    render(<UserTable />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })
})
