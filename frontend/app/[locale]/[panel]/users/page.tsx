"use client"

/**
 * 用户管理页面。
 * 用户列表 + 行内展开面板。
 */

import { useTranslations } from "next-intl"
import { UserTable } from "@/components/admin/UserTable"

/** 用户管理页面 */
export default function AdminUsersPage() {
  const t = useTranslations("Admin")

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("userManagement")}</h1>
      <UserTable />
    </div>
  )
}
