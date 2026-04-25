/**
 * ArticleListClient 文章列表客户端组件测试。
 * 验证分类筛选、文章卡片渲染、分页和 editable 模式。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children, onClick, label }: any) => (
    <div data-testid="editable-overlay" onClick={onClick} title={label}>
      {children}
    </div>
  ),
}))

const mockGet = vi.fn()
vi.mock("@/lib/api", () => ({
  default: { get: (...args: any[]) => mockGet(...args) },
}))

import { ArticleListClient } from "@/components/public/ArticleListClient"

const mockCategories = [
  { id: "cat-1", name: "留学资讯", slug: "study-abroad" },
  { id: "cat-2", name: "签证攻略", slug: "visa" },
]

const mockArticles = [
  {
    id: "a-1",
    title: "留学申请攻略",
    slug: "guide",
    content: "<p>内容</p>",
    excerpt: "摘要1",
    category_id: "cat-1",
    status: "published",
    published_at: "2024-01-15T00:00:00",
    created_at: "2024-01-14T00:00:00",
  },
  {
    id: "a-2",
    title: "签证办理流程",
    slug: "visa-flow",
    content: "<p>签证</p>",
    excerpt: "摘要2",
    category_id: "cat-2",
    status: "published",
    published_at: null,
    created_at: "2024-02-01T00:00:00",
  },
]

function setupMockApi(articles = mockArticles, totalPages = 1) {
  mockGet.mockImplementation((url: string) => {
    if (url.includes("categories")) {
      return Promise.resolve({ data: mockCategories })
    }
    return Promise.resolve({
      data: { items: articles, total_pages: totalPages },
    })
  })
}

describe("ArticleListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染文章列表和分类标签", async () => {
    setupMockApi()

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
      expect(screen.getByText("签证办理流程")).toBeInTheDocument()
    })

    expect(screen.getByText("all")).toBeInTheDocument()
    /* 分类名同时出现在 tab 和文章卡片 badge 中 */
    expect(screen.getAllByText("留学资讯").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("签证攻略").length).toBeGreaterThanOrEqual(1)
  })

  it("渲染文章摘要和日期", async () => {
    setupMockApi()

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getByText("摘要1")).toBeInTheDocument()
      expect(screen.getByText("2024-01-15")).toBeInTheDocument()
      expect(screen.getByText("2024-02-01")).toBeInTheDocument()
    })
  })

  it("无文章时显示空状态", async () => {
    setupMockApi([], 0)

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getByText("noContent")).toBeInTheDocument()
    })
  })

  it("加载中显示加载提示", () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    render(<ArticleListClient />)
    expect(screen.getByText("加载中...")).toBeInTheDocument()
  })

  it("点击分类标签切换筛选", async () => {
    setupMockApi()

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getAllByText("留学资讯").length).toBeGreaterThanOrEqual(1)
    })

    /* 分类标签按钮是 button 元素 */
    const categoryButtons = screen.getAllByRole("button")
    const catButton = categoryButtons.find((b) => b.textContent === "留学资讯")!
    expect(catButton).toBeTruthy()

    await act(async () => {
      fireEvent.click(catButton)
    })

    await waitFor(() => {
      const lastCall = mockGet.mock.calls[mockGet.mock.calls.length - 1]
      expect(lastCall[1]?.params?.category_id).toBe("cat-1")
    })
  })

  it("editable 模式显示 EditableOverlay", async () => {
    setupMockApi()
    const onEdit = vi.fn()

    render(<ArticleListClient editable onEdit={onEdit} />)

    await waitFor(() => {
      expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
    })

    const overlays = screen.getAllByTestId("editable-overlay")
    expect(overlays.length).toBeGreaterThan(0)
  })

  it("editable 模式显示草稿标签", async () => {
    const draftArticles = [
      { ...mockArticles[0], status: "draft" },
    ]
    setupMockApi(draftArticles)

    render(<ArticleListClient editable />)

    await waitFor(() => {
      expect(screen.getByText("草稿")).toBeInTheDocument()
    })
  })

  it("指定 categorySlug 时不显示分类筛选标签", async () => {
    setupMockApi()

    render(<ArticleListClient categorySlug="study-abroad" />)

    await waitFor(() => {
      expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
    })

    expect(screen.queryByText("all")).not.toBeInTheDocument()
  })

  it("多页时渲染分页栏", async () => {
    setupMockApi(mockArticles, 3)

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
    })
  })

  it("API 失败时显示空状态", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("categories")) {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error("Network error"))
    })

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getByText("noContent")).toBeInTheDocument()
    })
  })

  it("非 editable 模式渲染链接而非 overlay", async () => {
    setupMockApi()

    render(<ArticleListClient />)

    await waitFor(() => {
      expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
    })

    const link = screen.getByText("留学申请攻略").closest("a")
    expect(link).toHaveAttribute("href", "/news/a-1")
  })
})
