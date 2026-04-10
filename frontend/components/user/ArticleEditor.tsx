"use client"

/**
 * 文章编辑器组件。
 * 支持创建和编辑文章，包含标题、分类选择、摘要和富文本编辑。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import api from "@/lib/api"
import type { Article, Category } from "@/types"

interface ArticleEditorProps {
  article: Article | null
  onSave: () => void
  onCancel: () => void
}

/** 文章编辑器 */
export function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
  const t = useTranslations("UserArticles")
  const isEdit = !!article

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)

  /** 获取分类列表 */
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get<Category[]>("/content/categories")
      setCategories(data)
      // 默认选中第一个分类
      if (!article && data.length > 0) {
        setCategoryId(data[0].id)
      }
    } catch {
      /* 忽略 */
    }
  }, [article])

  /** 初始化表单数据 */
  useEffect(() => {
    fetchCategories()
    if (article) {
      setTitle(article.title)
      setSlug(article.slug)
      setExcerpt(article.excerpt)
      setContent(article.content)
      setCategoryId(article.category_id)
    } else {
      setTitle("")
      setSlug("")
      setExcerpt("")
      setContent("")
    }
  }, [article, fetchCategories])

  /** 从标题自动生成 slug */
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 200)
  }

  /** 标题变化时自动更新 slug（仅创建时） */
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!isEdit) {
      setSlug(generateSlug(value))
    }
  }

  /** 保存文章 */
  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      toast.error(t("titleRequired"))
      return
    }
    if (!categoryId) {
      toast.error(t("categoryRequired"))
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/admin/content/articles/${article.id}`, {
          title,
          slug: slug || generateSlug(title),
          excerpt,
          content,
          category_id: categoryId,
          status,
        })
      } else {
        await api.post("/admin/content/articles", {
          title,
          slug: slug || generateSlug(title),
          excerpt,
          content,
          category_id: categoryId,
          status,
        })
      }
      toast.success(t(status === "published" ? "publishSuccess" : "saveSuccess"))
      onSave()
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="space-y-1">
        <Label>{t("titleLabel")}</Label>
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("titlePlaceholder")}
        />
      </div>

      {/* Slug */}
      <div className="space-y-1">
        <Label>{t("slugLabel")}</Label>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t("slugPlaceholder")}
          className="font-mono text-sm"
        />
      </div>

      {/* 分类选择 */}
      <div className="space-y-1">
        <Label>{t("categoryLabel")}</Label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 摘要 */}
      <div className="space-y-1">
        <Label>{t("excerptLabel")}</Label>
        <Input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder={t("excerptPlaceholder")}
        />
      </div>

      {/* 正文编辑器 */}
      <div className="space-y-1">
        <Label>{t("contentLabel")}</Label>
        <TiptapEditor content={content} onChange={setContent} />
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button variant="outline" disabled={saving} onClick={() => handleSave("draft")}>
          {t("saveDraft")}
        </Button>
        <Button disabled={saving} onClick={() => handleSave("published")}>
          {saving ? t("saving") : t("publishButton")}
        </Button>
      </div>
    </div>
  )
}
