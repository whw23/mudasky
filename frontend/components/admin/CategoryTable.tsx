"use client"

/**
 * 分类管理列表组件。
 * 包含分类表格、创建/编辑对话框和删除确认。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CategoryDialog } from "@/components/admin/CategoryDialog"
import api from "@/lib/api"
import { usePathname } from "@/i18n/navigation"
import type { Category } from "@/types"

/** 分类管理列表 */
export function CategoryTable() {
  const t = useTranslations("AdminCategories")
  const pathname = usePathname()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  /** 获取分类列表 */
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Category[]>(`${pathname}/list`)
      setCategories(data)
    } catch {
      toast.error(t("fetchError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  /** 打开创建对话框 */
  const handleCreate = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  /** 删除分类 */
  const handleDelete = async (category: Category) => {
    if (!confirm(t("deleteConfirm", { name: category.name }))) return
    try {
      await api.post(`${pathname}/list/detail/delete`, { category_id: category.id })
      toast.success(t("deleteSuccess"))
      fetchCategories()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 对话框保存后刷新列表 */
  const handleSaved = () => {
    setDialogOpen(false)
    fetchCategories()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>{t("createCategory")}</Button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("col_name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_slug")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_articleCount")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("col_sortOrder")}</th>
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
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-b transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-3">{cat.article_count}</td>
                  <td className="px-4 py-3">{cat.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                        {t("edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cat)}>
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

      <CategoryDialog
        category={editingCategory}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaved}
      />
    </div>
  )
}
