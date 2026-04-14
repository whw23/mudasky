"use client"

/**
 * 文档列表组件。
 * 桌面端表格展示，移动端卡片展示。支持下载和删除操作。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Download, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/common/Pagination"
import api from "@/lib/api"
import type { Document, DocumentCategory, DocumentListResponse } from "@/types"

/** 分类徽章颜色映射 */
const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  transcript:
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  certificate:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  passport:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  language_test:
    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  application:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  other:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

interface DocumentListProps {
  category: string
  refreshKey: number
  onStorageUpdate: (used: number, quota: number) => void
}

/**
 * 格式化文件大小。
 * bytes -> KB / MB 显示。
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 文档列表 */
export function DocumentList({
  category,
  refreshKey,
  onStorageUpdate,
}: DocumentListProps) {
  const t = useTranslations("Documents")

  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  /** 获取文档列表 */
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<DocumentListResponse>("/portal/documents/list", {
        params: { page, page_size: 20 },
      })
      /* 前端过滤分类（后端无分类筛选参数） */
      const filtered =
        category === "all"
          ? data.items
          : data.items.filter((d) => d.category === category)
      setDocuments(filtered)
      setTotal(category === "all" ? data.total : filtered.length)
      setTotalPages(
        category === "all"
          ? data.total_pages
          : Math.max(1, Math.ceil(filtered.length / 20)),
      )
      onStorageUpdate(data.storage_used, data.storage_quota)
    } catch {
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [page, category, onStorageUpdate])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments, refreshKey])

  /** 下载文档 */
  const handleDownload = (doc: Document) => {
    window.open(`/api/portal/documents/list/detail/download?doc_id=${doc.id}`, "_blank")
  }

  /** 删除文档 */
  const handleDelete = async (doc: Document) => {
    if (!confirm(t("deleteConfirm"))) return
    try {
      await api.post('/portal/documents/list/detail/delete', { doc_id: doc.id })
      toast.success(t("deleteSuccess"))
      fetchDocuments()
    } catch {
      toast.error(t("uploadError"))
    }
  }

  /** 格式化日期 */
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString()
  }

  /* 空状态 */
  if (!loading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="mb-4 size-12" />
        <p>{t("noDocuments")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 桌面端表格 */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">
                {t("fileName")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("category")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("fileSize")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("uploadDate")}
              </th>
              <th className="px-4 py-3 text-left font-medium">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("uploading").replace("...", "")}...
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="max-w-xs truncate px-4 py-3 font-medium">
                    {doc.original_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_COLORS[doc.category]}`}
                    >
                      {t(doc.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="mr-1 size-4" />
                        {t("download")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="mr-1 size-4" />
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

      {/* 移动端卡片 */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">
            {t("uploading").replace("...", "")}...
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="mb-2 flex items-start justify-between">
                <p className="max-w-[70%] truncate text-sm font-medium">
                  {doc.original_name}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${CATEGORY_COLORS[doc.category]}`}
                >
                  {t(doc.category)}
                </span>
              </div>
              <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="mr-1 size-4" />
                  {t("download")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(doc)}
                >
                  <Trash2 className="mr-1 size-4" />
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} {t("title")}
          </span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
