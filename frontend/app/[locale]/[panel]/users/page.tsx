"use client"

/**
 * 用户管理页面。
 * 包含用户列表和用户详情抽屉。
 */

import { useState } from "react"
import { useTranslations } from "next-intl"
import { UserTable } from "@/components/admin/UserTable"
import { UserDrawer } from "@/components/admin/UserDrawer"

/** 用户管理页面 */
export default function AdminUsersPage() {
  const t = useTranslations("Admin")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("userManagement")}</h1>
      <UserTable onSelectUser={setSelectedUserId} refreshKey={refreshKey} />
      <UserDrawer
        userId={selectedUserId}
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onUpdate={() => {
          setSelectedUserId(null)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}
