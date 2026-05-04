"use client"

/** 瀑布流布局。CSS columns，图片保持原始比例，紧凑间距。 */

import { GalleryItem } from "./GalleryItem"
import type { GalleryItemData, RenderItem } from "./types"

interface GalleryMasonryProps {
  items: GalleryItemData[]
  renderItem?: RenderItem
}

export function GalleryMasonry({ items, renderItem }: GalleryMasonryProps) {
  return (
    <div className="columns-2 gap-2 sm:gap-3 md:columns-3 lg:columns-4">
      {items.map((item, i) => {
        const ratio = item.width && item.height ? item.width / item.height : 4 / 3
        const cls = ratio > 1.4 ? "aspect-video" : ratio < 0.8 ? "aspect-[3/4]" : "aspect-square"
        return (
          <div key={i} className="mb-2 break-inside-avoid sm:mb-3">
            {renderItem
              ? renderItem(item, i, cls)
              : (
                <GalleryItem
                  imageId={item.image_id}
                  caption={item.caption}
                  width={item.width}
                  height={item.height}
                  className={cls}
                />
              )
            }
          </div>
        )
      })}
    </div>
  )
}
