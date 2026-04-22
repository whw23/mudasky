import { PageBanner } from "@/components/layout/PageBanner"
import { CtaSection } from "@/components/common/CtaSection"
import { CaseGrid } from "@/components/public/CaseGrid"
import { getTranslations } from "next-intl/server"

/** 成功案例页面 */
export default async function CasesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Cases")

  const stats = [
    { value: "500+", label: t("statCases") },
    { value: "98%", label: t("statVisa") },
    { value: "50+", label: t("statSchools") },
  ]

  return (
    <>
      <PageBanner pageKey="cases" title={p("cases")} subtitle={p("casesSubtitle")} />

      {/* 统计 */}
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 案例网格 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Success Stories
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("title")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12">
          <CaseGrid />
        </div>
      </section>

      {/* CTA */}
      <CtaSection translationNamespace="Cases" />
    </>
  )
}
