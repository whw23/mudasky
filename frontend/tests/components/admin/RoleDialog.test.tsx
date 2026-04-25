/**
 * RoleDialog 角色创建/编辑对话框组件测试。
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

vi.mock("@/components/admin/PermissionTree", () => ({
  PermissionTree: ({ selectedCodes }: { selectedCodes: Set<string> }) => (
    <div data-testid="permission-tree">权限树（已选 {selectedCodes.size} 项）</div>
  ),
  expandWildcards: (set: Set<string>) => set,
  collapseToWildcards: (set: Set<string>) => set,
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { RoleDialog } from "@/components/admin/RoleDialog"
import type { Role } from "@/types"

/** 构造模拟角色数据 */
function mockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: overrides.id ?? "role1",
    name: overrides.name ?? "测试角色",
    description: overrides.description ?? "角色描述",
    is_builtin: overrides.is_builtin ?? false,
    sort_order: overrides.sort_order ?? 0,
    permissions: overrides.permissions ?? ["admin/users"],
    user_count: overrides.user_count ?? 3,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? null,
  }
}

describe("RoleDialog", () => {
  const defaultProps = {
    role: null as Role | null,
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    /* 默认 mock permission tree API */
    vi.mocked(api.get).mockResolvedValue({
      data: { permission_tree: {} },
    })
  })

  it("创建模式：渲染空表单和创建标题", () => {
    render(<RoleDialog {...defaultProps} />)

    expect(screen.getByText("createTitle")).toBeInTheDocument()
    expect(screen.getByText("createDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("namePlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("descriptionPlaceholder")).toHaveValue("")
  })

  it("编辑模式：填充已有角色数据", async () => {
    const role = mockRole({ name: "管理员", description: "管理角色" })

    render(<RoleDialog {...defaultProps} role={role} />)

    await waitFor(() => {
      expect(screen.getByText("editTitle")).toBeInTheDocument()
      expect(screen.getByText("editDesc")).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText("namePlaceholder")).toHaveValue("管理员")
    expect(screen.getByPlaceholderText("descriptionPlaceholder")).toHaveValue("管理角色")
  })

  it("渲染权限树组件", () => {
    render(<RoleDialog {...defaultProps} />)

    expect(screen.getByTestId("permission-tree")).toBeInTheDocument()
  })

  it("名称为空时保存触发错误提示", async () => {
    render(<RoleDialog {...defaultProps} />)

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    expect(toast.error).toHaveBeenCalledWith("nameRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("名称输入可编辑", async () => {
    render(<RoleDialog {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText("namePlaceholder")
    await userEvent.type(nameInput, "新角色")

    expect(nameInput).toHaveValue("新角色")
  })

  it("取消按钮调用 onClose", async () => {
    render(<RoleDialog {...defaultProps} />)

    const cancelBtn = screen.getByText("cancel")
    await userEvent.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it("未 open 时不渲染内容", () => {
    render(<RoleDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("createTitle")).not.toBeInTheDocument()
  })
})
