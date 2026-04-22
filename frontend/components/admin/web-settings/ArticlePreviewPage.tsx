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
import { StudyAbroadIntro } from "@/components/study-abroad/StudyAbroadIntro"
import { VisaIntro } from "@/components/visa/VisaIntro"
import { RequirementsIntro } from "@/components/requirements/RequirementsIntro"
import { LifeIntro } from "@/components/life/LifeIntro"

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

interface ArticlePreviewPageProps {
  categorySlug: string
  onBannerEdit: (pageKey: string) => void
}

/** 文章预览页面 */
export function ArticlePreviewPage({
  categorySlug,
  onBannerEdit,
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
      <IntroSection slug={categorySlug} title={t("title")} />

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
      <CtaSection translationNamespace="News" />

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
function IntroSection({ slug, title }: { slug: string; title: string }) {
  switch (slug) {
    case "study-abroad":
      return <StudyAbroadIntro />
    case "visa":
      return <VisaIntro />
    case "requirements":
      return <RequirementsIntro />
    case "life":
      return <LifeIntro />
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
