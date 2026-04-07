"use client"

/**
 * 权限组管理页面。
 */

import { useTranslations } from "next-intl"
import { GroupList } from "@/components/admin/GroupList"

/** 权限组管理页面 */
export default function AdminGroupsPage() {
  const t = useTranslations("AdminGroups")

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <GroupList />
    </div>
  )
}
