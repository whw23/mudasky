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
import { HomeBanner } from "@/components/home/HomeBanner"
import { StatsSection } from "@/components/home/StatsSection"
import { AboutIntroSection } from "@/components/home/AboutIntroSection"
import { ServicesSection } from "@/components/home/ServicesSection"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { NewsSection } from "@/components/home/NewsSection"
import { CtaSection } from "@/components/common/CtaSection"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
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
  return (
    <>
      <HomeBanner editable onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>
      <AboutIntroSection />
      <ServicesSection editable onEditTitle={() => onEditConfig("services_title")} />
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <FeaturedUniversities />
        <FeaturedCases />
      </section>
      <NewsSection />
      <CtaSection translationNamespace="Home" variant="border-t" />
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

