/**
 * DocumentList 组件测试。
 * 验证文档列表渲染、空状态和存储信息。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { DocumentListResponse } from "@/types"

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
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page, totalPages, onPageChange }: {
    page: number; totalPages: number; onPageChange: (p: number) => void
  }) => (
    <div data-testid="pagination">
      <span>Page {page}/{totalPages}</span>
      <button onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  ),
}))

import { DocumentList } from "@/components/user/DocumentList"
import api from "@/lib/api"
import { toast } from "sonner"

/** 创建 mock 文档列表响应 */
function createMockResponse(
  overrides?: Partial<DocumentListResponse>,
): DocumentListResponse {
  return {
    items: [
      {
        id: "doc-1",
        user_id: "u-1",
        filename: "abc123.pdf",
        original_name: "transcript.pdf",
        file_size: 1048576,
        mime_type: "application/pdf",
        category: "transcript",
        created_at: "2024-06-15T10:00:00Z",
        updated_at: null,
      },
      {
        id: "doc-2",
        user_id: "u-1",
        filename: "def456.jpg",
        original_name: "passport.jpg",
        file_size: 2097152,
        mime_type: "image/jpeg",
        category: "passport",
        created_at: "2024-06-16T10:00:00Z",
        updated_at: null,
      },
    ],
    total: 2,
    page: 1,
    page_size: 20,
    total_pages: 1,
    storage_used: 3145728,
    storage_quota: 104857600,
    ...overrides,
  }
}

describe("DocumentList", () => {
  const mockOnStorageUpdate = vi.fn()

  beforeEach(() => { vi.clearAllMocks() })

  /** 渲染辅助函数 */
  function renderList(category = "all") {
    return render(
      <DocumentList category={category} refreshKey={0} onStorageUpdate={mockOnStorageUpdate} />,
    )
  }

  /** 等待列表加载完成 */
  async function waitForLoaded() {
    await waitFor(() => {
      expect(screen.getAllByText("transcript.pdf").length).toBeGreaterThanOrEqual(1)
    })
  }

  it("渲染文档列表", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitFor(() => {
      /* 桌面端表格 + 移动端卡片各渲染一次 */
      expect(screen.getAllByText("transcript.pdf").length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText("passport.jpg").length).toBeGreaterThanOrEqual(1)
    })
  })

  it("显示文件大小", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitFor(() => {
      expect(screen.getAllByText("1.0 MB").length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText("2.0 MB").length).toBeGreaterThanOrEqual(1)
    })
  })

  it("显示文档分类标签", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitFor(() => {
      expect(screen.getAllByText("transcript").length).toBeGreaterThanOrEqual(1)
    })
  })

  it("空状态显示提示文本", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: createMockResponse({ items: [], total: 0 }),
    })
    renderList()
    await waitFor(() => {
      expect(screen.getByText("noDocuments")).toBeInTheDocument()
    })
  })

  it("调用 onStorageUpdate 传递存储信息", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitFor(() => {
      expect(mockOnStorageUpdate).toHaveBeenCalledWith(3145728, 104857600)
    })
  })

  it("按分类过滤文档", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList("transcript")
    await waitFor(() => {
      expect(screen.getAllByText("transcript.pdf").length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByText("passport.jpg")).not.toBeInTheDocument()
    })
  })

  it("API 失败时显示空列表", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network Error"))
    renderList()
    await waitFor(() => {
      expect(screen.getByText("noDocuments")).toBeInTheDocument()
    })
  })

  it("显示下载和删除按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitFor(() => {
      expect(screen.getAllByText("download").length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText("delete").length).toBeGreaterThanOrEqual(2)
    })
  })

  it("点击删除按钮弹出确认对话框", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitForLoaded()

    await userEvent.click(screen.getAllByText("delete")[0])
    expect(screen.getByText("deleteConfirm")).toBeInTheDocument()
  })

  it("确认删除后调用 API 并刷新列表", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    renderList()
    await waitForLoaded()

    await userEvent.click(screen.getAllByText("delete")[0])
    const confirmBtns = screen.getAllByText("delete")
    await userEvent.click(confirmBtns[confirmBtns.length - 1])

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      "/portal/documents/list/detail/delete",
      { doc_id: "doc-1" },
    )
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith("deleteSuccess")
  })

  it("多页时显示分页组件", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: createMockResponse({ total: 40, total_pages: 2 }),
    })
    renderList()
    await waitFor(() => {
      expect(screen.getByTestId("pagination")).toBeInTheDocument()
    })
  })

  it("单页时不显示分页组件", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: createMockResponse() })
    renderList()
    await waitForLoaded()
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument()
  })
})
