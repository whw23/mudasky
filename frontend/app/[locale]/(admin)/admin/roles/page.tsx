"use client"

/**
 * 角色管理页面。
 */

import { useTranslations } from "next-intl"
import { RoleList } from "@/components/admin/RoleList"

/** 角色管理页面 */
export default function AdminRolesPage() {
  const t = useTranslations("AdminGroups")

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <RoleList />
    </div>
  )
}
