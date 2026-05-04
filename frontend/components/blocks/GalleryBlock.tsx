"use client"

/**
 * 图片画廊区块。
 * 支持 4 种布局风格（grid/masonry/rows/carousel）+ PhotoSwipe Lightbox。
 */

import { type ReactNode } from "react"
import type { Block } from "@/types/block"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { Trash2, ImagePlus } from "lucide-react"
import { Gallery } from "react-photoswipe-gallery"
import "photoswipe/style.css"
import { GalleryGrid } from "./gallery/GalleryGrid"
import { GalleryMasonry } from "./gallery/GalleryMasonry"
import { GalleryRows } from "./gallery/GalleryRows"
import { GalleryCarousel } from "./gallery/GalleryCarousel"

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
  width: number
  height: number
}

type GalleryType = "grid" | "masonry" | "rows" | "carousel"

/** 根据 galleryType 渲染对应布局 */
function GalleryLayout({ items, galleryType }: { items: GalleryItem[]; galleryType: GalleryType }) {
  switch (galleryType) {
    case "masonry":
      return <GalleryMasonry items={items} />
    case "rows":
      return <GalleryRows items={items} />
    case "carousel":
      return <GalleryCarousel items={items} />
    default:
      return <GalleryGrid items={items} />
  }
}

/** 图片画廊区块 */
export function GalleryBlock({ block, header, bg, editable, onEdit, onEditConfig, blockLabel }: BlockProps) {
  const items: GalleryItem[] = Array.isArray(block.data) ? block.data : []
  const galleryType: GalleryType = block.options?.galleryType || "grid"

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
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/public/images/detail?id=${item.image_id}`}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
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
              <div
                className="hidden shrink-0 cursor-pointer group-hover/block:block"
                style={{ width: 280 }}
                data-editable
                onClick={(e) => { e.stopPropagation(); onEditConfig?.(`gallery_add_${block.id}`) }}
              >
                <div className="opacity-50 transition-opacity hover:opacity-80">
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted">
                    <ImagePlus className="size-10 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-center text-sm text-muted-foreground">新建图片</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }

  if (items.length === 0) return null

  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className="mt-8">
          <Gallery withCaption>
            <GalleryLayout items={items} galleryType={galleryType} />
          </Gallery>
        </div>
      </div>
    </section>
  )
}
