"use client"

/**
 * 通用配置页面。
 * 管理非可视化的系统配置：网站图标(favicon)和手机号国家码。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { CountryCodeEditor } from "@/components/admin/CountryCodeEditor"
import type { SiteInfo } from "@/types/config"

export default function GeneralSettingsPage() {
  const t = useTranslations("AdminGeneral")

  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  /** 上传 favicon */
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/admin/web-settings/images/upload", formData)
      const updated = { ...siteInfo, favicon_url: data.url }
      await api.post("/admin/general-settings/list/edit", { key: "site_info", value: updated })
      toast.success(t("saveSuccess"))
      await fetchSiteInfo()
    } catch {
      toast.error(t("uploadError"))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  /** 清除 favicon */
  async function handleClear() {
    try {
      const updated = { ...siteInfo, favicon_url: "" }
      await api.post("/admin/general-settings/list/edit", { key: "site_info", value: updated })
      toast.success(t("saveSuccess"))
      await fetchSiteInfo()
    } catch {
      toast.error(t("saveError"))
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  const faviconUrl = siteInfo?.favicon_url

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {/* 网站图标 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("faviconTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("faviconDesc")}</p>
        <div className="inline-flex items-center gap-2">
          <div
            className={`relative flex size-20 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-colors ${
              faviconUrl
                ? "border-solid border-muted bg-muted/30"
                : "border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
            } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {faviconUrl ? (
              <img src={faviconUrl} alt="favicon" className="size-14 object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {uploading ? t("uploading") : t("uploadBtn")}
                </span>
              </div>
            )}
          </div>
          {faviconUrl && (
            <button
              className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={handleClear}
              title={t("clear")}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </section>

      {/* 国家码管理 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("countryCodeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("countryCodeDesc")}</p>
        <CountryCodeEditor />
      </section>
    </div>
  )
}
