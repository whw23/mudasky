"use client"

/**
 * 分类管理页面。
 * 展示分类列表，支持新增/编辑/删除分类。
 */

import { useTranslations } from "next-intl"
import { CategoryTable } from "@/components/admin/CategoryTable"

/** 分类管理页面 */
export default function AdminCategoriesPage() {
  const t = useTranslations("Admin")

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("categoryManagement")}</h1>
      <CategoryTable />
    </div>
  )
}
