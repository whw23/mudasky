"use client"

/**
 * 通用配置页面。
 * 管理非可视化的系统配置：网站图标(favicon)和手机号国家码。
 */

import { useCallback, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import api from "@/lib/api"
import { CountryCodeEditor } from "@/components/admin/CountryCodeEditor"
import { ConfigEditDialog } from "@/components/admin/ConfigEditDialog"
import type { SiteInfo } from "@/types/config"

/** favicon 编辑字段定义 */
const FAVICON_FIELDS = [
  { key: "favicon_url", label: "Favicon", type: "image" as const, localized: false },
]

export default function GeneralSettingsPage() {
  const t = useTranslations("AdminGeneral")

  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  /** 获取 site_info 配置 */
  const fetchSiteInfo = useCallback(async () => {
    try {
      const res = await api.get("/admin/general-settings/list")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs = res.data as Array<{ key: string; value: any }>
      const value = configs.find((c) => c.key === "site_info")?.value
      if (value) setSiteInfo(value)
    } catch {
      toast.error(t("saveError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchSiteInfo()
  }, [fetchSiteInfo])

  /** 保存 favicon */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSaveFavicon(data: Record<string, any>): Promise<void> {
    const updated = { ...siteInfo, ...data }
    await api.post("/admin/general-settings/list/edit", { key: "site_info", value: updated })
    toast.success(t("saveSuccess"))
    await fetchSiteInfo()
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* 网站图标 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("faviconTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("faviconDesc")}</p>
        <div className="mt-2">
          {siteInfo?.favicon_url ? (
            <img
              src={siteInfo.favicon_url}
              alt="favicon"
              className="size-16 cursor-pointer rounded border object-contain p-1"
              onClick={() => setDialogOpen(true)}
            />
          ) : (
            <button
              className="flex size-16 items-center justify-center rounded border border-dashed text-sm text-muted-foreground hover:bg-muted/30"
              onClick={() => setDialogOpen(true)}
            >
              上传
            </button>
          )}
        </div>
      </section>

      {/* 国家码管理 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("countryCodeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("countryCodeDesc")}</p>
        <CountryCodeEditor />
      </section>

      {/* Favicon 编辑弹窗 */}
      {dialogOpen && siteInfo && (
        <ConfigEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={t("faviconTitle")}
          fields={FAVICON_FIELDS}
          data={siteInfo}
          onSave={handleSaveFavicon}
        />
      )}
    </div>
  )
}
