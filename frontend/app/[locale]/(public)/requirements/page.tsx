import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import {
  FileText,
  Languages,
  CheckSquare,
} from "lucide-react"

/** 申请条件页面 */
export default async function RequirementsPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Requirements")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("requirements")

  const steps = [
    { num: "01", title: t("step1.title"), desc: t("step1.desc") },
    { num: "02", title: t("step2.title"), desc: t("step2.desc") },
    { num: "03", title: t("step3.title"), desc: t("step3.desc") },
    { num: "04", title: t("step4.title"), desc: t("step4.desc") },
    { num: "05", title: t("step5.title"), desc: t("step5.desc") },
    { num: "06", title: t("step6.title"), desc: t("step6.desc") },
  ]

  return (
    <>
      <PageBanner pageKey="requirements" title={p("requirements")} subtitle={p("requirementsSubtitle")} />

      {/* 申请条件总览 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Requirements
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("overviewTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* 德国 */}
          <div className="rounded-lg border bg-white p-6 transition-all hover:shadow-md">
            <h4 className="text-lg font-bold text-primary">{t("germany.title")}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("germany.r1")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("germany.r2")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("germany.r3")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("germany.r4")}
              </li>
            </ul>
          </div>
          {/* 日本 */}
          <div className="rounded-lg border bg-white p-6 transition-all hover:shadow-md">
            <h4 className="text-lg font-bold text-primary">{t("japan.title")}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("japan.r1")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("japan.r2")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("japan.r3")}
              </li>
            </ul>
          </div>
          {/* 韩国 */}
          <div className="rounded-lg border bg-white p-6 transition-all hover:shadow-md">
            <h4 className="text-lg font-bold text-primary">{t("korea.title")}</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("korea.r1")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("korea.r2")}
              </li>
              <li className="flex items-start gap-2">
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("korea.r3")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 语言要求 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Language
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">
              {t("langTitle")}
            </h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-6">
              <Languages className="h-8 w-8 text-primary" />
              <h4 className="mt-3 font-bold">{t("langGerman.title")}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{t("langGerman.desc")}</p>
            </div>
            <div className="rounded-lg border bg-white p-6">
              <Languages className="h-8 w-8 text-primary" />
              <h4 className="mt-3 font-bold">{t("langJapanese.title")}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{t("langJapanese.desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 材料清单 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Documents
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("docsTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mx-auto mt-8 max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              t("doc1"), t("doc2"), t("doc3"), t("doc4"),
              t("doc5"), t("doc6"), t("doc7"), t("doc8"),
            ].map((doc) => (
              <div key={doc} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm">{doc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 申请流程时间线 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Timeline
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">
              {t("timelineTitle")}
            </h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mx-auto mt-12 max-w-3xl space-y-6">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {step.num}
                </div>
                <div className="pt-1">
                  <h4 className="font-bold">{step.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 相关文章 */}
      <ArticleSection
        articles={articles}
        title={n("relatedArticles")}
        emptyText={n("noContent")}
        readMoreText={n("readMore")}
        basePath="/requirements"
      />

      {/* CTA */}
      <CtaSection translationNamespace="Requirements" variant="border-t" />
    </>
  )
}
