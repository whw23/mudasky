"use client"

/**
 * 文章管理页面（仅 admin）。
 * 展示所有文章列表，支持创建/编辑/发布/删除。
 */

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArticleTable } from "@/components/admin/ArticleTable"
import { ArticleEditor } from "@/components/user/ArticleEditor"
import type { Article } from "@/types"

/** 文章管理页面 */
export default function AdminArticlesPage() {
  const t = useTranslations("Admin")
  const tArticle = useTranslations("UserArticles")

  const [editing, setEditing] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  /** 开始创建新文章 */
  function handleCreate(): void {
    setEditingArticle(null)
    setEditing(true)
  }

  /** 开始编辑文章 */
  function handleEdit(article: Article): void {
    setEditingArticle(article)
    setEditing(true)
  }

  /** 保存完成后返回列表 */
  function handleSaved(): void {
    setEditing(false)
    setEditingArticle(null)
    setRefreshKey((k) => k + 1)
  }

  if (editing) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">
          {tArticle(editingArticle ? "editArticle" : "createArticle")}
        </h1>
        <ArticleEditor
          article={editingArticle}
          apiPrefix="/admin/content"
          onSave={handleSaved}
          onCancel={() => { setEditing(false); setEditingArticle(null) }}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("articleManagement")}</h1>
        <Button onClick={handleCreate}>{tArticle("createArticle")}</Button>
      </div>
      <ArticleTable onEdit={handleEdit} refreshKey={refreshKey} />
    </div>
  )
}
