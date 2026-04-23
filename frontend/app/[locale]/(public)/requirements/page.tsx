import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { CountryRequirementsSection } from "@/components/common/CountryRequirementsSection"
import { DocListSection } from "@/components/common/DocListSection"
import { StepListSection } from "@/components/common/StepListSection"
import { CardGridSection } from "@/components/common/CardGridSection"

/** 申请条件页面 */
export default async function RequirementsPage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")
  const t = await getTranslations("Requirements")

  const articles = await fetchArticlesByCategorySlug("requirements")

  const fallbackCountries = [
    {
      label: t("germany.title"),
      items: [t("germany.r1"), t("germany.r2"), t("germany.r3"), t("germany.r4")],
    },
    {
      label: t("japan.title"),
      items: [t("japan.r1"), t("japan.r2"), t("japan.r3")],
    },
    {
      label: t("singapore.title"),
      items: [t("singapore.r1"), t("singapore.r2"), t("singapore.r3")],
    },
  ]

  const fallbackLanguages = [
    {
      title: t("langGerman.title"),
      desc: t("langGerman.desc"),
    },
    {
      title: t("langJapanese.title"),
      desc: t("langJapanese.desc"),
    },
  ]

  const fallbackDocs = [
    t("doc1"), t("doc2"), t("doc3"), t("doc4"),
    t("doc5"), t("doc6"), t("doc7"), t("doc8"),
  ]

  const fallbackSteps = [
    { title: t("step1.title"), desc: t("step1.desc") },
    { title: t("step2.title"), desc: t("step2.desc") },
    { title: t("step3.title"), desc: t("step3.desc") },
    { title: t("step4.title"), desc: t("step4.desc") },
    { title: t("step5.title"), desc: t("step5.desc") },
    { title: t("step6.title"), desc: t("step6.desc") },
  ]

  return (
    <>
      <PageBanner pageKey="requirements" title={p("requirements")} subtitle={p("requirementsSubtitle")} />

      <CountryRequirementsSection
        configKey="requirements_countries"
        sectionTag="Requirements"
        sectionTitle={t("overviewTitle")}
        labelKey="country"
        fallbackData={fallbackCountries}
      />

      <CardGridSection
        configKey="requirements_languages"
        sectionTag="Language"
        sectionTitle={t("langTitle")}
        fallbackCards={fallbackLanguages}
        columns="md:grid-cols-2"
        bgColor="bg-gray-50"
        cardType="language"
      />

      <DocListSection
        configKey="requirements_docs"
        sectionTag="Documents"
        sectionTitle={t("docsTitle")}
        fallbackDocs={fallbackDocs}
      />

      <StepListSection
        configKey="requirements_steps"
        sectionTag="Timeline"
        sectionTitle={t("timelineTitle")}
        fallbackSteps={fallbackSteps}
        bgColor="bg-gray-50"
      />

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
