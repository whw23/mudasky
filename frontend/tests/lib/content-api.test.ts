/**
 * 内容 API 服务端数据获取测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  fetchCategories,
  fetchArticles,
  fetchArticle,
  getCategoryIdBySlug,
  fetchArticlesByCategorySlug,
  type Category,
  type Article,
} from "@/lib/content-api"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "新闻", slug: "news" },
  { id: "cat-2", name: "留学", slug: "study-abroad" },
]

const MOCK_ARTICLE: Article = {
  id: "art-1",
  title: "测试文章",
  slug: "test-article",
  content: "<p>内容</p>",
  excerpt: "摘要",
  category_id: "cat-1",
  published_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  view_count: 100,
}

/** 创建模拟 Response 对象 */
function mockResponse(data: unknown, ok = true): Response {
  return { ok, json: () => Promise.resolve(data) } as Response
}

describe("fetchCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常返回分类列表", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const result = await fetchCategories()

    expect(result).toEqual(MOCK_CATEGORIES)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/content/categories"),
      expect.objectContaining({ next: { revalidate: 60 } }),
    )
  })

  it("API 返回非 ok 时返回空数组", async () => {
    mockFetch.mockResolvedValue(mockResponse(null, false))
    expect(await fetchCategories()).toEqual([])
  })

  it("网络异常时返回空数组", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    expect(await fetchCategories()).toEqual([])
  })
})

describe("fetchArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("默认参数：page=1, pageSize=10", async () => {
    const paginated = {
      items: [MOCK_ARTICLE],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    }
    mockFetch.mockResolvedValue(mockResponse(paginated))

    const result = await fetchArticles()

    expect(result).toEqual(paginated)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("page=1")
    expect(url).toContain("page_size=10")
  })

  it("自定义分页和分类过滤", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ items: [], total: 0, page: 2, page_size: 5, total_pages: 0 }),
    )

    await fetchArticles({ categoryId: "cat-1", page: 2, pageSize: 5 })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("page=2")
    expect(url).toContain("page_size=5")
    expect(url).toContain("category_id=cat-1")
  })

  it("API 失败时返回空分页结构", async () => {
    mockFetch.mockRejectedValue(new Error("fail"))

    const result = await fetchArticles()

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe("fetchArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常返回文章详情", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_ARTICLE))

    const result = await fetchArticle("art-1")

    expect(result).toEqual(MOCK_ARTICLE)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/content/articles/art-1"),
      expect.any(Object),
    )
  })

  it("文章不存在时返回 null", async () => {
    mockFetch.mockResolvedValue(mockResponse(null, false))
    expect(await fetchArticle("nonexistent")).toBeNull()
  })
})

describe("getCategoryIdBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("找到匹配的 slug 时返回 id", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const id = await getCategoryIdBySlug("news")

    expect(id).toBe("cat-1")
  })

  it("slug 不存在时返回 undefined", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const id = await getCategoryIdBySlug("nonexistent")

    expect(id).toBeUndefined()
  })
})

describe("fetchArticlesByCategorySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常流程：slug → categoryId → 文章列表", async () => {
    /* 第一次 fetch：fetchCategories */
    mockFetch.mockResolvedValueOnce(mockResponse(MOCK_CATEGORIES))
    /* 第二次 fetch：fetchArticles */
    mockFetch.mockResolvedValueOnce(
      mockResponse({ items: [MOCK_ARTICLE], total: 1, page: 1, page_size: 6, total_pages: 1 }),
    )

    const result = await fetchArticlesByCategorySlug("news")

    expect(result).toEqual([MOCK_ARTICLE])
  })

  it("slug 不存在时返回空数组", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const result = await fetchArticlesByCategorySlug("nonexistent")

    expect(result).toEqual([])
  })
})
