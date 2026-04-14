import { Banner } from "@/components/layout/Banner"
import { ConsultButton } from "@/components/common/ConsultButton"
import { getTranslations } from "next-intl/server"
import { ArrowRight } from "lucide-react"
import { UniversityList } from "@/components/public/UniversityList"

/** 院校选择页面 */
export default async function UniversitiesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Universities")

  return (
    <>
      <Banner title={p("universities")} subtitle={p("universitiesSubtitle")} />

      {/* 概述 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Partner Universities
          </h2>
          <h3 className="mt-2 text-2xl font-bold md:text-3xl">
            {t("title")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </section>

      {/* 院校搜索 + 列表 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <UniversityList />
        </div>
      </section>

      {/* 选校建议 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h3 className="text-2xl font-bold md:text-3xl">{t("adviceTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("adviceContent")}
        </p>
        <div className="mt-8 text-center">
          <ConsultButton
            className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </ConsultButton>
        </div>
      </section>
    </>
  )
}
