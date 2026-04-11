"use client"

/**
 * 页面预览容器组件。
 * 根据 activePage 渲染对应公开页面的真实组件，
 * 配合 EditableOverlay 和 DataSectionOverlay 实现可编辑浮层。
 */

import { useTranslations } from "next-intl"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { DataSectionOverlay } from "./DataSectionOverlay"

import { Banner } from "@/components/layout/Banner"
import { StatsSection } from "@/components/home/StatsSection"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { UniversityList } from "@/components/public/UniversityList"
import { CasesPreview } from "./CasesPreview"
import { NewsPreview } from "./NewsPreview"

interface PagePreviewProps {
  activePage: string
  onEditConfig: (section: string) => void
}

/** 页面预览路由 */
export function PagePreview({ activePage, onEditConfig }: PagePreviewProps) {
  switch (activePage) {
    case "home":
      return <HomePreview onEditConfig={onEditConfig} />
    case "universities":
      return <UniversitiesPreview />
    case "cases":
      return <CasesPagePreview />
    case "news":
      return <NewsPagePreview />
    case "about":
      return <AboutPreview onEditConfig={onEditConfig} />
    default:
      return <StaticPagePreview pageKey={activePage} />
  }
}

/** 首页预览 — 复用真实首页组件 */
function HomePreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  const t = useTranslations("Home")

  const services = [
    { icon: "🎓", title: t("service.studyAbroad"), desc: t("service.studyAbroadDesc") },
    { icon: "🌍", title: t("service.universities"), desc: t("service.universitiesDesc") },
    { icon: "📋", title: t("service.visa"), desc: t("service.visaDesc") },
    { icon: "👥", title: t("service.cases"), desc: t("service.casesDesc") },
  ]

  const countries = [
    { key: "germany", name: t("germany") },
    { key: "japan", name: t("japan") },
    { key: "singapore", name: t("singapore") },
  ]

  return (
    <>
      <EditableOverlay onClick={() => onEditConfig("hero")} label="编辑 Hero">
        <Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} large />
      </EditableOverlay>

      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>

      <EditableOverlay onClick={() => onEditConfig("services")} label="编辑服务">
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
              {services.map((s) => (
                <div key={s.title} className="rounded-lg border bg-white p-6 shadow-sm">
                  <span className="text-3xl">{s.icon}</span>
                  <h4 className="mt-4 text-lg font-bold">{s.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </EditableOverlay>

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
          {countries.map((c) => (
            <div key={c.key} className="group relative overflow-hidden rounded-lg" style={{ backgroundImage: "linear-gradient(135deg, #374151 0%, #1f2937 100%)" }}>
              <div className="flex h-48 items-center justify-center">
                <div className="text-center text-white">
                  <h4 className="text-2xl font-bold">{c.name}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/** 院校选择预览 */
function UniversitiesPreview() {
  const t = useTranslations("Pages")
  return (
    <DataSectionOverlay label="管理院校" href="/admin/universities">
      <Banner title={t("universities")} subtitle={t("universitiesSubtitle")} />
      <UniversityList />
    </DataSectionOverlay>
  )
}

/** 案例页预览 */
function CasesPagePreview() {
  const t = useTranslations("Pages")
  return (
    <DataSectionOverlay label="管理案例" href="/admin/cases">
      <Banner title={t("cases")} subtitle={t("casesSubtitle")} />
      <CasesPreview />
    </DataSectionOverlay>
  )
}

/** 新闻页预览 */
function NewsPagePreview() {
  const t = useTranslations("Pages")
  return (
    <DataSectionOverlay label="管理文章" href="/admin/articles">
      <Banner title={t("news")} subtitle={t("newsSubtitle")} />
      <NewsPreview />
    </DataSectionOverlay>
  )
}

/** 关于我们预览 */
function AboutPreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  const t = useTranslations("Pages")
  return (
    <>
      <Banner title={t("about")} subtitle={t("aboutSubtitle")} />
      <EditableOverlay onClick={() => onEditConfig("about_history")} label="编辑历史">
        <HistorySection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("about_mission")} label="编辑使命愿景">
        <MissionVisionSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("about_partnership")} label="编辑合作">
        <PartnershipSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <AboutStatsSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("contact")} label="编辑联系方式">
        <ContactInfoSection />
      </EditableOverlay>
    </>
  )
}

/** 静态页面预览（i18n 管理） */
function StaticPagePreview({ pageKey }: { pageKey: string }) {
  const t = useTranslations("Nav")
  return (
    <div className="px-10 py-16 text-center">
      <h2 className="text-2xl font-bold">{t(pageKey)}</h2>
      <p className="mt-4 text-muted-foreground">
        此页面内容由翻译文件管理，暂不支持后台编辑
      </p>
    </div>
  )
}
