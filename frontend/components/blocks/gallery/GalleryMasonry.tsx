"use client"

/** 瀑布流布局。CSS columns 实现，图片保持原始比例。 */

import { GalleryItem } from "./GalleryItem"

interface GalleryMasonryProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryMasonry({ items }: GalleryMasonryProps) {
  return (
    <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
      {items.map((item, i) => {
        const ratio = item.width && item.height ? item.width / item.height : 4 / 3
        return (
          <div key={i} className="mb-4 break-inside-avoid">
            <GalleryItem
              imageId={item.image_id}
              caption={item.caption}
              width={item.width}
              height={item.height}
              className={ratio > 1 ? "aspect-video" : "aspect-[3/4]"}
            />
          </div>
        )
      })}
    </div>
  )
}
