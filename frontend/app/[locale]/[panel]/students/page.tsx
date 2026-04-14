"use client"

/**
 * 学生管理页面。
 * 展示学生列表，支持按顾问筛选。
 */

import { useTranslations } from "next-intl"
import { StudentTable } from "@/components/admin/StudentTable"

/** 学生管理页面 */
export default function StudentsPage() {
  const t = useTranslations("Admin")
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("studentManagement")}</h1>
      <StudentTable />
    </div>
  )
}
