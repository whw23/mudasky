"use client"

/**
 * 文章列表区块。
 * 从 options.categorySlug 读取分类参数，调用 ArticleListClient。
 * editable 模式下显示管理工具栏并支持文章 CRUD。
 */

import { useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import type { Block } from "@/types/block"
import { ArticleListClient } from "@/components/public/ArticleListClient"
import { ManageToolbar } from "@/components/admin/web-settings/ManageToolbar"
import { ArticleEditDialog } from "@/components/admin/web-settings/ArticleEditDialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"

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
  cover_image: string | null
  category_id: string
  status: string
  published_at: string | null
  created_at: string
}

/** 导入预览表格列 */
const IMPORT_COLUMNS = [
  { key: "title", label: "标题" },
  { key: "slug", label: "URL 标识" },
  { key: "status", label: "状态" },
]

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  blockLabel?: string
}

/** 文章列表区块 */
export function ArticleListBlock({ block, header, bg, editable, blockLabel }: BlockProps) {
  const categorySlug = block.options?.categorySlug as string | undefined

  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<Article | null>(null)

  /* 导入预览状态 */
  const [previewData, setPreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  /* 分类 ID（由 slug 解析，用于导入导出） */
  const [categoryId, setCategoryId] = useState<string | null>(null)

  /* 刷新标记 */
  const [refreshKey, setRefreshKey] = useState(0)

  /** slug -> categoryId 解析 */
  useEffect(() => {
    if (!editable || !categorySlug) return
    api
      .get<Category[]>("/admin/web-settings/categories/list")
      .then(({ data }) => {
        const cat = (data ?? []).find((c) => c.slug === categorySlug)
        setCategoryId(cat?.id ?? null)
      })
      .catch(() => setCategoryId(null))
  }, [editable, categorySlug])

  /** 刷新数据 */
  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  /** 打开编辑弹窗（编辑已有文章） */
  function handleEditArticle(article: Article) {
    setEditItem(article)
    setEditOpen(true)
  }

  /** 打开新建弹窗 */
  function handleCreateArticle() {
    setEditItem(null)
    setEditOpen(true)
  }

  /** 确认导入 */
  async function handleImportConfirm(items: any[]) {
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
      <section className={`py-10 md:py-16 ${bg}`}>
        <div className="mx-auto max-w-7xl px-4">
          {header}

          {/* 管理工具栏（仅编辑模式，只含导入导出） */}
          {editable && categoryId && (
            <ManageToolbar>
              <ImportExportToolbar
                templateUrl="/admin/web-settings/articles/list/import/template"
                importUrl={`/admin/web-settings/articles/list/import/preview?category_id=${categoryId}`}
                exportUrl={`/admin/web-settings/articles/list/export?category_id=${categoryId}`}
                onImportPreview={setPreviewData}
                onFileSelect={setImportFile}
                templateFilename="articles_template.zip"
                exportFilename="articles.zip"
              />
            </ManageToolbar>
          )}

          <ArticleListClient
            key={refreshKey}
            categorySlug={categorySlug}
            editable={editable}
            onEdit={editable ? handleEditArticle : undefined}
          />

          {/* 写文章占位卡片（仅编辑模式） */}
          {editable && (
            <div className="mt-4">
              <button
                onClick={handleCreateArticle}
                className="group block w-full rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 opacity-50 transition-all hover:border-primary hover:opacity-80"
              >
                <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                  <Plus className="size-5" />
                  <span className="text-sm font-medium">写文章</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 编辑弹窗（放在 section 外部，避免事件冒泡） */}
      {editable && (
        <ArticleEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          article={editItem}
          categoryId={categoryId ?? undefined}
          onSuccess={refreshData}
        />
      )}

      {/* 导入预览弹窗 */}
      {editable && (
        <ImportPreviewDialog
          open={!!previewData}
          onOpenChange={(open) => !open && setPreviewData(null)}
          data={previewData}
          onConfirm={handleImportConfirm}
          columns={IMPORT_COLUMNS}
        />
      )}
    </>
  )
}
