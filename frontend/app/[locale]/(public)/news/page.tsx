import { Banner } from "@/components/layout/Banner"
import { fetchCategories, fetchArticles } from "@/lib/content-api"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"

/** 分类颜色映射 */
const CAT_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-700",
  1: "bg-green-100 text-green-700",
  2: "bg-amber-100 text-amber-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-rose-100 text-rose-700",
}

/** 新闻政策页面 */
export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const p = await getTranslations("Pages")
  const t = await getTranslations("News")
  const pg = await getTranslations("Pagination")
  const { category, page: pageParam } = await searchParams

  const currentPage = Number(pageParam) || 1
  const categoryId = typeof category === "string" ? category : undefined

  const [categories, data] = await Promise.all([
    fetchCategories(),
    fetchArticles({ categoryId, page: currentPage }),
  ])

  /** 根据分类 ID 获取分类名称 */
  const getCategoryName = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId)
    return cat?.name ?? ""
  }

  /** 根据分类 ID 获取颜色 */
  const getCategoryColor = (catId: string): string => {
    const idx = categories.findIndex((c) => c.id === catId)
    return CAT_COLORS[idx % 5] ?? "bg-gray-100 text-gray-700"
  }

  /** 构建分页链接 */
  const buildPageUrl = (p: number): string => {
    const params = new URLSearchParams()
    if (categoryId) params.set("category", categoryId)
    if (p > 1) params.set("page", String(p))
    const qs = params.toString()
    return `/news${qs ? `?${qs}` : ""}`
  }

  /** 构建分类链接 */
  const buildCategoryUrl = (catId?: string): string => {
    if (!catId) return "/news"
    return `/news?category=${catId}`
  }

  return (
    <>
      <Banner title={p("news")} subtitle={p("newsSubtitle")} />

      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Latest Updates
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("title")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>

        {/* 分类筛选 */}
        {categories.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link
              href="/news"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !categoryId
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("all")}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={buildCategoryUrl(cat.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  categoryId === cat.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* 文章列表 */}
        {data.items.length > 0 ? (
          <div className="mt-8 space-y-4">
            {data.items.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="group block rounded-lg border bg-white p-6 transition-all hover:border-primary hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-0.5 text-xs font-medium ${getCategoryColor(article.category_id)}`}
                      >
                        {getCategoryName(article.category_id)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(article.published_at ?? article.created_at).slice(0, 10)}
                      </span>
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
                  <span className="shrink-0 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {t("readMore")} &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center text-muted-foreground">
            {t("noContent")}
          </div>
        )}

        {/* 分页 */}
        {data.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(currentPage - 1)}
                className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50"
              >
                {pg("prev")}
              </Link>
            ) : (
              <span className="rounded-lg border px-4 py-2 text-sm text-muted-foreground opacity-50">
                {pg("prev")}
              </span>
            )}

            {Array.from({ length: data.total_pages }, (_, i) => i + 1).map(
              (pageNum) => (
                <Link
                  key={pageNum}
                  href={buildPageUrl(pageNum)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    pageNum === currentPage
                      ? "bg-primary text-white"
                      : "border text-muted-foreground hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </Link>
              ),
            )}

            {currentPage < data.total_pages ? (
              <Link
                href={buildPageUrl(currentPage + 1)}
                className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50"
              >
                {pg("next")}
              </Link>
            ) : (
              <span className="rounded-lg border px-4 py-2 text-sm text-muted-foreground opacity-50">
                {pg("next")}
              </span>
            )}
          </div>
        )}
      </section>
    </>
  )
}
