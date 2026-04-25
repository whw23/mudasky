/**
 * PermissionTree 权限选择器组件测试。
 * 测试组件渲染、工具函数、搜索和交互。
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

import api from "@/lib/api"
import {
  PermissionTree,
  collectAllLeaves,
  expandWildcards,
  collapseToWildcards,
} from "@/components/admin/PermissionTree"

/** 模拟权限树数据 */
const MOCK_TREE = {
  admin: {
    description: "管理面板",
    children: {
      users: { description: "用户管理" },
      roles: { description: "角色管理" },
    },
  },
  portal: {
    description: "用户面板",
    children: {
      profile: { description: "个人资料" },
    },
  },
}

describe("PermissionTree 工具函数", () => {
  it("collectAllLeaves 收集所有叶子路径", () => {
    const leaves = collectAllLeaves(MOCK_TREE)

    expect(leaves).toContain("admin/users")
    expect(leaves).toContain("admin/roles")
    expect(leaves).toContain("portal/profile")
    expect(leaves).toHaveLength(3)
  })

  it("expandWildcards 展开 * 通配符", () => {
    const result = expandWildcards(new Set(["*"]), MOCK_TREE)

    expect(result.size).toBe(3)
    expect(result.has("admin/users")).toBe(true)
    expect(result.has("admin/roles")).toBe(true)
    expect(result.has("portal/profile")).toBe(true)
  })

  it("expandWildcards 展开子路径通配符", () => {
    const result = expandWildcards(new Set(["admin/*"]), MOCK_TREE)

    expect(result.size).toBe(2)
    expect(result.has("admin/users")).toBe(true)
    expect(result.has("admin/roles")).toBe(true)
  })

  it("expandWildcards 保留具体路径", () => {
    const result = expandWildcards(new Set(["admin/users"]), MOCK_TREE)

    expect(result.size).toBe(1)
    expect(result.has("admin/users")).toBe(true)
  })

  it("collapseToWildcards 全选时压缩为 *", () => {
    const allLeaves = new Set(collectAllLeaves(MOCK_TREE))
    const result = collapseToWildcards(allLeaves, MOCK_TREE)

    expect(result.size).toBe(1)
    expect(result.has("*")).toBe(true)
  })

  it("collapseToWildcards 部分选时保留具体路径", () => {
    const selected = new Set(["admin/users"])
    const result = collapseToWildcards(selected, MOCK_TREE)

    expect(result.size).toBe(1)
    expect(result.has("admin/users")).toBe(true)
  })
})

describe("PermissionTree 组件", () => {
  const defaultProps = {
    selectedCodes: new Set<string>(),
    onSelectionChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("API 返回数据后渲染权限分类", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: MOCK_TREE },
    })

    render(<PermissionTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("管理面板")).toBeInTheDocument()
      expect(screen.getByText("用户面板")).toBeInTheDocument()
    })
  })

  it("API 失败时不渲染", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("fail"))

    const { container } = render(<PermissionTree {...defaultProps} />)

    /* tree 为 null 时返回 null */
    await waitFor(() => {
      expect(container.querySelector(".rounded-lg")).toBeNull()
    })
  })

  it("渲染搜索框", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: MOCK_TREE },
    })

    render(<PermissionTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("searchPermissions")).toBeInTheDocument()
    })
  })

  it("渲染全选按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: MOCK_TREE },
    })

    render(<PermissionTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("toggleAll")).toBeInTheDocument()
    })
  })

  it("显示已选/总数计数", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: MOCK_TREE },
    })

    render(
      <PermissionTree
        {...defaultProps}
        selectedCodes={new Set(["admin/users"])}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("1/3")).toBeInTheDocument()
    })
  })

  it("readonly 模式不渲染全选按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: MOCK_TREE },
    })

    render(<PermissionTree {...defaultProps} readonly />)

    await waitFor(() => {
      expect(screen.queryByText("toggleAll")).not.toBeInTheDocument()
    })
  })

  it("点击面板项导航到子分类", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: MOCK_TREE },
    })

    render(<PermissionTree {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("管理面板")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText("管理面板"))

    await waitFor(() => {
      expect(screen.getByText("用户管理")).toBeInTheDocument()
      expect(screen.getByText("角色管理")).toBeInTheDocument()
    })
  })
})
