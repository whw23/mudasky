import { PageBanner } from "@/components/layout/PageBanner"
import { CtaSection } from "@/components/common/CtaSection"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { getTranslations } from "next-intl/server"
import { UniversityList } from "@/components/public/UniversityList"

/** 院校选择页面 */
export default async function UniversitiesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Universities")

  return (
    <>
      <PageBanner pageKey="universities" title={p("universities")} subtitle={p("universitiesSubtitle")} />

      {/* 概述 */}
      <PageIntroSection
        titleKey="universities_intro_title"
        contentKey="universities_intro_desc"
        titleFallback={t("title")}
        contentFallback={t("intro")}
        sectionTag="Partner Universities"
      />

      {/* 院校搜索 + 列表 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <UniversityList />
        </div>
      </section>

      {/* CTA */}
      <CtaSection translationNamespace="Universities" />
    </>
  )
}
