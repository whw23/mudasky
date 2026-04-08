import { Banner } from "@/components/layout/Banner"
import { getTranslations } from "next-intl/server"

/** 新闻政策页面 */
export default async function NewsPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("News")

  const articles = [
    {
      title: t("a1.title"),
      date: "2026-04-01",
      category: t("catPolicy"),
      excerpt: t("a1.excerpt"),
    },
    {
      title: t("a2.title"),
      date: "2026-03-25",
      category: t("catNews"),
      excerpt: t("a2.excerpt"),
    },
    {
      title: t("a3.title"),
      date: "2026-03-18",
      category: t("catGuide"),
      excerpt: t("a3.excerpt"),
    },
    {
      title: t("a4.title"),
      date: "2026-03-10",
      category: t("catPolicy"),
      excerpt: t("a4.excerpt"),
    },
    {
      title: t("a5.title"),
      date: "2026-03-05",
      category: t("catNews"),
      excerpt: t("a5.excerpt"),
    },
    {
      title: t("a6.title"),
      date: "2026-02-28",
      category: t("catGuide"),
      excerpt: t("a6.excerpt"),
    },
    {
      title: t("a7.title"),
      date: "2026-02-20",
      category: t("catPolicy"),
      excerpt: t("a7.excerpt"),
    },
    {
      title: t("a8.title"),
      date: "2026-02-15",
      category: t("catNews"),
      excerpt: t("a8.excerpt"),
    },
  ]

  /** 分类颜色映射 */
  const catColor: Record<string, string> = {
    [t("catPolicy")]: "bg-blue-100 text-blue-700",
    [t("catNews")]: "bg-green-100 text-green-700",
    [t("catGuide")]: "bg-amber-100 text-amber-700",
  }

  return (
    <>
      <Banner title={p("news")} subtitle={p("newsSubtitle")} />

      {/* 文章列表 */}
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
        <div className="mt-12 space-y-4">
          {articles.map((article) => (
            <div
              key={article.title}
              className="group cursor-pointer rounded-lg border bg-white p-6 transition-all hover:border-primary hover:shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                        catColor[article.category] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {article.date}
                    </span>
                  </div>
                  <h4 className="mt-2 font-bold transition-colors group-hover:text-primary">
                    {article.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 分页占位 */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled
            className="rounded-lg border px-4 py-2 text-sm text-muted-foreground"
          >
            {t("prev")}
          </button>
          <span className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            1
          </span>
          <button className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50">
            2
          </button>
          <button className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50">
            3
          </button>
          <button className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-gray-50">
            {t("next")}
          </button>
        </div>
      </section>
    </>
  )
}
