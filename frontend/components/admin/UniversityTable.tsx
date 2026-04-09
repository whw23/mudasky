"use client"

/**
 * 合作院校管理列表组件。
 * 包含院校表格、创建/编辑对话框和删除确认。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UniversityDialog } from "@/components/admin/UniversityDialog"
import api from "@/lib/api"
import type { University } from "@/types"

/** 合作院校管理列表 */
export function UniversityTable() {
  const t = useTranslations("AdminUniversities")

  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)

  /** 获取院校列表 */
  const fetchUniversities = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ items: University[] }>(
        "/admin/universities",
        { params: { page_size: 100 } },
      )
      setUniversities(data.items)
    } catch {
      toast.error(t("fetchError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchUniversities()
  }, [fetchUniversities])

  /** 打开创建对话框 */
  const handleCreate = () => {
    setEditingUniversity(null)
    setDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (university: University) => {
    setEditingUniversity(university)
    setDialogOpen(true)
  }

  /** 删除院校 */
  const handleDelete = async (university: University) => {
    if (!confirm(t("deleteConfirm", { name: university.name }))) return
    try {
      await api.delete(`/admin/universities/${university.id}`)
      toast.success(t("deleteSuccess"))
      fetchUniversities()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 对话框保存后刷新列表 */
  const handleSaved = () => {
    setDialogOpen(false)
    fetchUniversities()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>{t("createUniversity")}</Button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("col_name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_country")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_city")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_featured")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_sortOrder")}</th>
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
            ) : universities.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              universities.map((uni) => (
                <tr key={uni.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{uni.name}</td>
                  <td className="px-4 py-3">{uni.country}</td>
                  <td className="px-4 py-3">{uni.city}</td>
                  <td className="px-4 py-3">
                    {uni.is_featured && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t("featured")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{uni.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(uni)}>
                        {t("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(uni)}>
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

      <UniversityDialog
        university={editingUniversity}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaved}
      />
    </div>
  )
}
