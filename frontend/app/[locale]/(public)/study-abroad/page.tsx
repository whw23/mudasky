import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { FeaturedProgramSection } from "@/components/common/FeaturedProgramSection"

/** 出国留学页面 */
export default async function StudyAbroadPage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")
  const t = await getTranslations("StudyAbroad")

  const articles = await fetchArticlesByCategorySlug("study-abroad")

  // 兜底：德语主推项目 featured card
  const fallbackFeatured = {
    title: t("germanFocusName"),
    desc: t("germanFocusDesc"),
    features: [
      t("germanFocusF1"),
      t("germanFocusF2"),
      t("germanFocusF3"),
      t("germanFocusF4"),
      t("germanFocusF5"),
      t("germanFocusF6"),
    ],
  }

  // 兜底：项目对比卡片
  const fallbackPrograms = [
    {
      name: t("german.title"),
      desc: t("german.desc"),
      features: [t("german.f1"), t("german.f2"), t("german.f3"), t("german.f4")],
      highlight: true,
    },
    {
      name: t("japanese.title"),
      desc: t("japanese.desc"),
      features: [t("japanese.f1"), t("japanese.f2"), t("japanese.f3")],
      highlight: false,
    },
    {
      name: t("french.title"),
      desc: t("french.desc"),
      features: [t("french.f1"), t("french.f2"), t("french.f3")],
      highlight: false,
    },
    {
      name: t("singapore.title"),
      desc: t("singapore.desc"),
      features: [t("singapore.f1"), t("singapore.f2"), t("singapore.f3")],
      highlight: false,
    },
  ]

  return (
    <>
      <PageBanner pageKey="study-abroad" title={p("studyAbroad")} subtitle={p("studyAbroadSubtitle")} />

      {/* 留学概述 */}
      <PageIntroSection
        titleKey="study_abroad_intro_title"
        contentKey="study_abroad_intro_desc"
        titleFallback={t("overviewTitle")}
        contentFallback={t("overviewContent")}
        sectionTag="Overview"
      />

      {/* 德语项目（主推） */}
      <FeaturedProgramSection
        sectionTag="Featured Program"
        sectionTitle={t("germanFocusTitle")}
        fallbackTitle={fallbackFeatured.title}
        fallbackDesc={fallbackFeatured.desc}
        fallbackFeatures={fallbackFeatured.features}
      />

      {/* 项目对比卡片 */}
      <CardGridSection
        configKey="study_abroad_programs"
        sectionTag="Programs"
        sectionTitle={t("programsTitle")}
        fallbackCards={fallbackPrograms}
        columns="md:grid-cols-2"
        bgColor="bg-white"
        cardType="program"
      />

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
