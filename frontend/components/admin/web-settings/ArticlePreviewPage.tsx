"use client"

/**
 * 文章预览页面组件。
 * 在网页设置中以视觉化方式预览文章列表，支持编辑/新建/导入导出。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { PageBanner } from "@/components/layout/PageBanner"
import { CtaSection } from "@/components/common/CtaSection"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { ArticleListClient } from "@/components/public/ArticleListClient"
import { ManageToolbar } from "./ManageToolbar"
import { ArticleEditDialog } from "./ArticleEditDialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { StepListSection } from "@/components/common/StepListSection"
import { DocListSection } from "@/components/common/DocListSection"
import { CardGridSection } from "@/components/common/CardGridSection"
import { CountryRequirementsSection } from "@/components/common/CountryRequirementsSection"
import { FeaturedProgramSection } from "@/components/common/FeaturedProgramSection"

interface Category {
  id: string
  name: string
  slug: string
}

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  category_id: string
  status: string
  published_at: string | null
  created_at: string
}

const SLUG_TO_I18N: Record<string, string> = {
  "study-abroad": "studyAbroad",
  "requirements": "requirements",
  "cases": "cases",
  "visa": "visa",
  "life": "life",
  "news": "news",
}

const SLUG_TO_NS: Record<string, string> = {
  "study-abroad": "StudyAbroad",
  "requirements": "Requirements",
  "visa": "Visa",
  "life": "Life",
  "news": "News",
}

interface ArticlePreviewPageProps {
  categorySlug: string
  onBannerEdit: (pageKey: string) => void
  onEditConfig?: (section: string) => void
}

/** 文章预览页面 */
export function ArticlePreviewPage({
  categorySlug,
  onBannerEdit,
  onEditConfig,
}: ArticlePreviewPageProps) {
  const p = useTranslations("Pages")
  const t = useTranslations("News")

  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Article | null>(null)

  /* 导入预览状态 */
  const [articlePreviewData, setArticlePreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  /* 分类 ID（由 slug 解析） */
  const [categoryId, setCategoryId] = useState<string | null>(null)

  /* 刷新标记 */
  const [refreshKey, setRefreshKey] = useState(0)

  /** 获取分类 ID */
  useEffect(() => {
    api
      .get<Category[]>("/admin/web-settings/categories/list")
      .then(({ data }) => {
        const cat = (data ?? []).find((c) => c.slug === categorySlug)
        setCategoryId(cat?.id ?? null)
      })
      .catch(() => setCategoryId(null))
  }, [categorySlug])

  /** 刷新数据 */
  function refreshData() {
    setRefreshKey((k) => k + 1)
  }

  /** 打开编辑弹窗 */
  function handleEdit(article: Article) {
    setEditItem(article)
    setEditOpen(true)
  }

  /** 确认导入文章 */
  async function handleArticleConfirm(items: any[]) {
    if (!importFile) {
      toast.error("未找到导入文件")
      return
    }
    const formData = new FormData()
    formData.append("file", importFile)
    formData.append("items", JSON.stringify(items))
    await api.post(
      "/admin/web-settings/articles/list/import/confirm",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    refreshData()
  }

  return (
    <>
      {/* Banner */}
      <EditableOverlay
        onClick={() => onBannerEdit(categorySlug)}
        label="编辑 Banner"
      >
        <PageBanner
          pageKey={categorySlug}
          title={p((SLUG_TO_I18N[categorySlug] ?? categorySlug) as any)}
          subtitle={p(`${SLUG_TO_I18N[categorySlug] ?? categorySlug}Subtitle` as any)}
        />
      </EditableOverlay>

      {/* 页面介绍区 */}
      <IntroSection slug={categorySlug} title={t("title")} onEditConfig={onEditConfig} />

      {/* 管理工具栏 */}
      <ManageToolbar>
        {categoryId && (
          <ImportExportToolbar
            templateUrl="/admin/web-settings/articles/list/import/template"
            importUrl={`/admin/web-settings/articles/list/import/preview?category_id=${categoryId}`}
            exportUrl={`/admin/web-settings/articles/list/export?category_id=${categoryId}`}
            onImportPreview={setArticlePreviewData}
            onFileSelect={setImportFile}
            templateFilename="articles_template.zip"
            exportFilename="articles.zip"
          />
        )}
        <Button
          size="sm"
          onClick={() => {
            setEditItem(null)
            setEditOpen(true)
          }}
          disabled={!categoryId}
        >
          <Plus className="mr-1 size-4" /> 写文章
        </Button>
      </ManageToolbar>

      {/* 文章列表 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <ArticleListClient
          key={refreshKey}
          categorySlug={categorySlug}
          editable
          onEdit={handleEdit}
        />
      </section>

      {/* CTA */}
      <CtaSection
        translationNamespace={SLUG_TO_NS[categorySlug] || "News"}
        editable={!!onEditConfig}
        onEdit={() => onEditConfig?.(`${categorySlug.replace(/-/g, "_")}_cta`)}
      />

      {/* 编辑弹窗 */}
      {categoryId && (
        <ArticleEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          article={editItem}
          categoryId={categoryId}
          onSuccess={refreshData}
        />
      )}

      {/* 文章导入预览弹窗 */}
      <ImportPreviewDialog
        open={!!articlePreviewData}
        onOpenChange={(open) => !open && setArticlePreviewData(null)}
        data={articlePreviewData}
        onConfirm={handleArticleConfirm}
        columns={[
          { key: "title", label: "标题" },
          { key: "slug", label: "URL 标识" },
          { key: "status", label: "状态" },
        ]}
      />
    </>
  )
}

/** 页面介绍区 — 根据 slug 渲染不同的 Intro */
function IntroSection({
  slug,
  title,
  onEditConfig,
}: {
  slug: string
  title: string
  onEditConfig?: (section: string) => void
}) {
  const editable = !!onEditConfig
  const tStudyAbroad = useTranslations("StudyAbroad")
  const tVisa = useTranslations("Visa")
  const tRequirements = useTranslations("Requirements")
  const tLife = useTranslations("Life")

  switch (slug) {
    case "study-abroad": {
      const fallbackPrograms = [
        {
          name: tStudyAbroad("german.title"), desc: tStudyAbroad("german.desc"),
          features: [tStudyAbroad("german.f1"), tStudyAbroad("german.f2"), tStudyAbroad("german.f3"), tStudyAbroad("german.f4")],
          highlight: true,
        },
        {
          name: tStudyAbroad("japanese.title"), desc: tStudyAbroad("japanese.desc"),
          features: [tStudyAbroad("japanese.f1"), tStudyAbroad("japanese.f2"), tStudyAbroad("japanese.f3")],
          highlight: false,
        },
        {
          name: tStudyAbroad("singapore.title"), desc: tStudyAbroad("singapore.desc"),
          features: [tStudyAbroad("singapore.f1"), tStudyAbroad("singapore.f2"), tStudyAbroad("singapore.f3")],
          highlight: false,
        },
      ]
      return (
        <>
          <PageIntroSection
            titleKey="study_abroad_intro_title"
            contentKey="study_abroad_intro_desc"
            titleFallback={tStudyAbroad("overviewTitle")}
            contentFallback={tStudyAbroad("overviewContent")}
            sectionTag="Overview"
            editable={editable}
            onEditTitle={() => onEditConfig?.("study_abroad_intro_title")}
            onEditContent={() => onEditConfig?.("study_abroad_intro_desc")}
          />
          <FeaturedProgramSection
            sectionTag="Featured Program"
            sectionTitle={tStudyAbroad("germanFocusTitle")}
            fallbackTitle={tStudyAbroad("germanFocusName")}
            fallbackDesc={tStudyAbroad("germanFocusDesc")}
            fallbackFeatures={[
              tStudyAbroad("germanFocusF1"), tStudyAbroad("germanFocusF2"),
              tStudyAbroad("germanFocusF3"), tStudyAbroad("germanFocusF4"),
              tStudyAbroad("germanFocusF5"), tStudyAbroad("germanFocusF6"),
            ]}
            editable={editable}
            onEdit={() => onEditConfig?.("study_abroad_programs")}
          />
          <CardGridSection
            configKey="study_abroad_programs"
            sectionTag="Programs"
            sectionTitle={tStudyAbroad("programsTitle")}
            fallbackCards={fallbackPrograms}
            columns="md:grid-cols-2"
            bgColor="bg-white"
            cardType="program"
            editable={editable}
            onEdit={() => onEditConfig?.("study_abroad_programs")}
          />
        </>
      )
    }
    case "visa": {
      const fallbackSteps = [
        { title: tVisa("step1.title"), desc: tVisa("step1.desc") },
        { title: tVisa("step2.title"), desc: tVisa("step2.desc") },
        { title: tVisa("step3.title"), desc: tVisa("step3.desc") },
        { title: tVisa("step4.title"), desc: tVisa("step4.desc") },
        { title: tVisa("step5.title"), desc: tVisa("step5.desc") },
      ]
      const fallbackDocs = [
        tVisa("doc1"), tVisa("doc2"), tVisa("doc3"), tVisa("doc4"),
        tVisa("doc5"), tVisa("doc6"), tVisa("doc7"), tVisa("doc8"),
      ]
      const fallbackTimeline = [
        { title: tVisa("timeline1.title"), time: tVisa("timeline1.time"), desc: tVisa("timeline1.desc") },
        { title: tVisa("timeline2.title"), time: tVisa("timeline2.time"), desc: tVisa("timeline2.desc") },
        { title: tVisa("timeline3.title"), time: tVisa("timeline3.time"), desc: tVisa("timeline3.desc") },
      ]
      const fallbackTips = [
        tVisa("tip1"), tVisa("tip2"), tVisa("tip3"), tVisa("tip4"), tVisa("tip5"),
      ]
      return (
        <>
          <StepListSection
            configKey="visa_process_steps"
            sectionTag="Process"
            sectionTitle={tVisa("processTitle")}
            fallbackSteps={fallbackSteps}
            editable={editable}
            onEdit={() => onEditConfig?.("visa_process_steps")}
          />
          <DocListSection
            configKey="visa_required_docs"
            sectionTag="Documents"
            sectionTitle={tVisa("docsTitle")}
            fallbackDocs={fallbackDocs}
            bgColor="bg-gray-50"
            editable={editable}
            onEdit={() => onEditConfig?.("visa_required_docs")}
          />
          <CardGridSection
            configKey="visa_timeline"
            sectionTag="Timeline"
            sectionTitle={tVisa("timelineTitle")}
            fallbackCards={fallbackTimeline}
            columns="md:grid-cols-3"
            editable={editable}
            onEdit={() => onEditConfig?.("visa_timeline")}
            cardType="timeline"
          />
          <DocListSection
            configKey="visa_tips"
            sectionTag="Tips"
            sectionTitle={tVisa("tipsTitle")}
            fallbackDocs={fallbackTips}
            iconName="AlertTriangle"
            bgColor="bg-gray-50"
            editable={editable}
            onEdit={() => onEditConfig?.("visa_tips")}
          />
        </>
      )
    }
    case "requirements": {
      const fallbackCountries = [
        {
          label: tRequirements("germany.title"),
          items: [
            tRequirements("germany.r1"),
            tRequirements("germany.r2"),
            tRequirements("germany.r3"),
            tRequirements("germany.r4"),
          ],
        },
        {
          label: tRequirements("japan.title"),
          items: [
            tRequirements("japan.r1"),
            tRequirements("japan.r2"),
            tRequirements("japan.r3"),
          ],
        },
        {
          label: tRequirements("singapore.title"),
          items: [
            tRequirements("singapore.r1"),
            tRequirements("singapore.r2"),
            tRequirements("singapore.r3"),
          ],
        },
      ]
      const fallbackLanguages = [
        {
          title: tRequirements("langGerman.title"),
          desc: tRequirements("langGerman.desc"),
        },
        {
          title: tRequirements("langJapanese.title"),
          desc: tRequirements("langJapanese.desc"),
        },
      ]
      const fallbackDocs = [
        tRequirements("doc1"), tRequirements("doc2"), tRequirements("doc3"), tRequirements("doc4"),
        tRequirements("doc5"), tRequirements("doc6"), tRequirements("doc7"), tRequirements("doc8"),
      ]
      const fallbackSteps = [
        { title: tRequirements("step1.title"), desc: tRequirements("step1.desc") },
        { title: tRequirements("step2.title"), desc: tRequirements("step2.desc") },
        { title: tRequirements("step3.title"), desc: tRequirements("step3.desc") },
        { title: tRequirements("step4.title"), desc: tRequirements("step4.desc") },
        { title: tRequirements("step5.title"), desc: tRequirements("step5.desc") },
        { title: tRequirements("step6.title"), desc: tRequirements("step6.desc") },
      ]
      return (
        <>
          <CountryRequirementsSection
            configKey="requirements_countries"
            sectionTag="Requirements"
            sectionTitle={tRequirements("overviewTitle")}
            labelKey="country"
            fallbackData={fallbackCountries}
            editable={editable}
            onEdit={() => onEditConfig?.("requirements_countries")}
          />
          <CardGridSection
            configKey="requirements_languages"
            sectionTag="Language"
            sectionTitle={tRequirements("langTitle")}
            fallbackCards={fallbackLanguages}
            columns="md:grid-cols-2"
            bgColor="bg-gray-50"
            editable={editable}
            onEdit={() => onEditConfig?.("requirements_languages")}
            cardType="language"
          />
          <DocListSection
            configKey="requirements_docs"
            sectionTag="Documents"
            sectionTitle={tRequirements("docsTitle")}
            fallbackDocs={fallbackDocs}
            editable={editable}
            onEdit={() => onEditConfig?.("requirements_docs")}
          />
          <StepListSection
            configKey="requirements_steps"
            sectionTag="Timeline"
            sectionTitle={tRequirements("timelineTitle")}
            fallbackSteps={fallbackSteps}
            bgColor="bg-gray-50"
            editable={editable}
            onEdit={() => onEditConfig?.("requirements_steps")}
          />
        </>
      )
    }
    case "life": {
      const fallbackGuideCards = [
        { icon: "Home", title: tLife("housing.title"), desc: tLife("housing.desc") },
        { icon: "Bus", title: tLife("transport.title"), desc: tLife("transport.desc") },
        { icon: "UtensilsCrossed", title: tLife("food.title"), desc: tLife("food.desc") },
        { icon: "Palette", title: tLife("culture.title"), desc: tLife("culture.desc") },
      ]
      const fallbackCityCards = [
        { city: tLife("munich.name"), country: "德国", desc: tLife("munich.desc"), image_id: null },
        { city: tLife("berlin.name"), country: "德国", desc: tLife("berlin.desc"), image_id: null },
        { city: tLife("hamburg.name"), country: "德国", desc: tLife("hamburg.desc"), image_id: null },
      ]
      return (
        <>
          <PageIntroSection
            titleKey="life_intro_title"
            contentKey="life_intro_desc"
            titleFallback={tLife("guideTitle")}
            contentFallback={tLife("guideIntro")}
            sectionTag="Living Guide"
            editable={editable}
            onEditTitle={() => onEditConfig?.("life_intro_title")}
            onEditContent={() => onEditConfig?.("life_intro_desc")}
          />
          <CardGridSection
            configKey="life_guide_cards"
            sectionTag="Daily Life"
            sectionTitle="生活板块"
            fallbackCards={fallbackGuideCards}
            columns="md:grid-cols-2"
            bgColor="bg-gray-50"
            editable={editable}
            onEdit={() => onEditConfig?.("life_guide_cards")}
            cardType="guide"
          />
          <CardGridSection
            configKey="life_city_cards"
            sectionTag="City Guides"
            sectionTitle={tLife("cityTitle")}
            fallbackCards={fallbackCityCards}
            columns="md:grid-cols-3"
            editable={editable}
            onEdit={() => onEditConfig?.("life_city_cards")}
            cardType="city"
          />
        </>
      )
    }
    case "news":
      return (
        <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Latest Updates
            </h2>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">{title}</h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
        </section>
      )
    default:
      return null
  }
}
