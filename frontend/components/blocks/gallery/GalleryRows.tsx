"use client"

/** 行排列布局。每行等高，宽度按图片宽高比分配。 */

import { GalleryItem } from "./GalleryItem"
import type { GalleryItemData, RenderItem } from "./types"

interface GalleryRowsProps {
  items: GalleryItemData[]
  renderItem?: RenderItem
}

export function GalleryRows({ items, renderItem }: GalleryRowsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item, i) => {
        const ratio = item.width && item.height ? item.width / item.height : 4 / 3
        return (
          <div
            key={i}
            className="h-48 shrink-0 grow md:h-56 lg:h-64"
            style={{ flexBasis: `${ratio * 200}px` }}
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
