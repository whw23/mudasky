import { Banner } from "@/components/layout/Banner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { ConsultButton } from "@/components/common/ConsultButton"
import { getTranslations } from "next-intl/server"
import {
  Home,
  Bus,
  Utensils,
  Heart,
  MapPin,
  ArrowRight,
} from "lucide-react"

/** 留学生活页面 */
export default async function LifePage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Life")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("life")

  const guides = [
    {
      icon: Home,
      title: t("housing.title"),
      desc: t("housing.desc"),
    },
    {
      icon: Bus,
      title: t("transport.title"),
      desc: t("transport.desc"),
    },
    {
      icon: Utensils,
      title: t("food.title"),
      desc: t("food.desc"),
    },
    {
      icon: Heart,
      title: t("culture.title"),
      desc: t("culture.desc"),
    },
  ]

  const cities = [
    {
      name: t("munich.name"),
      desc: t("munich.desc"),
      highlights: [t("munich.h1"), t("munich.h2"), t("munich.h3")],
    },
    {
      name: t("berlin.name"),
      desc: t("berlin.desc"),
      highlights: [t("berlin.h1"), t("berlin.h2"), t("berlin.h3")],
    },
    {
      name: t("hamburg.name"),
      desc: t("hamburg.desc"),
      highlights: [t("hamburg.h1"), t("hamburg.h2"), t("hamburg.h3")],
    },
  ]

  return (
    <>
      <Banner title={p("life")} subtitle={p("lifeSubtitle")} />

      {/* 生活指南 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Living Guide
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("guideTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("guideIntro")}
        </p>
      </section>

      {/* 四大板块 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2">
            {guides.map((guide) => (
              <div
                key={guide.title}
                className="group rounded-lg border bg-white p-6 transition-all hover:shadow-md"
              >
                <guide.icon className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />
                <h4 className="mt-4 text-lg font-bold">{guide.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {guide.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 城市指南 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            City Guides
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("cityTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cities.map((city) => (
            <div
              key={city.name}
              className="group rounded-lg border bg-white overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md"
            >
              {/* 城市图片占位 */}
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                <MapPin className="h-10 w-10 text-gray-400" />
              </div>
              <div className="p-6">
                <h4 className="text-lg font-bold transition-colors group-hover:text-primary">
                  {city.name}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {city.desc}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {city.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 相关文章 */}
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/life"
      />

      {/* CTA */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">{t("ctaTitle")}</h3>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t("ctaDesc")}
          </p>
          <ConsultButton
            className="mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>
      </section>
    </>
  )
}
