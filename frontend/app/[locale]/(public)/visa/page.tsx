import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { VisaIntro } from "@/components/visa/VisaIntro"

/** 签证办理页面 */
export default async function VisaPage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("visa")

  return (
    <>
      <PageBanner pageKey="visa" title={p("visa")} subtitle={p("visaSubtitle")} />
      <VisaIntro />
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/visa"
      />
      <CtaSection translationNamespace="Visa" variant="border-t" />
    </>
  )
}
