/**
 * CategoryDialog 分类创建/编辑对话框组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/content/categories",
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
import { CategoryDialog } from "@/components/admin/CategoryDialog"
import type { Category } from "@/types"

/** 构造模拟分类数据 */
function mockCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: overrides.id ?? "cat1",
    name: overrides.name ?? "留学资讯",
    slug: overrides.slug ?? "study-abroad",
    description: overrides.description ?? "留学相关资讯",
    sort_order: overrides.sort_order ?? 1,
    article_count: overrides.article_count ?? 5,
    created_at: overrides.created_at ?? "2024-01-01T00:00:00Z",
  }
}

describe("CategoryDialog", () => {
  const defaultProps = {
    category: null as Category | null,
    open: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("创建模式：渲染空表单", () => {
    render(<CategoryDialog {...defaultProps} />)

    expect(screen.getByText("createTitle")).toBeInTheDocument()
    expect(screen.getByText("createDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("namePlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("slugPlaceholder")).toHaveValue("")
    expect(screen.getByPlaceholderText("descriptionPlaceholder")).toHaveValue("")
  })

  it("编辑模式：填充已有分类数据", () => {
    const cat = mockCategory({ name: "签证指南", slug: "visa-guide", description: "签证办理指南" })

    render(<CategoryDialog {...defaultProps} category={cat} />)

    expect(screen.getByText("editTitle")).toBeInTheDocument()
    expect(screen.getByText("editDesc")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("namePlaceholder")).toHaveValue("签证指南")
    expect(screen.getByPlaceholderText("slugPlaceholder")).toHaveValue("visa-guide")
    expect(screen.getByPlaceholderText("descriptionPlaceholder")).toHaveValue("签证办理指南")
  })

  it("渲染四个表单字段", () => {
    render(<CategoryDialog {...defaultProps} />)

    expect(screen.getByText("name")).toBeInTheDocument()
    expect(screen.getByText("slug")).toBeInTheDocument()
    expect(screen.getByText("description")).toBeInTheDocument()
    expect(screen.getByText("sortOrder")).toBeInTheDocument()
  })

  it("名称为空时保存触发错误提示", async () => {
    render(<CategoryDialog {...defaultProps} />)

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    expect(toast.error).toHaveBeenCalledWith("nameRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("名称有值但标识为空时保存触发错误提示", async () => {
    render(<CategoryDialog {...defaultProps} />)

    const nameInput = screen.getByPlaceholderText("namePlaceholder")
    await userEvent.type(nameInput, "测试分类")

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    expect(toast.error).toHaveBeenCalledWith("slugRequired")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("创建成功调用 onSave", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<CategoryDialog {...defaultProps} />)

    await userEvent.type(screen.getByPlaceholderText("namePlaceholder"), "新分类")
    await userEvent.type(screen.getByPlaceholderText("slugPlaceholder"), "new-cat")

    const saveBtn = screen.getByText("save")
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("createSuccess")
      expect(defaultProps.onSave).toHaveBeenCalled()
    })
  })

  it("取消按钮调用 onClose", async () => {
    render(<CategoryDialog {...defaultProps} />)

    const cancelBtn = screen.getByText("cancel")
    await userEvent.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it("未 open 时不渲染内容", () => {
    render(<CategoryDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("createTitle")).not.toBeInTheDocument()
  })
})
