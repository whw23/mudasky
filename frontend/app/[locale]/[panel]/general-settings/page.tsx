"use client"

/**
 * 通用配置页面。
 * 管理非可视化的系统配置：网站图标(favicon)和手机号国家码。
 */

import { useTranslations } from "next-intl"
import { CountryCodeEditor } from "@/components/admin/CountryCodeEditor"

export default function GeneralSettingsPage() {
  const t = useTranslations("AdminGeneral")

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* 国家码管理 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("countryCodeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("countryCodeDesc")}</p>
        <CountryCodeEditor />
      </section>
    </div>
  )
}
