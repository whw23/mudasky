"use client"

/**
 * 成功案例管理页面。
 * 展示所有成功案例列表，支持创建、编辑、删除。
 */

import { useTranslations } from "next-intl"
import { CaseTable } from "@/components/admin/CaseTable"

/** 成功案例管理页面 */
export default function AdminCasesPage() {
  const t = useTranslations("Admin")
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("caseManagement")}</h1>
      <CaseTable />
    </div>
  )
}
