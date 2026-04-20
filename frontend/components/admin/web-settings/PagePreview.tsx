"use client"

/**
 * 页面预览容器组件。
 * 根据 activePage 渲染对应页面的预览或编辑界面。
 * 首页和关于页使用 EditableOverlay 编辑配置项，
 * 其余页面（院校/案例/文章）直接在预览中增删改。
 */

import { useTranslations } from "next-intl"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

import { Banner } from "@/components/layout/Banner"
import { StatsSection } from "@/components/home/StatsSection"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { NewsPreview } from "./NewsPreview"
import { UniversitiesEditPreview } from "./UniversitiesEditPreview"
import { CasesEditPreview } from "./CasesEditPreview"
import { ArticleListPreview } from "./ArticleListPreview"

interface PagePreviewProps {
  activePage: string
  onEditConfig: (section: string) => void
  onBannerEdit: (pageKey: string) => void
}

/** 页面预览路由 */
export function PagePreview({ activePage, onEditConfig, onBannerEdit }: PagePreviewProps) {
  switch (activePage) {
    case "home":
      return <HomePreview onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
    case "universities":
      return <UniversitiesEditPreview onBannerEdit={onBannerEdit} />
    case "cases":
      return <CasesEditPreview onBannerEdit={onBannerEdit} />
    case "about":
      return <AboutPreview onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
    default:
      return <ArticleListPreview categorySlug={activePage} onBannerEdit={onBannerEdit} />
  }
}

/** 首页预览 — 复用真实首页组件 */
function HomePreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
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
      <div className="relative">
        <EditableOverlay onClick={() => onBannerEdit("home")} label="编辑 Banner 背景">
          <Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} large />
        </EditableOverlay>
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
          <EditableOverlay onClick={() => onEditConfig("hero_title")} label="编辑标题" inline>
            <span className="pointer-events-auto text-2xl md:text-5xl font-bold tracking-wide text-transparent select-none">
              【{t("heroTitle")}】
            </span>
          </EditableOverlay>
          <EditableOverlay onClick={() => onEditConfig("hero_subtitle")} label="编辑副标题" inline>
            <span className="pointer-events-auto text-xs md:text-sm tracking-[0.3em] text-transparent select-none">
              {t("heroSubtitle")}
            </span>
          </EditableOverlay>
        </div>
      </div>

      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>

      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {t("servicesTag")}
            </h2>
            <EditableOverlay onClick={() => onEditConfig("services_title")} label="编辑服务标题" inline>
              <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("servicesTitle")}</h3>
            </EditableOverlay>
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

      {/* 热门留学国家 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("destinationsTag")}
          </h2>
          <EditableOverlay onClick={() => onEditConfig("destinations_title")} label="编辑留学国家标题" inline>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("destinationsTitle")}</h3>
          </EditableOverlay>
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

      {/* 最新资讯（只读预览） */}
      <NewsPreview />
    </>
  )
}

/** 关于我们预览 */
function AboutPreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  const t = useTranslations("Pages")
  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("about")} label="编辑 Banner">
        <Banner title={t("about")} subtitle={t("aboutSubtitle")} />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("about_history")} label="编辑历史">
        <HistorySection />
      </EditableOverlay>
      <MissionVisionSection
        editable
        onEditMission={() => onEditConfig("about_mission")}
        onEditVision={() => onEditConfig("about_vision")}
      />
      <EditableOverlay onClick={() => onEditConfig("about_partnership")} label="编辑合作">
        <PartnershipSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <AboutStatsSection />
      </EditableOverlay>
      <ContactInfoSection
        editable
        onEditField={(field) => onEditConfig(`contact_${field}`)}
      />
    </>
  )
}

