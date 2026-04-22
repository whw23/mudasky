import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { StudyAbroadIntro } from "@/components/study-abroad/StudyAbroadIntro"

/** 出国留学页面 */
export default async function StudyAbroadPage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("study-abroad")

  return (
    <>
      <PageBanner pageKey="study-abroad" title={p("studyAbroad")} subtitle={p("studyAbroadSubtitle")} />
      <StudyAbroadIntro />
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/study-abroad"
      />
      <CtaSection translationNamespace="StudyAbroad" />
    </>
  )
}
