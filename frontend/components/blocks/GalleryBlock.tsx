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

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
}

interface GalleryItem {
  image_id: string
  caption: any
}

/** 图片画廊区块 */
export function GalleryBlock({ block, header, bg, editable, onEdit, onFieldEdit }: BlockProps) {
  const locale = useLocale()
  const items: GalleryItem[] = Array.isArray(block.data) ? block.data : []

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑画廊">
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
              {items.map((item, i) => (
                <FieldOverlay
                  key={i}
                  onClick={() => onFieldEdit?.(block, "item", i)}
                  label={`编辑图片 ${i + 1}`}
                >
                  <div className="shrink-0" style={{ width: 280 }}>
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
              ))}
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
