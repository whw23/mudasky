import { Banner } from "@/components/layout/Banner"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { ConsultButton } from "@/components/common/ConsultButton"
import { getTranslations } from "next-intl/server"
import {
  GraduationCap,
  Globe,
  Handshake,
  ArrowRight,
} from "lucide-react"

/** 关于我们页面 */
export default async function AboutPage() {
  const p = await getTranslations("Pages")
  const t = await getTranslations("About")

  const team = [
    {
      icon: GraduationCap,
      name: t("team.leader"),
      role: t("team.leaderRole"),
      desc: t("team.leaderDesc"),
    },
    {
      icon: Globe,
      name: t("team.consultant"),
      role: t("team.consultantRole"),
      desc: t("team.consultantDesc"),
    },
    {
      icon: Handshake,
      name: t("team.visa"),
      role: t("team.visaRole"),
      desc: t("team.visaDesc"),
    },
  ]

  return (
    <>
      <Banner title={p("about")} subtitle={p("aboutSubtitle")} />

      {/* 公司简介 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Our Story
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("historyTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <HistorySection />
      </section>

      {/* 使命愿景 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <MissionVisionSection />
        </div>
      </section>

      {/* 慕尼黑大学语言中心合作 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Partnership
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("partnershipTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mx-auto mt-8 max-w-4xl rounded-lg border bg-gray-50 p-8 md:p-12">
          <PartnershipSection />
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              {t("partnerBadge1")}
            </span>
            <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              {t("partnerBadge2")}
            </span>
            <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
              {t("partnerBadge3")}
            </span>
          </div>
        </div>
      </section>

      {/* 数据统计 */}
      <AboutStatsSection />

      {/* 团队介绍 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Our Team
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">
            {t("teamTitle")}
          </h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {team.map((member) => (
            <div
              key={member.name}
              className="group rounded-lg border p-6 text-center transition-all hover:shadow-md"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-primary/10">
                <member.icon className="h-8 w-8 text-gray-400 transition-colors group-hover:text-primary" />
              </div>
              <h4 className="mt-4 text-lg font-bold">{member.name}</h4>
              <p className="text-sm text-primary">{member.role}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {member.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 联系方式 */}
      <ContactInfoSection />

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
