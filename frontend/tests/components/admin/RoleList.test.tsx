/**
 * RoleList 角色列表组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
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

/* mock 拖拽库 */
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: vi.fn((arr: unknown[]) => arr),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}))

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}))

/* mock RoleDialog 子组件 */
vi.mock("@/components/admin/RoleDialog", () => ({
  RoleDialog: () => <div data-testid="role-dialog" />,
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { RoleList } from "@/components/admin/RoleList"
import type { Role } from "@/types"

/** 构造模拟角色数据 */
function mockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: "role1",
    name: "测试角色",
    description: "角色描述",
    is_builtin: false,
    sort_order: 0,
    permissions: ["admin/users"],
    user_count: 3,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  }
}

describe("RoleList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("加载中显示 loading 文本", () => {
    /* 不 resolve，保持 loading 状态 */
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    render(<RoleList />)

    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("加载完成显示角色列表", async () => {
    const roles = [
      mockRole({ id: "r1", name: "管理员", description: "管理" }),
      mockRole({ id: "r2", name: "学生", description: "学生角色" }),
    ]
    vi.mocked(api.get).mockResolvedValue({ data: roles })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("管理员")).toBeInTheDocument()
      expect(screen.getByText("学生")).toBeInTheDocument()
    })
  })

  it("空数据显示 noData 提示", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("noData")).toBeInTheDocument()
    })
  })

  it("渲染表头列", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [mockRole()] })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("col_name")).toBeInTheDocument()
      expect(screen.getByText("col_description")).toBeInTheDocument()
      expect(screen.getByText("col_type")).toBeInTheDocument()
      expect(screen.getByText("col_permissions")).toBeInTheDocument()
      expect(screen.getByText("col_users")).toBeInTheDocument()
      expect(screen.getByText("col_actions")).toBeInTheDocument()
    })
  })

  it("内建角色显示 builtin 标签", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [mockRole({ is_builtin: true })],
    })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("builtin")).toBeInTheDocument()
    })
  })

  it("自定义角色显示 custom 标签", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [mockRole({ is_builtin: false })],
    })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("custom")).toBeInTheDocument()
    })
  })

  it("superuser 角色不显示编辑/删除按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [mockRole({ id: "su", permissions: ["*"] })],
    })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.queryByText("edit")).not.toBeInTheDocument()
      expect(screen.queryByText("delete")).not.toBeInTheDocument()
    })
  })

  it("普通角色显示编辑和删除按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [mockRole({ permissions: ["admin/users"] })],
    })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("edit")).toBeInTheDocument()
      expect(screen.getByText("delete")).toBeInTheDocument()
    })
  })

  it("渲染创建按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    render(<RoleList />)

    expect(screen.getByText("createGroup")).toBeInTheDocument()
  })

  it("获取角色列表失败显示错误提示", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("fail"))

    render(<RoleList />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("fetchError")
    })
  })

  it("显示权限数和用户数", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [mockRole({ permissions: ["a", "b"], user_count: 5 })],
    })

    render(<RoleList />)

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
    })
  })
})
