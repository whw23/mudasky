"use client"

/**
 * 文章编辑器组件。
 * 支持 Markdown 编辑和文件上传（Office/PDF）两种模式。
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownEditor } from "@/components/editor/MarkdownEditor"
import api from "@/lib/api"
import type { Article, Category } from "@/types"

/** 允许上传的文件类型 */
const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"

interface ArticleEditorProps {
  article: Article | null
  apiPrefix?: string
  onSave: () => void
  onCancel: () => void
}

/** 文章编辑器 */
export function ArticleEditor({ article, apiPrefix = "/portal/articles", onSave, onCancel }: ArticleEditorProps) {
  const t = useTranslations("UserArticles")
  const isEdit = !!article

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [contentType, setContentType] = useState<"markdown" | "file">("markdown")
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 获取分类列表 */
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get<Category[]>("/public/content/categories")
      setCategories(data)
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
      setContentType(article.content_type || "markdown")
      setFileUrl(article.file_url)
      if (article.file_url) {
        setFileName(article.file_url.split("/").pop() || "")
      }
      setCategoryId(article.category_id)
    } else {
      setTitle("")
      setSlug("")
      setExcerpt("")
      setContent("")
      setContentType("markdown")
      setFileUrl(null)
      setFileName("")
    }
  }, [article, fetchCategories])

  /** 从标题自动生成 slug */
  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 200)
  }

  /** 标题变化时自动更新 slug（仅创建时） */
  function handleTitleChange(value: string): void {
    setTitle(value)
    if (!isEdit) {
      setSlug(generateSlug(value))
    }
  }

  /** 上传文件 */
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", "application")
      const { data } = await api.post("/portal/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setFileUrl(`/api/portal/documents/download/${data.id}`)
      setFileName(file.name)
      toast.success(t("fileUploaded"))
    } catch {
      toast.error(t("fileUploadError"))
    } finally {
      setUploading(false)
    }
  }

  /** 保存文章 */
  async function handleSave(status: "draft" | "published"): Promise<void> {
    if (!title.trim()) {
      toast.error(t("titleRequired"))
      return
    }
    if (!categoryId) {
      toast.error(t("categoryRequired"))
      return
    }
    if (contentType === "file" && !fileUrl) {
      toast.error(t("fileRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = {
        title,
        slug: slug || generateSlug(title),
        excerpt,
        content_type: contentType,
        content: contentType === "markdown" ? content : "",
        file_url: contentType === "file" ? fileUrl : null,
        category_id: categoryId,
        status,
      }
      if (isEdit) {
        await api.post(`${apiPrefix}/edit/${article.id}`, payload)
      } else {
        await api.post(`${apiPrefix}/create`, payload)
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

      {/* 内容类型切换 */}
      <div className="space-y-2">
        <Label>{t("contentTypeLabel")}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={contentType === "markdown" ? "default" : "outline"}
            size="sm"
            onClick={() => setContentType("markdown")}
          >
            <FileText className="mr-1 size-4" />
            Markdown
          </Button>
          <Button
            type="button"
            variant={contentType === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => setContentType("file")}
          >
            <Upload className="mr-1 size-4" />
            {t("fileUpload")}
          </Button>
        </div>
      </div>

      {/* 正文编辑器 或 文件上传 */}
      {contentType === "markdown" ? (
        <div className="space-y-1">
          <Label>{t("contentLabel")}</Label>
          <MarkdownEditor content={content} onChange={setContent} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{t("fileLabel")}</Label>
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            {fileUrl ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="size-5 text-green-600" />
                <span className="text-sm font-medium">{fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("reupload")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("fileHint")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? t("uploading") : t("selectFile")}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("supportedFormats")}</p>
        </div>
      )}

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
