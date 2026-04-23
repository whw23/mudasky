import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { getTranslations } from "next-intl/server"

/** 留学生活页面 */
export default async function LifePage() {
  const p = await getTranslations("Pages")
  const n = await getTranslations("News")
  const t = await getTranslations("Life")

  const articles = await fetchArticlesByCategorySlug("life")

  // 生活板块卡片 fallback
  const fallbackGuideCards = [
    { icon: "Home", title: t("housing.title"), desc: t("housing.desc") },
    { icon: "Bus", title: t("transport.title"), desc: t("transport.desc") },
    { icon: "UtensilsCrossed", title: t("food.title"), desc: t("food.desc") },
    { icon: "Palette", title: t("culture.title"), desc: t("culture.desc") },
  ]

  // 城市指南卡片 fallback
  const fallbackCityCards = [
    {
      city: t("munich.name"),
      country: "德国",
      desc: t("munich.desc"),
      image_id: null,
    },
    {
      city: t("berlin.name"),
      country: "德国",
      desc: t("berlin.desc"),
      image_id: null,
    },
    {
      city: t("hamburg.name"),
      country: "德国",
      desc: t("hamburg.desc"),
      image_id: null,
    },
  ]

  return (
    <>
      <PageBanner pageKey="life" title={p("life")} subtitle={p("lifeSubtitle")} />

      {/* 生活指南介绍 */}
      <PageIntroSection
        titleKey="life_intro_title"
        contentKey="life_intro_desc"
        titleFallback={t("guideTitle")}
        contentFallback={t("guideIntro")}
        sectionTag="Living Guide"
      />

      {/* 生活板块卡片 */}
      <CardGridSection
        configKey="life_guide_cards"
        sectionTag="Daily Life"
        sectionTitle="生活板块"
        fallbackCards={fallbackGuideCards}
        columns="md:grid-cols-2"
        bgColor="bg-gray-50"
        cardType="guide"
      />

      {/* 城市指南卡片 */}
      <CardGridSection
        configKey="life_city_cards"
        sectionTag="City Guides"
        sectionTitle={t("cityTitle")}
        fallbackCards={fallbackCityCards}
        columns="md:grid-cols-3"
        cardType="city"
      />

      {/* 相关文章 */}
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/life"
      />

      {/* CTA */}
      <CtaSection translationNamespace="Life" />
    </>
  )
}
