"use client"

/**
 * 用户文章页面。
 * 展示用户的文章列表和文章编辑器。
 */

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArticleList } from "@/components/user/ArticleList"
import { ArticleEditor } from "@/components/user/ArticleEditor"
import type { Article } from "@/types"

/** 用户文章页面 */
export default function UserArticlesPage() {
  const t = useTranslations("UserArticles")
  const [editing, setEditing] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  /** 开始创建新文章 */
  const handleCreate = () => {
    setEditingArticle(null)
    setEditing(true)
  }

  /** 开始编辑文章 */
  const handleEdit = (article: Article) => {
    setEditingArticle(article)
    setEditing(true)
  }

  /** 保存完成后返回列表 */
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
          {t(editingArticle ? "editArticle" : "createArticle")}
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
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={handleCreate}>{t("createArticle")}</Button>
      </div>
      <ArticleList onEdit={handleEdit} refreshKey={refreshKey} />
    </div>
  )
}
