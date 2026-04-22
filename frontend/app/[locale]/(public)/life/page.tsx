import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { LifeIntro } from "@/components/life/LifeIntro"

/** 留学生活页面 */
export default async function LifePage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("life")

  return (
    <>
      <PageBanner pageKey="life" title={p("life")} subtitle={p("lifeSubtitle")} />
      <LifeIntro />
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/life"
      />
      <CtaSection translationNamespace="Life" />
    </>
  )
}
