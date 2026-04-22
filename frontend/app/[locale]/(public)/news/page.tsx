import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleListClient } from "@/components/public/ArticleListClient"
import { getTranslations } from "next-intl/server"

/** 新闻政策页面 */
export default async function NewsPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("News")

  return (
    <>
      <PageBanner pageKey="news" title={p("news")} subtitle={p("newsSubtitle")} />

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

        <ArticleListClient />
      </section>
    </>
  )
}
