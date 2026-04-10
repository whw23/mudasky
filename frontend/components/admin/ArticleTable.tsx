"use client"

/**
 * 管理员文章列表组件。
 * 包含状态筛选、发布/取消发布、置顶、删除功能。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination } from "@/components/common/Pagination"
import api from "@/lib/api"
import type { Article, PaginatedResponse } from "@/types"

/** 状态筛选选项 */
const STATUS_OPTIONS = ["all", "draft", "published"] as const

interface ArticleTableProps {
  onEdit?: (article: Article) => void
  refreshKey?: number
}

/** 管理员文章列表 */
export function ArticleTable({ onEdit, refreshKey }: ArticleTableProps) {
  const t = useTranslations("AdminArticles")

  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)

  /** 筛选变化时重置页码 */
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  /** 获取文章列表 */
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, page_size: 20 }
      if (statusFilter !== "all") params.status_filter = statusFilter
      const { data } = await api.get<PaginatedResponse<Article>>(
        "/admin/content/articles",
        { params },
      )
      setArticles(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles, refreshKey])

  /** 切换发布状态 */
  const togglePublish = async (article: Article) => {
    const newStatus = article.status === "published" ? "draft" : "published"
    try {
      await api.patch(`/admin/content/articles/${article.id}`, {
        status: newStatus,
      })
      toast.success(t(newStatus === "published" ? "publishSuccess" : "unpublishSuccess"))
      fetchArticles()
    } catch {
      toast.error(t("operationError"))
    }
  }

  /** 切换置顶 */
  const togglePin = async (article: Article) => {
    try {
      await api.patch(`/admin/content/articles/${article.id}`, {
        is_pinned: !article.is_pinned,
      })
      toast.success(t(article.is_pinned ? "unpinSuccess" : "pinSuccess"))
      fetchArticles()
    } catch {
      toast.error(t("operationError"))
    }
  }

  /** 删除文章 */
  const handleDelete = async (article: Article) => {
    if (!confirm(t("deleteConfirm", { title: article.title }))) return
    try {
      await api.delete(`/admin/content/articles/${article.id}`)
      toast.success(t("deleteSuccess"))
      fetchArticles()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 格式化日期 */
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* 状态筛选 */}
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            {STATUS_OPTIONS.map((s) => (
              <TabsTrigger key={s} value={s}>
                {t(`status_${s}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("col_title")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_status")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_pinned")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_date")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("loading")}
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="max-w-xs truncate px-4 py-3 font-medium">{article.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        article.status === "published"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      }`}
                    >
                      {t(`status_${article.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {article.is_pinned && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {t("pinned")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(article.published_at ?? article.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(article)}>
                          {t("edit")}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => togglePublish(article)}>
                        {t(article.status === "published" ? "unpublish" : "publish")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => togglePin(article)}>
                        {t(article.is_pinned ? "unpin" : "pin")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(article)}>
                        {t("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("totalCount", { count: total })}
          </span>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
