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
import type { GalleryItemData, RenderItem } from "./gallery/types"

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

type GalleryType = "grid" | "masonry" | "rows" | "carousel"

/** 根据 galleryType 渲染对应布局 */
function GalleryLayout({
  items, galleryType, renderItem,
}: {
  items: GalleryItemData[]
  galleryType: GalleryType
  renderItem?: RenderItem
}) {
  switch (galleryType) {
    case "masonry":
      return <GalleryMasonry items={items} renderItem={renderItem} />
    case "rows":
      return <GalleryRows items={items} renderItem={renderItem} />
    case "carousel":
      return <GalleryCarousel items={items} renderItem={renderItem} />
    default:
      return <GalleryGrid items={items} renderItem={renderItem} />
  }
}

/** 图片画廊区块 */
export function GalleryBlock({ block, header, bg, editable, onEdit, onEditConfig, blockLabel }: BlockProps) {
  const items: GalleryItemData[] = Array.isArray(block.data) ? block.data : []
  const galleryType: GalleryType = block.options?.galleryType || "grid"

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label={blockLabel || "编辑画廊"}>
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className="mt-8">
              <GalleryLayout
                items={items}
                galleryType={galleryType}
                renderItem={(item, i, className) => (
                  <EditableGalleryItem
                    key={i}
                    item={item}
                    index={i}
                    className={className}
                    blockId={block.id}
                    onEditConfig={onEditConfig}
                  />
                )}
              />
              <AddImageButton blockId={block.id} onEditConfig={onEditConfig} />
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

/** 可编辑的单张图片卡片 */
function EditableGalleryItem({
  item, index, className, blockId, onEditConfig,
}: {
  item: GalleryItemData
  index: number
  className: string
  blockId: string
  onEditConfig?: (section: string) => void
}) {
  return (
    <div className="group relative">
      <FieldOverlay
        onClick={() => onEditConfig?.(`gallery_item_${blockId}_${index}`)}
        label={`编辑图片 ${index + 1}`}
      >
        <div className={`overflow-hidden rounded-xl bg-muted ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/public/images/detail?id=${item.image_id}`}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </div>
      </FieldOverlay>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEditConfig?.(`gallery_delete_${blockId}_${index}`)
        }}
        className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
        title="移除"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}

/** 添加图片按钮 */
function AddImageButton({
  blockId, onEditConfig,
}: {
  blockId: string
  onEditConfig?: (section: string) => void
}) {
  return (
    <div
      className="mt-4 hidden cursor-pointer group-hover/block:block"
      data-editable
      onClick={(e) => { e.stopPropagation(); onEditConfig?.(`gallery_add_${blockId}`) }}
    >
      <div className="mx-auto flex w-48 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 p-4 opacity-50 transition-opacity hover:opacity-80">
        <ImagePlus className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">添加图片</span>
      </div>
    </div>
  )
}
