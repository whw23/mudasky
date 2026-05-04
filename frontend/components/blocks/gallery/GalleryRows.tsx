"use client"

/** 行排列布局。每行等高，宽度按宽高比自动分配，紧凑间距。 */

import { GalleryItem } from "./GalleryItem"
import type { GalleryItemData, RenderItem } from "./types"

interface GalleryRowsProps {
  items: GalleryItemData[]
  renderItem?: RenderItem
}

export function GalleryRows({ items, renderItem }: GalleryRowsProps) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {items.map((item, i) => {
        const ratio = item.width && item.height ? item.width / item.height : 4 / 3
        return (
          <div
            key={i}
            className="h-40 shrink-0 grow sm:h-48 md:h-56"
            style={{ flexBasis: `${ratio * 180}px` }}
          >
            {renderItem
              ? renderItem(item, i, "h-full")
              : (
                <GalleryItem
                  imageId={item.image_id}
                  caption={item.caption}
                  width={item.width}
                  height={item.height}
                  className="h-full"
                />
              )
            }
          </div>
        )
      })}
    </div>
  )
}
