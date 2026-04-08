import { Banner } from "@/components/layout/Banner"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import {
  MapPin,
  GraduationCap,
  Building2,
  ArrowRight,
} from "lucide-react"

/** 院校选择页面 */
export default async function UniversitiesPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("Universities")

  const universities = [
    {
      name: t("uni1.name"),
      location: t("uni1.location"),
      programs: t("uni1.programs"),
      desc: t("uni1.desc"),
    },
    {
      name: t("uni2.name"),
      location: t("uni2.location"),
      programs: t("uni2.programs"),
      desc: t("uni2.desc"),
    },
    {
      name: t("uni3.name"),
      location: t("uni3.location"),
      programs: t("uni3.programs"),
      desc: t("uni3.desc"),
    },
    {
      name: t("uni4.name"),
      location: t("uni4.location"),
      programs: t("uni4.programs"),
      desc: t("uni4.desc"),
    },
    {
      name: t("uni5.name"),
      location: t("uni5.location"),
      programs: t("uni5.programs"),
      desc: t("uni5.desc"),
    },
    {
      name: t("uni6.name"),
      location: t("uni6.location"),
      programs: t("uni6.programs"),
      desc: t("uni6.desc"),
    },
  ]

  return (
    <>
      <Banner title={p("universities")} subtitle={p("universitiesSubtitle")} />

      {/* 概述 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Partner Universities
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("title")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </section>

      {/* 院校列表 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {universities.map((uni) => (
              <div
                key={uni.name}
                className="group rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                {/* Logo 占位 */}
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                  <Building2 className="h-8 w-8 text-gray-400 transition-colors group-hover:text-primary" />
                </div>
                <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
                  {uni.name}
                </h4>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {uni.location}
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {uni.programs}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {uni.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 选校建议 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold">{t("adviceTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("adviceContent")}
        </p>
        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("ctaButton")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
