/**
 * ArticleEditDialog 文章编辑弹窗组件测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

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

vi.mock("@/components/editor/TiptapEditor", () => ({
  TiptapEditor: ({ content, placeholder }: { content: string; placeholder: string }) => (
    <div data-testid="tiptap-editor" data-content={content}>
      {placeholder}
    </div>
  ),
}))

import api from "@/lib/api"
import { toast } from "sonner"
import { ArticleEditDialog } from "@/components/admin/web-settings/ArticleEditDialog"

/** 模拟文章数据 */
function mockArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: "art1",
    title: "测试文章",
    slug: "test-article",
    content: "<p>文章内容</p>",
    excerpt: "文章摘要",
    category_id: "cat1",
    status: "draft",
    content_type: "html",
    file_id: null,
    ...overrides,
  }
}

describe("ArticleEditDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    article: null as ReturnType<typeof mockArticle> | null,
    categoryId: "cat1",
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("创建模式：渲染空表单和写文章标题", () => {
    render(<ArticleEditDialog {...defaultProps} />)

    expect(screen.getByText("写文章")).toBeInTheDocument()
    expect(screen.getByLabelText("标题")).toHaveValue("")
    expect(screen.getByLabelText("摘要")).toHaveValue("")
  })

  it("编辑模式：填充已有文章数据", () => {
    const article = mockArticle()
    render(<ArticleEditDialog {...defaultProps} article={article} />)

    expect(screen.getByText("编辑文章")).toBeInTheDocument()
    expect(screen.getByLabelText("标题")).toHaveValue("测试文章")
    expect(screen.getByLabelText("摘要")).toHaveValue("文章摘要")
  })

  it("渲染表单字段：标题、摘要、内容类型、正文、状态", () => {
    render(<ArticleEditDialog {...defaultProps} />)

    expect(screen.getByLabelText("标题")).toBeInTheDocument()
    expect(screen.getByLabelText("摘要")).toBeInTheDocument()
    expect(screen.getByText("内容类型")).toBeInTheDocument()
    expect(screen.getByText("富文本")).toBeInTheDocument()
    expect(screen.getByText("PDF 文件")).toBeInTheDocument()
    expect(screen.getByText("状态")).toBeInTheDocument()
  })

  it("渲染 TiptapEditor 组件（html 模式）", () => {
    render(<ArticleEditDialog {...defaultProps} />)

    expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument()
  })

  it("标题为空时保存触发错误提示", async () => {
    render(<ArticleEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("保存"))

    expect(toast.error).toHaveBeenCalledWith("标题不能为空")
    expect(api.post).not.toHaveBeenCalled()
  })

  it("创建成功调用 onSuccess", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })

    render(<ArticleEditDialog {...defaultProps} />)

    await userEvent.type(screen.getByLabelText("标题"), "新文章")
    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("文章已创建")
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("编辑成功调用 onSuccess", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const article = mockArticle()

    render(<ArticleEditDialog {...defaultProps} article={article} />)

    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("文章已更新")
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it("保存失败时显示错误提示", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("fail"))
    const article = mockArticle()

    render(<ArticleEditDialog {...defaultProps} article={article} />)

    await userEvent.click(screen.getByText("保存"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("更新失败")
    })
  })

  it("取消按钮调用 onOpenChange(false)", async () => {
    render(<ArticleEditDialog {...defaultProps} />)

    await userEvent.click(screen.getByText("取消"))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it("未 open 时不渲染内容", () => {
    render(<ArticleEditDialog {...defaultProps} open={false} />)

    expect(screen.queryByText("写文章")).not.toBeInTheDocument()
  })
})
