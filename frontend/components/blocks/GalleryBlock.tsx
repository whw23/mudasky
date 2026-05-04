"use client"

/**
 * 图片画廊区块。
 * 水平滚动展示图片列表，图片通过 image_id 加载。
 */

import { useLocale } from "next-intl"
import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { getLocalizedValue } from "@/lib/i18n-config"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { Trash2, ImagePlus } from "lucide-react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
  onEditConfig?: (section: string) => void
  blockLabel?: string
}

interface GalleryItem {
  image_id: string
  caption: any
}

/** 图片画廊区块 */
export function GalleryBlock({ block, header, bg, editable, onEdit, onFieldEdit, onEditConfig, blockLabel }: BlockProps) {
  const locale = useLocale()
  const items: GalleryItem[] = Array.isArray(block.data) ? block.data : []

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label={blockLabel || "编辑画廊"}>
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
              {items.map((item, i) => (
                <div key={i} className="group relative shrink-0" style={{ width: 280 }}>
                  <FieldOverlay
                    onClick={() => onEditConfig?.(`gallery_item_${block.id}_${i}`)}
                    label={`编辑图片 ${i + 1}`}
                  >
                    <div>
                      {/* 16:9 图片容器 */}
                      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/public/images/detail?id=${item.image_id}`}
                          alt={getLocalizedValue(item.caption, locale) || ""}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {/* 图片说明 */}
                      {getLocalizedValue(item.caption, locale) && (
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                          {getLocalizedValue(item.caption, locale)}
                        </p>
                      )}
                    </div>
                  </FieldOverlay>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditConfig?.(`gallery_delete_${block.id}_${i}`)
                    }}
                    className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                    title="移除"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              {/* 添加图片按钮 */}
              <div
                className="hidden shrink-0 group-hover/block:block"
                style={{ width: 280 }}
                data-editable
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  onClick={() => onEditConfig?.(`gallery_add_${block.id}`)}
                  className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 opacity-50 transition-opacity hover:opacity-80"
                >
                  <ImagePlus className="size-12 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }

  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
          {items.map((item, i) => (
            <div key={i} className="shrink-0" style={{ width: 280 }}>
              {/* 16:9 图片容器 */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/public/images/detail?id=${item.image_id}`}
                  alt={getLocalizedValue(item.caption, locale) || ""}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* 图片说明 */}
              {getLocalizedValue(item.caption, locale) && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {getLocalizedValue(item.caption, locale)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
