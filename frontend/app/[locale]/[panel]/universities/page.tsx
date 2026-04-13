"use client"

/**
 * 院校管理页面。
 * 展示院校列表，支持新增/编辑/删除院校。
 */

import { useTranslations } from "next-intl"
import { UniversityTable } from "@/components/admin/UniversityTable"

/** 院校管理页面 */
export default function AdminUniversitiesPage() {
  const t = useTranslations("Admin")

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("universityManagement")}</h1>
      <UniversityTable />
    </div>
  )
}
