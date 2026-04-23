import { PageBanner } from "@/components/layout/PageBanner"
import { CtaSection } from "@/components/common/CtaSection"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { CaseGrid } from "@/components/public/CaseGrid"
import { getTranslations } from "next-intl/server"

/** 成功案例页面 */
export default async function CasesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Cases")

  return (
    <>
      <PageBanner pageKey="cases" title={p("cases")} subtitle={p("casesSubtitle")} />

      {/* 案例简介 */}
      <PageIntroSection
        titleKey="cases_intro_title"
        contentKey="cases_intro_desc"
        titleFallback={t("title")}
        contentFallback="每个成功的留学故事都始于一次专业的咨询"
        sectionTag="Success Stories"
      />

      {/* 案例网格 */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <CaseGrid />
      </section>

      {/* CTA */}
      <CtaSection translationNamespace="Cases" />
    </>
  )
}
