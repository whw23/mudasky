"use client"

/**
 * 文章编辑弹窗。
 * 用于创建和编辑文章，支持标题、slug、摘要、内容、状态等字段。
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

interface ArticleData {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  category_id: string
  status: string
}

interface ArticleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article: ArticleData | null
  categoryId: string
  onSuccess: () => void
}

/** 文章编辑弹窗 */
export function ArticleEditDialog({
  open,
  onOpenChange,
  article,
  categoryId,
  onSuccess,
}: ArticleEditDialogProps) {
  const isEdit = !!article

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("draft")
  const [saving, setSaving] = useState(false)

  /** 打开时初始化表单 */
  useEffect(() => {
    if (open && article) {
      setTitle(article.title)
      setSlug(article.slug)
      setExcerpt(article.excerpt)
      setContent(article.content)
      setStatus(article.status)
    } else if (open && !article) {
      setTitle("")
      setSlug("")
      setExcerpt("")
      setContent("")
      setStatus("draft")
    }
  }, [open, article])

  /** 提交表单 */
  async function handleSubmit(): Promise<void> {
    const trimmedTitle = title.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedTitle || !trimmedSlug) {
      toast.error("标题和 slug 不能为空")
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.post("/admin/web-settings/articles/list/detail/edit", {
          article_id: article.id,
          title: trimmedTitle,
          slug: trimmedSlug,
          excerpt: excerpt.trim(),
          content,
          status,
        })
        toast.success("文章已更新")
      } else {
        await api.post("/admin/web-settings/articles/list/create", {
          title: trimmedTitle,
          slug: trimmedSlug,
          excerpt: excerpt.trim(),
          content,
          category_id: categoryId,
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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑文章" : "写文章"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
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
            <div className="space-y-1.5">
              <Label htmlFor="article-slug">Slug</Label>
              <Input
                id="article-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
              />
            </div>
          </div>
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
          <div className="space-y-1.5">
            <Label htmlFor="article-content">内容</Label>
            <Textarea
              id="article-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Markdown 正文"
              rows={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label>状态</Label>
            <Select value={status} onValueChange={(v) => setStatus(v ?? "draft")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
              </SelectContent>
            </Select>
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
