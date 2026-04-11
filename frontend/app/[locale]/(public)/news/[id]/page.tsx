import { Banner } from "@/components/layout/Banner"
import { fetchArticle, fetchCategories } from "@/lib/content-api"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SafeHtml } from "@/components/common/SafeHtml"

/** 文章详情页面 */
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const p = await getTranslations("Pages")
  const t = await getTranslations("News")

  const [article, categories] = await Promise.all([
    fetchArticle(id),
    fetchCategories(),
  ])

  if (!article) notFound()

  const category = categories.find((c) => c.id === article.category_id)
  const dateStr = (article.published_at ?? article.created_at).slice(0, 10)

  return (
    <>
      <Banner title={p("articleDetail")} subtitle={p("newsSubtitle")} />

      <article className="mx-auto max-w-4xl px-4 py-10 md:py-16">
        {/* 返回链接 */}
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* 文章头部 */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            {category && (
              <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                {category.name}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{dateStr}</span>
          </div>
          <h1 className="mt-4 text-2xl md:text-3xl font-bold leading-tight">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {article.excerpt}
            </p>
          )}
        </div>

        {/* 分割线 */}
        <div className="my-8 h-px bg-border" />

        {/* 文章正文 */}
        <SafeHtml
          html={article.content}
          className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-primary"
        />

        {/* 底部返回 */}
        <div className="mt-12 border-t pt-6">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToList")}
          </Link>
        </div>
      </article>
    </>
  )
}
