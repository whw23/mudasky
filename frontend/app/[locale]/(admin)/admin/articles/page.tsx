"use client"

/**
 * 文章管理页面。
 * 展示文章列表（支持筛选/发布/置顶/删除）和文章编辑器（创建/编辑）。
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
  const ta = useTranslations("AdminArticles")
  const [editing, setEditing] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  /** 创建新文章 */
  const handleCreate = () => {
    setEditingArticle(null)
    setEditing(true)
  }

  /** 编辑文章 */
  const handleEdit = (article: Article) => {
    setEditingArticle(article)
    setEditing(true)
  }

  /** 保存完成 */
  const handleSaved = () => {
    setEditing(false)
    setEditingArticle(null)
    setRefreshKey((k) => k + 1)
  }

  /** 取消编辑 */
  const handleCancel = () => {
    setEditing(false)
    setEditingArticle(null)
  }

  if (editing) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">
          {ta(editingArticle ? "editArticle" : "createArticle")}
        </h1>
        <ArticleEditor
          article={editingArticle}
          onSave={handleSaved}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("articleManagement")}</h1>
        <Button onClick={handleCreate}>{ta("createArticle")}</Button>
      </div>
      <ArticleTable onEdit={handleEdit} refreshKey={refreshKey} />
    </div>
  )
}
