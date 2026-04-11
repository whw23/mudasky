"use client"

/**
 * 管理员成功案例列表组件。
 * 包含创建、编辑、推荐切换、删除功能。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/common/Pagination"
import { CaseDialog } from "@/components/admin/CaseDialog"
import api from "@/lib/api"
import type { SuccessCase, PaginatedResponse } from "@/types"

/** 管理员成功案例列表 */
export function CaseTable() {
  const t = useTranslations("AdminCases")

  const [cases, setCases] = useState<SuccessCase[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<SuccessCase | null>(null)

  /** 获取案例列表 */
  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<PaginatedResponse<SuccessCase>>(
        "/admin/case/list",
        { params: { page, page_size: 20 } },
      )
      setCases(data.items)
      setTotal(data.total)
      setTotalPages(data.total_pages)
    } catch {
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  /** 打开创建对话框 */
  const handleCreate = () => {
    setEditingCase(null)
    setDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (c: SuccessCase) => {
    setEditingCase(c)
    setDialogOpen(true)
  }

  /** 切换推荐状态 */
  const toggleFeatured = async (c: SuccessCase) => {
    try {
      await api.post(`/admin/case/edit/${c.id}`, {
        is_featured: !c.is_featured,
      })
      toast.success(t(c.is_featured ? "unfeaturedSuccess" : "featuredSuccess"))
      fetchCases()
    } catch {
      toast.error(t("operationError"))
    }
  }

  /** 删除案例 */
  const handleDelete = async (c: SuccessCase) => {
    if (!confirm(t("deleteConfirm", { name: c.student_name }))) return
    try {
      await api.post(`/admin/case/delete/${c.id}`)
      toast.success(t("deleteSuccess"))
      fetchCases()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 对话框保存后回调 */
  const handleDialogSave = () => {
    setDialogOpen(false)
    fetchCases()
  }

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t("totalCount", { count: total })}
        </span>
        <Button onClick={handleCreate}>{t("createCase")}</Button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("col_name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_university")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_program")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_year")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_featured")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("loading")}
                </td>
              </tr>
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              cases.map((c) => (
                <tr key={c.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.student_name}</td>
                  <td className="px-4 py-3">{c.university}</td>
                  <td className="px-4 py-3">{c.program}</td>
                  <td className="px-4 py-3">{c.year}</td>
                  <td className="px-4 py-3">
                    {c.is_featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        {t("featured")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
                        {t("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleFeatured(c)}>
                        {t(c.is_featured ? "unfeatured" : "setFeatured")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
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
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 创建/编辑对话框 */}
      <CaseDialog
        successCase={editingCase}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleDialogSave}
      />
    </div>
  )
}
