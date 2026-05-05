"use client"

/**
 * 文章编辑弹窗。
 * 用于创建和编辑文章，支持标题、摘要、封面图、内容、分类、状态等字段。
 * categoryId 有值时分类锁定不可改，为空时可选择分类。
 */

import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { ImageUploadField } from "@/components/admin/ImageUploadField"

interface ArticleData {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image?: string | null
  category_id: string
  status: string
  is_pinned?: boolean
  content_type?: string
  file_id?: string | null
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ArticleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: ArticleData | null
  /** 固定分类 ID（有值时锁定不可改，为空时可选择） */
  categoryId?: string
  onSuccess: () => void
}

/** 从 cover_image URL 提取 image ID */
function extractImageId(url: string | null | undefined): string {
  if (!url) return ""
  const match = url.match(/[?&]id=([^&]+)/)
  return match?.[1] ?? ""
}

/** 将 image ID 转为 cover_image URL */
function toImageUrl(imageId: string): string | null {
  return imageId ? `/api/public/images/detail?id=${imageId}` : null
}

/** 文章编辑弹窗 */
export function ArticleEditDialog({
  open,
  onOpenChange,
  article,
  categoryId: fixedCategoryId,
  onSuccess,
}: ArticleEditDialogProps) {
  const isEdit = !!article
  const categoryLocked = !!fixedCategoryId

  const [title, setTitle] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("draft")
  const [contentType, setContentType] = useState<"html" | "file">("html")
  const [fileId, setFileId] = useState<string | null>(null)
  const [coverImageId, setCoverImageId] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  /** 加载分类列表（仅非锁定模式） */
  useEffect(() => {
    if (categoryLocked) return
    api.get<Category[]>("/admin/web-settings/categories/list")
      .then(({ data }) => setCategories(data ?? []))
      .catch(() => setCategories([]))
  }, [categoryLocked])

  /** 打开时初始化表单 */
  useEffect(() => {
    if (!open) return
    if (article) {
      setTitle(article.title)
      setExcerpt(article.excerpt)
      setContent(article.content)
      setStatus(article.status)
      setContentType((article.content_type as "html" | "file") || "html")
      setFileId(article.file_id || null)
      setCoverImageId(extractImageId(article.cover_image) || "")
      setIsPinned(article.is_pinned ?? false)
      setSelectedCategoryId(article.category_id)
    } else {
      setTitle("")
      setExcerpt("")
      setContent("")
      setStatus("draft")
      setContentType("html")
      setFileId(null)
      setCoverImageId("")
      setIsPinned(false)
      setSelectedCategoryId(fixedCategoryId || "")
    }
  }, [open, article, fixedCategoryId])

  const effectiveCategoryId = fixedCategoryId || selectedCategoryId

  /** PDF 上传处理 */
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("仅支持 PDF 格式")
      return
    }
    if (!isEdit || !article) {
      toast.error("请先保存文章再上传 PDF")
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await api.post(
        `/admin/web-settings/articles/list/detail/upload-pdf?article_id=${article.id}`,
        form
      )
      setFileId(res.data.file_id)
      toast.success("PDF 上传成功")
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
    }
  }

  /** 提交表单 */
  async function handleSubmit(): Promise<void> {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error("标题不能为空")
      return
    }
    if (!effectiveCategoryId) {
      toast.error("请选择分类")
      return
    }

    setSaving(true)
    try {
      const coverImage = toImageUrl(coverImageId)
      if (isEdit) {
        await api.post("/admin/web-settings/articles/list/detail/edit", {
          article_id: article.id,
          title: trimmedTitle,
          excerpt: excerpt.trim(),
          content_type: contentType,
          content: contentType === "html" ? content : "",
          file_id: contentType === "file" ? fileId : null,
          cover_image: coverImage,
          is_pinned: isPinned,
          status,
        })
        toast.success("文章已更新")
      } else {
        await api.post("/admin/web-settings/articles/list/create", {
          title: trimmedTitle,
          excerpt: excerpt.trim(),
          content_type: contentType,
          content: contentType === "html" ? content : "",
          file_id: contentType === "file" ? fileId : null,
          cover_image: coverImage,
          category_id: effectiveCategoryId,
          is_pinned: isPinned,
          status,
        })
        toast.success("文章已创建")
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error(isEdit ? "更新失败" : "创建失败")
    } finally {
      setSaving(false)
    }
  }

  /** 获取锁定分类的名称 */
  function getLockedCategoryName(): string {
    if (article) {
      const cat = categories.find((c) => c.id === article.category_id)
      if (cat) return cat.name
    }
    return "已指定"
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑文章" : "写文章"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="article-title">标题</Label>
              <Input
                id="article-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="文章标题"
              />
            </div>
            <ImageUploadField
              label="封面图"
              imageId={coverImageId}
              onChange={setCoverImageId}
            />
          </div>

          {/* 分类选择（锁定模式显示禁用下拉） */}
          {!categoryLocked && !isEdit && (
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="article-excerpt">摘要</Label>
            <Textarea
              id="article-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="文章摘要"
              rows={2}
            />
          </div>

          {/* 内容类型切换 */}
          <div className="space-y-1.5">
            <Label>内容类型</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="html"
                  checked={contentType === "html"}
                  onChange={() => setContentType("html")}
                />
                富文本
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="file"
                  checked={contentType === "file"}
                  onChange={() => setContentType("file")}
                />
                PDF 文件
              </label>
            </div>
          </div>

          {/* 条件渲染 */}
          {contentType === "html" ? (
            <div className="space-y-1.5">
              <Label>正文</Label>
              <TiptapEditor
                content={content}
                onChange={(html) => setContent(html)}
                placeholder="文章正文"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>PDF 文件</Label>
              {fileId ? (
                <div className="flex items-center gap-2 rounded border p-3">
                  <span className="text-sm text-muted-foreground">已上传 PDF</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFileId(null)}
                  >
                    重新上传
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed p-6 text-center">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    id="pdf-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer text-sm text-muted-foreground hover:text-primary"
                  >
                    {uploading ? "上传中..." : "点击上传 PDF 文件"}
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={status === "published"}
                onChange={(e) => setStatus(e.target.checked ? "published" : "draft")}
                className="size-4 rounded border-gray-300"
              />
              发布
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              置顶
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
