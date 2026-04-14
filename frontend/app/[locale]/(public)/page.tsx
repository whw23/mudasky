import { Banner } from "@/components/layout/Banner"
import { StatsSection } from "@/components/home/StatsSection"
import {
  GraduationCap,
  Globe,
  FileCheck,
  Users,
  ArrowRight,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { ConsultButton } from "@/components/common/ConsultButton"
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

  const countries = [
    { key: "germany", name: t("germany") },
    { key: "japan", name: t("japan") },
    { key: "singapore", name: t("singapore") },
  ]

  return (
    <>
      {/* Hero Banner */}
      <Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} large />

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
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("servicesTitle")}</h3>
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

      {/* 热门留学国家 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("destinationsTag")}
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("destinationsTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-8 md:mt-12 grid gap-4 md:gap-6 md:grid-cols-3">
          {countries.map((country) => (
            <div
              key={country.key}
              className="group relative overflow-hidden rounded-lg cursor-pointer"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
              }}
            >
              <div className="flex h-48 items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <div className="text-center text-white">
                  <h4 className="text-2xl font-bold">{country.name}</h4>
                  <p className="mt-2 text-sm text-white/70 transition-colors group-hover:text-white">
                    {t("viewProgram", { country: country.name })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
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
      <section className="border-t bg-white py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">{t("ctaTitle")}</h3>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {t("ctaDescription")}
          </p>
          <ConsultButton
            className="mt-8 inline-block rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("ctaButton")}
          </ConsultButton>
        </div>
      </section>
    </>
  )
}
