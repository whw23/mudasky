import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { StepListSection } from "@/components/common/StepListSection"
import { DocListSection } from "@/components/common/DocListSection"
import { CardGridSection } from "@/components/common/CardGridSection"

/** 签证办理页面 */
export default async function VisaPage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")
  const t = await getTranslations("Visa")

  const articles = await fetchArticlesByCategorySlug("visa")

  const fallbackSteps = [
    { title: t("step1.title"), desc: t("step1.desc") },
    { title: t("step2.title"), desc: t("step2.desc") },
    { title: t("step3.title"), desc: t("step3.desc") },
    { title: t("step4.title"), desc: t("step4.desc") },
    { title: t("step5.title"), desc: t("step5.desc") },
  ]

  const fallbackDocs = [
    t("doc1"), t("doc2"), t("doc3"), t("doc4"),
    t("doc5"), t("doc6"), t("doc7"), t("doc8"),
  ]

  const fallbackTimeline = [
    { title: t("timeline1.title"), time: t("timeline1.time"), desc: t("timeline1.desc") },
    { title: t("timeline2.title"), time: t("timeline2.time"), desc: t("timeline2.desc") },
    { title: t("timeline3.title"), time: t("timeline3.time"), desc: t("timeline3.desc") },
  ]

  const fallbackTips = [
    t("tip1"), t("tip2"), t("tip3"), t("tip4"), t("tip5"),
  ]

  return (
    <>
      <PageBanner pageKey="visa" title={p("visa")} subtitle={p("visaSubtitle")} />

      <StepListSection
        configKey="visa_process_steps"
        sectionTag="Process"
        sectionTitle={t("processTitle")}
        fallbackSteps={fallbackSteps}
      />

      <DocListSection
        configKey="visa_required_docs"
        sectionTag="Documents"
        sectionTitle={t("docsTitle")}
        fallbackDocs={fallbackDocs}
        bgColor="bg-gray-50"
      />

      <CardGridSection
        configKey="visa_timeline"
        sectionTag="Timeline"
        sectionTitle={t("timelineTitle")}
        fallbackCards={fallbackTimeline}
        columns="md:grid-cols-3"
        cardType="timeline"
      />

      <DocListSection
        configKey="visa_tips"
        sectionTag="Tips"
        sectionTitle={t("tipsTitle")}
        fallbackDocs={fallbackTips}
        iconName="AlertTriangle"
        bgColor="bg-gray-50"
      />

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
