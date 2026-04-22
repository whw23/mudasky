import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { Languages, CheckCircle2 } from "lucide-react"

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
      name: t("korean.title"),
      desc: t("korean.desc"),
      features: [t("korean.f1"), t("korean.f2"), t("korean.f3")],
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
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Featured Program
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">
              {t("germanFocusTitle")}
            </h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mx-auto mt-8 max-w-4xl rounded-lg border-2 border-primary/20 bg-white p-8 md:p-12">
            <div className="flex items-start gap-4">
              <Languages className="mt-1 h-8 w-8 shrink-0 text-primary" />
              <div>
                <h4 className="text-xl font-bold">{fallbackFeatured.title}</h4>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {fallbackFeatured.desc}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {fallbackFeatured.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
