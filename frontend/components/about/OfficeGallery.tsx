"use client"

/**
 * 办公环境图片展示/管理组件。
 * editable 模式下直接支持上传/删除，复用 BannerImageEditor 的交互模式。
 */

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Plus, Trash2, Building2 } from "lucide-react"
import { useConfig, useLocalizedConfig } from "@/contexts/ConfigContext"
import api from "@/lib/api"

interface OfficeGalleryProps {
  editable?: boolean
}

/** 办公环境图片 */
export function OfficeGallery({ editable }: OfficeGalleryProps) {
  const t = useTranslations("About")
  const { siteInfo: rawSiteInfo, refreshConfig } = useConfig()
  const { siteInfo } = useLocalizedConfig()
  const images = (siteInfo as any).about_office_images as { image_id: string; caption: string }[]
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const { data } = await api.post("/admin/web-settings/images/upload", form)
      const imageId = data.url?.match(/id=(.+)/)?.[1] || data.id || ""
      const current = (rawSiteInfo as any).about_office_images || []
      const updated = { ...rawSiteInfo, about_office_images: [...current, { image_id: imageId, caption: "" }] }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      toast.success("图片上传成功")
      refreshConfig()
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ""
    }
  }

  async function handleRemove(imageId: string) {
    try {
      const current = (rawSiteInfo as any).about_office_images || []
      const filtered = current.filter((img: any) => img.image_id !== imageId)
      const updated = { ...rawSiteInfo, about_office_images: filtered }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      toast.success("已移除")
      refreshConfig()
    } catch {
      toast.error("移除失败")
    }
  }

  const hasImages = images && images.length > 0

  if (!hasImages && !editable) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Office</h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("officeTitle")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
        {hasImages && images.map((img) => (
          <div key={img.image_id} className="group relative shrink-0 overflow-hidden rounded-lg border" style={{ width: 280 }}>
            <img
              src={`/api/public/images/detail?id=${img.image_id}`}
              alt={img.caption || "办公环境"}
              className="aspect-video w-full object-cover"
            />
            {img.caption && (
              <div className="px-3 py-2 text-center text-sm text-muted-foreground">{img.caption}</div>
            )}
            {editable && (
              <div className="absolute right-1 top-1 rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => handleRemove(img.image_id)}>
                <Trash2 className="size-4 text-white cursor-pointer" />
              </div>
            )}
          </div>
        ))}

        {editable && (
          <label className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition hover:border-primary" style={{ width: 280, aspectRatio: "16/9" }}>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            <div className="flex flex-col items-center text-muted-foreground">
              {uploading ? (
                <span className="text-sm">上传中...</span>
              ) : (
                <>
                  <Plus className="size-8" />
                  <span className="mt-1 text-sm">添加图片</span>
                </>
              )}
            </div>
          </label>
        )}

        {!hasImages && !editable && (
          <div className="flex w-full items-center justify-center py-16 text-muted-foreground">
            <Building2 className="mr-2 size-5" />
            暂无办公环境图片
          </div>
        )}
      </div>
    </section>
  )
}
