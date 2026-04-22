import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { getTranslations } from "next-intl/server"
import {
  Home,
  Bus,
  UtensilsCrossed,
  Palette,
  MapPin,
} from "lucide-react"
import Image from "next/image"

/** Lucide icon map for life guide cards */
const ICON_MAP: Record<string, any> = {
  Home,
  Bus,
  UtensilsCrossed,
  Palette,
}

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
        renderCard={(card) => {
          const IconComponent = ICON_MAP[card.icon] || Home
          return (
            <div className="group rounded-lg border bg-white p-6 transition-all hover:shadow-md">
              <IconComponent className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />
              <h4 className="mt-4 text-lg font-bold">{card.title}</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {card.desc}
              </p>
            </div>
          )
        }}
      />

      {/* 城市指南卡片 */}
      <CardGridSection
        configKey="life_city_cards"
        sectionTag="City Guides"
        sectionTitle={t("cityTitle")}
        fallbackCards={fallbackCityCards}
        columns="md:grid-cols-3"
        renderCard={(card) => (
          <div className="group rounded-lg border bg-white overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md">
            {card.image_id ? (
              <Image
                src={`/api/public/images/detail?id=${card.image_id}`}
                alt={card.city}
                width={400}
                height={160}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                <MapPin className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <div className="p-6">
              <h4 className="text-lg font-bold transition-colors group-hover:text-primary">
                {card.city}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">{card.country}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {card.desc}
              </p>
            </div>
          </div>
        )}
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
