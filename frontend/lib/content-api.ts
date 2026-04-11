/**
 * 内容 API 服务端数据获取工具。
 * 仅用于 Server Component 中，通过内部网络直接请求后端。
 */

/** 分类类型 */
export interface Category {
  id: string
  name: string
  slug: string
}

/** 文章类型 */
export interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  category_id: string
  published_at: string | null
  created_at: string
  view_count: number
}

/** 分页响应类型 */
export interface PaginatedArticles {
  items: Article[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/** 获取后端基础 URL */
function getBaseUrl(): string {
  return process.env.INTERNAL_API_URL || "http://api:8000"
}

/** 获取分类列表 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/public/content/categories`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/** 获取文章列表（已发布） */
export async function fetchArticles(
  options: {
    categoryId?: string
    page?: number
    pageSize?: number
  } = {},
): Promise<PaginatedArticles> {
  const { categoryId, page = 1, pageSize = 10 } = options
  const empty: PaginatedArticles = {
    items: [],
    total: 0,
    page: 1,
    page_size: pageSize,
    total_pages: 0,
  }
  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })
    if (categoryId) params.set("category_id", categoryId)
    const res = await fetch(
      `${getBaseUrl()}/api/public/content/articles?${params.toString()}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return empty
    return await res.json()
  } catch {
    return empty
  }
}

/** 获取文章详情 */
export async function fetchArticle(id: string): Promise<Article | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/public/content/article/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** 根据分类 slug 获取分类 ID */
export async function getCategoryIdBySlug(
  slug: string,
): Promise<string | undefined> {
  const categories = await fetchCategories()
  return categories.find((c) => c.slug === slug)?.id
}

/** 根据分类 slug 获取该分类的已发布文章 */
export async function fetchArticlesByCategorySlug(
  slug: string,
  pageSize = 6,
): Promise<Article[]> {
  const categoryId = await getCategoryIdBySlug(slug)
  if (!categoryId) return []
  const data = await fetchArticles({ categoryId, pageSize })
  return data.items
}
