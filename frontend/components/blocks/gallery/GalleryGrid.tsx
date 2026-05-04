"use client"

/** 等高网格布局。统一 4:3 裁切，紧凑间距，响应式 2/3/4 列。 */

import { GalleryItem } from "./GalleryItem"
import type { GalleryItemData, RenderItem } from "./types"

interface GalleryGridProps {
  items: GalleryItemData[]
  renderItem?: RenderItem
}

export function GalleryGrid({ items, renderItem }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => renderItem
        ? renderItem(item, i, "aspect-[4/3]")
        : (
          <GalleryItem
            key={i}
            imageId={item.image_id}
            caption={item.caption}
            width={item.width}
            height={item.height}
            className="aspect-[4/3]"
          />
        )
      )}
    </div>
  )
}
