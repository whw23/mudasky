import { HomeBanner } from "@/components/home/HomeBanner"
import { StatsSection } from "@/components/home/StatsSection"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { SectionTitle } from "@/components/home/SectionTitle"
import { CtaSection } from "@/components/common/CtaSection"
import {
  GraduationCap,
  Globe,
  FileCheck,
  Users,
  ArrowRight,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"

/** 官网首页 */
export default async function HomePage() {
  const t = await getTranslations("Home")

  const services = [
    {
      icon: GraduationCap,
      title: t("service.studyAbroad"),
      desc: t("service.studyAbroadDesc"),
      href: "/study-abroad" as const,
    },
    {
      icon: Globe,
      title: t("service.universities"),
      desc: t("service.universitiesDesc"),
      href: "/universities" as const,
    },
    {
      icon: FileCheck,
      title: t("service.visa"),
      desc: t("service.visaDesc"),
      href: "/visa" as const,
    },
    {
      icon: Users,
      title: t("service.cases"),
      desc: t("service.casesDesc"),
      href: "/cases" as const,
    },
  ]

  return (
    <>
      {/* Hero Banner */}
      <HomeBanner />

      {/* 数据统计 */}
      <StatsSection />

      {/* 关于我们 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("aboutUsTag")}
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("aboutUsTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          {t("aboutUsContent")}
        </p>
      </section>

      {/* 精选服务 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {t("servicesTag")}
            </h2>
            <SectionTitle configKey="services_title" fallback={t("servicesTitle")} className="mt-2 text-2xl md:text-3xl font-bold" />
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-lg border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <service.icon className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />
                <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
                  {service.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {t("learnMore")} <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 精选院校和成功案例 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <FeaturedUniversities />
        <FeaturedCases />
      </section>

      {/* 最新资讯 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                {t("newsTag")}
              </h2>
              <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("newsTitle")}</h3>
            </div>
            <Link
              href="/news"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t("viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="group rounded-lg border bg-white p-6 transition-all duration-200 hover:border-primary hover:shadow-sm"
              >
                <div className="text-xs text-muted-foreground">2026-04-07</div>
                <h4 className="mt-2 font-bold transition-colors group-hover:text-primary">
                  {t("articlePlaceholderTitle", { index: i })}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {t("articlePlaceholderSummary")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CtaSection translationNamespace="Home" variant="border-t" />
    </>
  )
}
