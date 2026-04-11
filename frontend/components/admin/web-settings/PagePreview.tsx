"use client"

/**
 * 页面预览容器组件。
 * 根据 activePage 渲染对应页面的各区块预览，
 * 配合 EditableOverlay 和 DataSectionOverlay 实现可编辑浮层。
 */

import { useTranslations } from "next-intl"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { DataSectionOverlay } from "./DataSectionOverlay"

import { ArticleTable } from "@/components/admin/ArticleTable"
import { CaseTable } from "@/components/admin/CaseTable"
import { UniversityTable } from "@/components/admin/UniversityTable"
import { CategoryTable } from "@/components/admin/CategoryTable"

import { StatsSection } from "@/components/home/StatsSection"
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
  AboutStatsSection,
} from "@/components/about/AboutContent"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"

interface PagePreviewProps {
  activePage: string
  onEditConfig: (section: string) => void
}

/**
 * 页面预览容器
 * 根据 activePage 渲染对应页面的各区块预览
 */
export function PagePreview({ activePage, onEditConfig }: PagePreviewProps) {
  switch (activePage) {
    case "home":
      return <HomePreview onEditConfig={onEditConfig} />
    case "universities":
      return <UniversitiesPreview />
    case "cases":
      return <CasesPreview />
    case "news":
      return <NewsPreview />
    case "about":
      return <AboutPreview onEditConfig={onEditConfig} />
    default:
      return <StaticPagePreview pageKey={activePage} />
  }
}

/** 首页预览 */
function HomePreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  const t = useTranslations("Home")

  return (
    <div className="pointer-events-none [&_.group]:pointer-events-auto">
      <EditableOverlay onClick={() => onEditConfig("hero")} label="编辑 Hero">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-10 py-16 text-center text-white">
          <h1 className="text-3xl font-bold">{t("heroTitle")}</h1>
          <p className="mt-3 text-lg opacity-80">{t("heroSubtitle")}</p>
        </div>
      </EditableOverlay>

      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>

      <EditableOverlay onClick={() => onEditConfig("services")} label="编辑服务">
        <div className="px-10 py-10 text-center text-muted-foreground">
          {t("servicesTitle")}
        </div>
      </EditableOverlay>
    </div>
  )
}

/** 院校选择预览 */
function UniversitiesPreview() {
  return (
    <DataSectionOverlay label="管理院校" renderManager={() => <UniversityTable />}>
      <div className="px-10 py-16 text-center">
        <h2 className="text-2xl font-bold">合作院校</h2>
        <p className="mt-2 text-muted-foreground">点击编辑按钮管理院校数据</p>
      </div>
    </DataSectionOverlay>
  )
}

/** 成功案例预览 */
function CasesPreview() {
  return (
    <DataSectionOverlay label="管理案例" renderManager={() => <CaseTable />}>
      <div className="px-10 py-16 text-center">
        <h2 className="text-2xl font-bold">成功案例</h2>
        <p className="mt-2 text-muted-foreground">点击编辑按钮管理案例数据</p>
      </div>
    </DataSectionOverlay>
  )
}

/** 新闻政策预览 */
function NewsPreview() {
  return (
    <div>
      <DataSectionOverlay label="管理分类" renderManager={() => <CategoryTable />}>
        <div className="border-b px-10 py-8 text-center">
          <h3 className="text-lg font-semibold">文章分类</h3>
        </div>
      </DataSectionOverlay>
      <DataSectionOverlay label="管理文章" renderManager={() => <ArticleTable />}>
        <div className="px-10 py-16 text-center">
          <h2 className="text-2xl font-bold">新闻政策</h2>
          <p className="mt-2 text-muted-foreground">点击编辑按钮管理文章</p>
        </div>
      </DataSectionOverlay>
    </div>
  )
}

/** 关于我们预览 */
function AboutPreview({ onEditConfig }: { onEditConfig: (s: string) => void }) {
  return (
    <div className="pointer-events-none [&_.group]:pointer-events-auto">
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
    </div>
  )
}

/** 静态页面预览（留学/签证/生活/申请条件等） */
function StaticPagePreview({ pageKey }: { pageKey: string }) {
  const t = useTranslations("Nav")
  const pageName = t(pageKey)

  return (
    <div className="px-10 py-16 text-center">
      <h2 className="text-2xl font-bold">{pageName}</h2>
      <p className="mt-4 text-muted-foreground">
        此页面内容由 i18n 翻译文件管理，暂不支持后台编辑
      </p>
    </div>
  )
}
