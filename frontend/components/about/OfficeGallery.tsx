"use client"

import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { Building2 } from "lucide-react"

interface OfficeGalleryProps {
  editable?: boolean
  onEdit?: () => void
}

/**
 * 办公环境图片展示组件
 *
 * 从 about_office_images 配置中读取图片列表并渲染成网格
 */
export function OfficeGallery({ editable, onEdit }: OfficeGalleryProps) {
  const t = useTranslations("About")
  const { siteInfo } = useLocalizedConfig()
  const images = (siteInfo as any).about_office_images as {
    image_id: string
    caption: string
  }[]

  // 无图片时的处理
  if (!images || images.length === 0) {
    if (!editable) return null

    const placeholder = (
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Office
          </h2>
          <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("officeTitle")}</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-8 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-16 text-muted-foreground">
          <Building2 className="mr-2 size-5" />
          点击编辑添加办公环境图片
        </div>
      </section>
    )
    return (
      <EditableOverlay onClick={() => onEdit?.()} label="编辑办公环境">
        {placeholder}
      </EditableOverlay>
    )
  }

  const content = (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Office
        </h2>
        <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("officeTitle")}</h3>
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, i) => (
          <div key={i} className="overflow-hidden rounded-lg border">
            <img
              src={`/api/public/images/detail?id=${img.image_id}`}
              alt={img.caption || `办公环境 ${i + 1}`}
              className="aspect-video w-full object-cover"
            />
            {img.caption && (
              <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={onEdit} label="编辑办公环境">
        {content}
      </EditableOverlay>
    )
  }
  return content
}
