"use client"

/**
 * 文章列表预览组件。
 * 根据分类 slug 获取文章列表，支持增删改操作。
 */

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArticleEditDialog } from "./ArticleEditDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

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

interface ArticleListPreviewProps {
  categorySlug: string
}

/** 文章列表预览 */
export function ArticleListPreview({ categorySlug }: ArticleListPreviewProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editArticle, setEditArticle] = useState<Article | null>(null)

  /* 删除弹窗状态 */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)

  /** 加载分类和文章数据 */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const catRes = await api.get("/admin/web-settings/categories/list")
      const categories: Category[] = catRes.data ?? []
      const cat = categories.find((c) => c.slug === categorySlug)
      if (!cat) {
        setCategoryId(null)
        setArticles([])
        return
      }
      setCategoryId(cat.id)

      const artRes = await api.get("/admin/web-settings/articles/list", {
        params: { page: 1, page_size: 200 },
      })
      const allArticles: Article[] = artRes.data.items ?? []
      setArticles(allArticles.filter((a) => a.category_id === cat.id))
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [categorySlug])

  useEffect(() => { fetchData() }, [fetchData])

  /** 打开新建弹窗 */
  function handleCreate(): void {
    setEditArticle(null)
    setEditOpen(true)
  }

  /** 打开编辑弹窗 */
  function handleEdit(article: Article): void {
    setEditArticle(article)
    setEditOpen(true)
  }

  /** 打开删除弹窗 */
  function handleDelete(article: Article): void {
    setDeleteTarget(article)
    setDeleteOpen(true)
  }

  /** 状态标签样式 */
  function statusBadge(status: string): string {
    return status === "published"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* 顶部操作栏 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">文章管理</h3>
          <Button size="sm" onClick={handleCreate} disabled={!categoryId}>
            <Plus className="mr-1 size-4" />
            写文章
          </Button>
        </div>

        {/* 文章列表 */}
        {loading ? (
          <p className="text-center text-muted-foreground">加载中...</p>
        ) : articles.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">暂无文章</p>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-medium">{a.title}</h4>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(a.status)}`}>
                      {a.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(a.published_at ?? a.created_at).slice(0, 10)}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(a)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(a)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {categoryId && (
        <ArticleEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          article={editArticle}
          categoryId={categoryId}
          onSuccess={fetchData}
        />
      )}

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`删除文章「${deleteTarget?.title ?? ""}」`}
        description="此操作不可撤销，文章将被永久删除。"
        onConfirm={() =>
          api.post("/admin/web-settings/articles/list/detail/delete", {
            article_id: deleteTarget!.id,
          })
        }
        onSuccess={fetchData}
      />
    </div>
  )
}
