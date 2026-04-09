/**
 * 相关文章区块组件。
 * 在内容页面底部展示按分类筛选的文章列表。
 */

import { Link } from "@/i18n/navigation"
import { type Article } from "@/lib/content-api"

/** 组件属性 */
interface ArticleSectionProps {
  /** 文章列表 */
  articles: Article[]
  /** 区块标题 */
  title: string
  /** 无内容时的提示文本 */
  emptyText: string
  /** 阅读更多文本 */
  readMoreText: string
}

/** 相关文章区块 */
export function ArticleSection({
  articles,
  title,
  emptyText,
  readMoreText,
}: ArticleSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Related Articles
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{title}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>

      {articles.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.id}`}
              className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <span className="text-xs text-muted-foreground">
                {(article.published_at ?? article.created_at).slice(0, 10)}
              </span>
              <h4 className="mt-2 font-bold transition-colors group-hover:text-primary line-clamp-2">
                {article.title}
              </h4>
              {article.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {article.excerpt}
                </p>
              )}
              <span className="mt-3 inline-block text-sm font-medium text-primary">
                {readMoreText} &rarr;
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted-foreground">
          {emptyText}
        </div>
      )}
    </section>
  )
}
