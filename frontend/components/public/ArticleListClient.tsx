"use client"

/**
 * 文章列表客户端组件。
 * 从 API 获取文章数据，支持分类筛选和分页。
 * editable 模式下文章卡片可点击编辑。
 */

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import api from "@/lib/api"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

/** 分类颜色映射 */
const CAT_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-rose-100 text-rose-700",
}

/** 每页文章数 */
const PAGE_SIZE = 10

interface Category {
  id: string
  name: string
  slug: string
}

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  category_id: string
  status: string
  published_at: string | null
  created_at: string
}

interface ArticleListClientProps {
  categorySlug?: string
  editable?: boolean
  onEdit?: (article: Article) => void
}

/** 文章列表客户端组件 */
export function ArticleListClient({
  categorySlug,
  editable,
  onEdit,
}: ArticleListClientProps) {
  const t = useTranslations("News")
  const pg = useTranslations("Pagination")
  const searchParams = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  /* 从 URL 读取初始值 */
  const [activeCategoryId, setActiveCategoryId] = useState<string | undefined>(
    () => searchParams.get("category") ?? undefined,
  )
  const [currentPage, setCurrentPage] = useState(
    () => Number(searchParams.get("page")) || 1,
  )

  /** 获取分类列表 */
  useEffect(() => {
    const url = editable
      ? "/admin/web-settings/categories/list"
      : "/public/content/categories"
    api
      .get<Category[]>(url)
      .then(({ data }) => {
        setCategories(data ?? [])
        /* 若指定了 slug，找到对应分类 ID */
        if (categorySlug) {
          const cat = (data ?? []).find((c) => c.slug === categorySlug)
          if (cat) setActiveCategoryId(cat.id)
        }
      })
      .catch(() => setCategories([]))
  }, [editable, categorySlug])

  /** 获取文章列表 */
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const url = editable
        ? "/admin/web-settings/articles/list"
        : "/public/content/articles"
      const params: Record<string, string | number> = {
        page: currentPage,
        page_size: PAGE_SIZE,
      }
      if (activeCategoryId) params.category_id = activeCategoryId
      const { data } = await api.get(url, { params })
      setArticles(data.items ?? [])
      setTotalPages(data.total_pages ?? 0)
    } catch {
      setArticles([])
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [editable, activeCategoryId, currentPage])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  /** 根据分类 ID 获取名称 */
  function getCategoryName(catId: string): string {
    return categories.find((c) => c.id === catId)?.name ?? ""
  }

  /** 根据分类 ID 获取颜色 */
  function getCategoryColor(catId: string): string {
    const idx = categories.findIndex((c) => c.id === catId)
    return CAT_COLORS[idx % 5] ?? "bg-gray-100 text-gray-700"
  }

  /** 切换分类 */
  function handleCategoryChange(catId?: string) {
    setActiveCategoryId(catId)
    setCurrentPage(1)
  }

  return (
    <>
      {/* 分类筛选（仅在未指定 categorySlug 时显示） */}
      {!categorySlug && categories.length > 0 && (
        <CategoryTabs
          categories={categories}
          activeCategoryId={activeCategoryId}
          allLabel={t("all")}
          onChange={handleCategoryChange}
        />
      )}

      {/* 文章列表 */}
      {loading ? (
        <div className="mt-8 text-center text-muted-foreground">加载中...</div>
      ) : articles.length > 0 ? (
        <div className="mt-8 space-y-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              categoryName={getCategoryName(article.category_id)}
              categoryColor={getCategoryColor(article.category_id)}
              readMoreLabel={t("readMore")}
              editable={editable}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center text-muted-foreground">
          {t("noContent")}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          prevLabel={pg("prev")}
          nextLabel={pg("next")}
          onPageChange={setCurrentPage}
        />
      )}
    </>
  )
}

/* ─── 子组件 ─── */

/** 分类筛选标签 */
function CategoryTabs({
  categories,
  activeCategoryId,
  allLabel,
  onChange,
}: {
  categories: Category[]
  activeCategoryId?: string
  allLabel: string
  onChange: (catId?: string) => void
}) {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-2">
      <button
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          !activeCategoryId
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
        onClick={() => onChange(undefined)}
      >
        {allLabel}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategoryId === cat.id
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => onChange(cat.id)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

/** 文章卡片 */
function ArticleCard({
  article,
  categoryName,
  categoryColor,
  readMoreLabel,
  editable,
  onEdit,
}: {
  article: Article
  categoryName: string
  categoryColor: string
  readMoreLabel: string
  editable?: boolean
  onEdit?: (article: Article) => void
}) {
  const inner = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-medium ${categoryColor}`}
          >
            {categoryName}
          </span>
          <span className="text-xs text-muted-foreground">
            {(article.published_at ?? article.created_at).slice(0, 10)}
          </span>
          {editable && article.status !== "published" && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              草稿
            </span>
          )}
        </div>
        <h4 className="mt-2 font-bold transition-colors group-hover:text-primary">
          {article.title}
        </h4>
        {article.excerpt && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {article.excerpt}
          </p>
        )}
      </div>
      {!editable && (
        <span className="shrink-0 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {readMoreLabel} &rarr;
        </span>
      )}
    </div>
  )

  const cls =
    "group block rounded-lg border bg-white p-6 transition-all hover:border-primary hover:shadow-sm"

  if (editable) {
    return (
      <EditableOverlay
        onClick={() => onEdit?.(article)}
        label={`编辑文章 ${article.title}`}
      >
        <div className={cls}>{inner}</div>
      </EditableOverlay>
    )
  }

  return (
    <Link href={`/news/${article.id}`} className={cls}>
      {inner}
    </Link>
  )
}

/** 分页栏 */
function PaginationBar({
  currentPage,
  totalPages,
  prevLabel,
  nextLabel,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  prevLabel: string
  nextLabel: string
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {currentPage > 1 ? (
        <button
          className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50"
          onClick={() => onPageChange(currentPage - 1)}
        >
          {prevLabel}
        </button>
      ) : (
        <span className="rounded-lg border px-4 py-2 text-sm text-muted-foreground opacity-50">
          {prevLabel}
        </span>
      )}

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <button
          key={pageNum}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            pageNum === currentPage
              ? "bg-primary text-white"
              : "border text-muted-foreground hover:bg-gray-50"
          }`}
          onClick={() => onPageChange(pageNum)}
        >
          {pageNum}
        </button>
      ))}

      {currentPage < totalPages ? (
        <button
          className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50"
          onClick={() => onPageChange(currentPage + 1)}
        >
          {nextLabel}
        </button>
      ) : (
        <span className="rounded-lg border px-4 py-2 text-sm text-muted-foreground opacity-50">
          {nextLabel}
        </span>
      )}
    </div>
  )
}
