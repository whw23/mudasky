/**
 * NewsSection + StatsSection 首页组件测试。
 * 验证最新资讯的文章加载和统计数字区块的渲染与编辑交互。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (params?.index) return `${key}_${params.index}`
    return key
  },
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children, onClick }: any) => (
    <div data-testid="editable-overlay" onClick={onClick}>{children}</div>
  ),
}))

/* 模拟 api */
const mockGet = vi.fn()
vi.mock("@/lib/api", () => ({
  default: { get: (...args: any[]) => mockGet(...args) },
}))

/* 模拟 ConfigContext */
let mockHomepageStats = [
  { value: "15+", label: "年办学经验" },
  { value: "500+", label: "成功案例" },
  { value: "50+", label: "合作院校" },
]
vi.mock("@/contexts/ConfigContext", () => ({
  useLocalizedConfig: () => ({
    homepageStats: mockHomepageStats,
  }),
}))

import { NewsSection } from "@/components/home/NewsSection"
import { StatsSection } from "@/components/home/StatsSection"

/* ─── NewsSection ─── */

const mockCategories = [
  { id: "cat-1", name: "新闻动态" },
  { id: "cat-2", name: "留学资讯" },
]

const mockArticles = [
  {
    id: "a1",
    title: "留学申请攻略",
    excerpt: "最新申请指南",
    category_id: "cat-1",
    published_at: "2024-06-15T10:00:00",
    created_at: "2024-06-10T08:00:00",
  },
  {
    id: "a2",
    title: "院校选择指南",
    excerpt: null,
    category_id: "cat-2",
    published_at: null,
    created_at: "2024-07-01T08:00:00",
  },
]

describe("NewsSection", () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it("加载文章后渲染标题", async () => {
    mockGet
      .mockResolvedValueOnce({ data: mockCategories })
      .mockResolvedValueOnce({ data: { items: mockArticles } })

    render(<NewsSection />)

    await waitFor(() => {
      expect(screen.getByText("留学申请攻略")).toBeInTheDocument()
    })
  })

  it("渲染分类标签", async () => {
    mockGet
      .mockResolvedValueOnce({ data: mockCategories })
      .mockResolvedValueOnce({ data: { items: mockArticles } })

    render(<NewsSection />)

    await waitFor(() => {
      expect(screen.getByText("新闻动态")).toBeInTheDocument()
      expect(screen.getByText("留学资讯")).toBeInTheDocument()
    })
  })

  it("渲染文章日期（优先 published_at）", async () => {
    mockGet
      .mockResolvedValueOnce({ data: mockCategories })
      .mockResolvedValueOnce({ data: { items: mockArticles } })

    render(<NewsSection />)

    await waitFor(() => {
      expect(screen.getByText("2024-06-15")).toBeInTheDocument()
      expect(screen.getByText("2024-07-01")).toBeInTheDocument()
    })
  })

  it("有摘要时渲染摘要", async () => {
    mockGet
      .mockResolvedValueOnce({ data: mockCategories })
      .mockResolvedValueOnce({ data: { items: mockArticles } })

    render(<NewsSection />)

    await waitFor(() => {
      expect(screen.getByText("最新申请指南")).toBeInTheDocument()
    })
  })

  it("无文章时渲染占位内容", async () => {
    mockGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { items: [] } })

    render(<NewsSection />)

    /* 等待 effect 执行完成 */
    await waitFor(() => {
      expect(screen.getByText("articlePlaceholderTitle_1")).toBeInTheDocument()
      expect(screen.getByText("articlePlaceholderTitle_2")).toBeInTheDocument()
      expect(screen.getByText("articlePlaceholderTitle_3")).toBeInTheDocument()
    })
  })

  it("API 错误时显示占位内容", async () => {
    mockGet.mockRejectedValue(new Error("network error"))

    render(<NewsSection />)

    await waitFor(() => {
      expect(screen.getByText("articlePlaceholderTitle_1")).toBeInTheDocument()
    })
  })

  it("渲染'查看全部'链接", () => {
    mockGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { items: [] } })

    render(<NewsSection />)

    const viewAllLink = screen.getByText("viewAll")
    expect(viewAllLink.closest("a")).toHaveAttribute("href", "/news")
  })

  it("渲染区块标题", () => {
    mockGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { items: [] } })

    render(<NewsSection />)

    expect(screen.getByText("newsTag")).toBeInTheDocument()
    expect(screen.getByText("newsTitle")).toBeInTheDocument()
  })
})

/* ─── StatsSection ─── */

describe("StatsSection", () => {
  it("渲染统计数值和标签", () => {
    render(<StatsSection />)

    expect(screen.getByText("15+")).toBeInTheDocument()
    expect(screen.getByText("年办学经验")).toBeInTheDocument()
    expect(screen.getByText("500+")).toBeInTheDocument()
    expect(screen.getByText("成功案例")).toBeInTheDocument()
  })

  it("非编辑模式下不显示添加按钮", () => {
    render(<StatsSection />)

    expect(screen.queryByText("添加")).not.toBeInTheDocument()
  })

  it("编辑模式下显示添加按钮", () => {
    render(<StatsSection editable onAdd={vi.fn()} />)

    expect(screen.getByText("添加")).toBeInTheDocument()
  })

  it("编辑模式下点击添加按钮", () => {
    const onAdd = vi.fn()
    render(<StatsSection editable onAdd={onAdd} />)

    fireEvent.click(screen.getByText("添加"))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it("编辑模式下包裹 EditableOverlay", () => {
    render(<StatsSection editable onEdit={vi.fn()} />)

    const overlays = screen.getAllByTestId("editable-overlay")
    expect(overlays).toHaveLength(3)
  })

  it("编辑模式下显示删除按钮", () => {
    render(<StatsSection editable onDelete={vi.fn()} />)

    const deleteButtons = screen.getAllByTitle("删除")
    expect(deleteButtons).toHaveLength(3)
  })

  it("点击删除按钮弹出确认弹窗", () => {
    const onDelete = vi.fn()
    render(<StatsSection editable onDelete={onDelete} />)

    const deleteButtons = screen.getAllByTitle("删除")
    fireEvent.click(deleteButtons[0])

    expect(screen.getByText("确认删除")).toBeInTheDocument()
    expect(screen.getByText("确认删除该统计项？")).toBeInTheDocument()
  })

  it("确认删除后调用 onDelete", () => {
    const onDelete = vi.fn()
    render(<StatsSection editable onDelete={onDelete} />)

    /* 点击删除按钮 */
    const deleteButtons = screen.getAllByTitle("删除")
    fireEvent.click(deleteButtons[1])

    /* 点击确认 */
    fireEvent.click(screen.getByText("删除"))
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it("取消删除不调用 onDelete", () => {
    const onDelete = vi.fn()
    render(<StatsSection editable onDelete={onDelete} />)

    const deleteButtons = screen.getAllByTitle("删除")
    fireEvent.click(deleteButtons[0])
    fireEvent.click(screen.getByText("取消"))

    expect(onDelete).not.toHaveBeenCalled()
  })

  it("非编辑模式下不包裹 EditableOverlay", () => {
    render(<StatsSection />)

    expect(screen.queryByTestId("editable-overlay")).not.toBeInTheDocument()
  })
})
