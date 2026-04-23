"use client"

/**
 * 页面预览容器组件。
 * 根据 activePage 渲染对应页面的预览或编辑界面。
 * 首页和关于页使用 EditableOverlay 编辑配置项，
 * 其余页面（院校/案例/文章）直接在预览中增删改。
 */

import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

import { PageBanner } from "@/components/layout/PageBanner"
import { HomeBanner } from "@/components/home/HomeBanner"
import { FeaturedUniversities } from "@/components/home/FeaturedUniversities"
import { FeaturedCases } from "@/components/home/FeaturedCases"
import { CtaSection } from "@/components/common/CtaSection"
import { HistorySection } from "@/components/about/AboutContent"
import { CardGridSection } from "@/components/common/CardGridSection"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { OfficeGallery } from "@/components/about/OfficeGallery"
import { UniversitiesPreviewPage } from "./UniversitiesPreviewPage"
import { CasesPreviewPage } from "./CasesPreviewPage"
import { ArticlePreviewPage } from "./ArticlePreviewPage"

const ABOUT_CARDS_FALLBACK = [
  { icon: "Target", title: "我们的使命", desc: "让学生上理想的好大学。" },
  { icon: "Eye", title: "我们的愿景", desc: "实现学生接受优质高等教育的梦想，并依靠点点滴滴契而不舍的艰苦追求，成为最专业的国际教育资源咨询服务企业。" },
  { icon: "Heart", title: "我们的价值观", desc: "无条件让学生和家长满意、团队精神、团队互助、持续学习。" },
]

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
      return <UniversitiesPreviewPage onBannerEdit={onBannerEdit} onEditConfig={onEditConfig} />
    case "cases":
      return <CasesPreviewPage onBannerEdit={onBannerEdit} onEditConfig={onEditConfig} />
    case "about":
      return <AboutPreview onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
    default:
      return <ArticlePreviewPage categorySlug={activePage} onBannerEdit={onBannerEdit} onEditConfig={onEditConfig} />
  }
}

/** 首页预览 — 复用真实首页组件 */
function HomePreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  return (
    <>
      <HomeBanner editable onEditConfig={onEditConfig} onBannerEdit={onBannerEdit} />
      <FeaturedUniversities />
      <FeaturedCases />
      <CtaSection translationNamespace="Home" variant="border-t" editable onEdit={() => onEditConfig("home_cta")} />
    </>
  )
}

/** 关于我们预览 */
function AboutPreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  const t = useTranslations("About")
  const p = useTranslations("Pages")
  const { aboutInfo } = useLocalizedConfig()
  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("about")} label="编辑 Banner">
        <PageBanner pageKey="about" title={p("about")} subtitle={p("aboutSubtitle")} />
      </EditableOverlay>
      <ContactInfoSection editable onEditField={(field) => onEditConfig(`contact_${field}`)} />
      <HistorySection editable onEditTitle={() => onEditConfig("about_history_title")} onEdit={() => onEditConfig("about_history")} />
      <CardGridSection
        configKey="about_cards"
        sectionTag="About Us"
        sectionTitle="使命与愿景"
        fallbackCards={ABOUT_CARDS_FALLBACK}
        cardType="guide"
        bgColor="bg-gray-50"
        editable
        onEdit={() => onEditConfig("about_cards")}
      />
      <OfficeGallery editable />
      <CtaSection translationNamespace="About" editable onEdit={() => onEditConfig("about_cta")} />
    </>
  )
}

