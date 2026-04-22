import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { RequirementsIntro } from "@/components/requirements/RequirementsIntro"

/** 申请条件页面 */
export default async function RequirementsPage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("requirements")

  return (
    <>
      <PageBanner pageKey="requirements" title={p("requirements")} subtitle={p("requirementsSubtitle")} />
      <RequirementsIntro />
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/requirements"
      />
      <CtaSection translationNamespace="Requirements" variant="border-t" />
    </>
  )
}
