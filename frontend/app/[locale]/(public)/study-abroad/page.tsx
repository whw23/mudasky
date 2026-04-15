import { Banner } from "@/components/layout/Banner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { ConsultButton } from "@/components/common/ConsultButton"
import { getTranslations } from "next-intl/server"
import {
  BookOpen,
  Languages,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

/** 出国留学页面 */
export default async function StudyAbroadPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("StudyAbroad")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("study-abroad")

  const programs = [
    {
      icon: Languages,
      title: t("german.title"),
      desc: t("german.desc"),
      features: [t("german.f1"), t("german.f2"), t("german.f3"), t("german.f4")],
      highlight: true,
    },
    {
      icon: BookOpen,
      title: t("japanese.title"),
      desc: t("japanese.desc"),
      features: [t("japanese.f1"), t("japanese.f2"), t("japanese.f3")],
      highlight: false,
    },
    {
      icon: GraduationCap,
      title: t("french.title"),
      desc: t("french.desc"),
      features: [t("french.f1"), t("french.f2"), t("french.f3")],
      highlight: false,
    },
    {
      icon: GraduationCap,
      title: t("korean.title"),
      desc: t("korean.desc"),
      features: [t("korean.f1"), t("korean.f2"), t("korean.f3")],
      highlight: false,
    },
  ]

  return (
    <>
      <Banner title={p("studyAbroad")} subtitle={p("studyAbroadSubtitle")} />

      {/* 留学概述 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Overview
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("overviewTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("overviewContent")}
        </p>
      </section>

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
                <h4 className="text-xl font-bold">{t("germanFocusName")}</h4>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {t("germanFocusDesc")}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    t("germanFocusF1"),
                    t("germanFocusF2"),
                    t("germanFocusF3"),
                    t("germanFocusF4"),
                    t("germanFocusF5"),
                    t("germanFocusF6"),
                  ].map((f) => (
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
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Programs
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("programsTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {programs.map((prog) => (
            <div
              key={prog.title}
              className={`group rounded-lg border p-6 transition-all hover:shadow-md ${
                prog.highlight ? "border-primary/30 bg-primary/5" : "bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <prog.icon className="h-8 w-8 text-primary" />
                <h4 className="text-lg font-bold">{prog.title}</h4>
                {prog.highlight && (
                  <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white">
                    {t("recommended")}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {prog.desc}
              </p>
              <ul className="mt-4 space-y-2">
                {prog.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
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
        basePath="/study-abroad"
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
