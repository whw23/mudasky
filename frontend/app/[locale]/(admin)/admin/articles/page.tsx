"use client"

/**
 * 文章管理页面。
 * 展示所有文章列表，支持发布/取消发布、置顶、删除。
 */

import { useTranslations } from "next-intl"
import { ArticleTable } from "@/components/admin/ArticleTable"

/** 文章管理页面 */
export default function AdminArticlesPage() {
  const t = useTranslations("Admin")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("articleManagement")}</h1>
      <ArticleTable />
    </div>
  )
}
