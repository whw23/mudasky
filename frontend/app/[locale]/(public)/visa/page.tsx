import { PageBanner } from "@/components/layout/PageBanner"
import { ArticleSection } from "@/components/content/ArticleSection"
import { fetchArticlesByCategorySlug } from "@/lib/content-api"
import { CtaSection } from "@/components/common/CtaSection"
import { getTranslations } from "next-intl/server"
import {
  FileText,
  Clock,
  AlertTriangle,
} from "lucide-react"

/** 签证办理页面 */
export default async function VisaPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Visa")
  const n = await getTranslations("News")

  const articles = await fetchArticlesByCategorySlug("visa")

  const steps = [
    { num: "01", title: t("step1.title"), desc: t("step1.desc") },
    { num: "02", title: t("step2.title"), desc: t("step2.desc") },
    { num: "03", title: t("step3.title"), desc: t("step3.desc") },
    { num: "04", title: t("step4.title"), desc: t("step4.desc") },
    { num: "05", title: t("step5.title"), desc: t("step5.desc") },
  ]

  const docs = [
    t("doc1"), t("doc2"), t("doc3"), t("doc4"),
    t("doc5"), t("doc6"), t("doc7"), t("doc8"),
  ]

  const tips = [
    t("tip1"), t("tip2"), t("tip3"), t("tip4"), t("tip5"),
  ]

  return (
    <>
      <PageBanner pageKey="visa" title={p("visa")} subtitle={p("visaSubtitle")} />

      {/* 签证流程 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Process
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("processTitle")}
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
      </section>

      {/* 所需材料 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Documents
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">
              {t("docsTitle")}
            </h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mx-auto mt-8 max-w-3xl grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => (
              <div key={doc} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm">{doc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 办理时间 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Timeline
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("timelineTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mx-auto mt-8 max-w-4xl grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-primary" />
            <h4 className="mt-3 font-bold">{t("timeline1.title")}</h4>
            <p className="mt-2 text-2xl font-bold text-primary">{t("timeline1.time")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("timeline1.desc")}</p>
          </div>
          <div className="rounded-lg border bg-white p-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-primary" />
            <h4 className="mt-3 font-bold">{t("timeline2.title")}</h4>
            <p className="mt-2 text-2xl font-bold text-primary">{t("timeline2.time")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("timeline2.desc")}</p>
          </div>
          <div className="rounded-lg border bg-white p-6 text-center">
            <Clock className="mx-auto h-8 w-8 text-primary" />
            <h4 className="mt-3 font-bold">{t("timeline3.title")}</h4>
            <p className="mt-2 text-2xl font-bold text-primary">{t("timeline3.time")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("timeline3.desc")}</p>
          </div>
        </div>
      </section>

      {/* 注意事项 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Tips
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">
              {t("tipsTitle")}
            </h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-4">
            {tips.map((tip) => (
              <div key={tip} className="flex items-start gap-3 rounded-lg border bg-white px-5 py-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-sm leading-relaxed">{tip}</p>
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
        basePath="/visa"
      />

      {/* CTA */}
      <CtaSection translationNamespace="Visa" variant="border-t" />
    </>
  )
}
