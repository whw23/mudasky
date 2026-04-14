"use client"

/**
 * 联系人管理页面。
 * 展示访客联系人列表。
 */

import { useTranslations } from "next-intl"
import { ContactTable } from "@/components/admin/ContactTable"

/** 联系人管理页面 */
export default function ContactsPage() {
  const t = useTranslations("Admin")
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("contactManagement")}</h1>
      <ContactTable />
    </div>
  )
}
