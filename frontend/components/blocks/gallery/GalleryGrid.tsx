"use client"

/** 等高网格布局。统一裁切比例，响应式 2/3/4 列。 */

import { GalleryItem } from "./GalleryItem"

interface GalleryGridProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <GalleryItem
          key={i}
          imageId={item.image_id}
          caption={item.caption}
          width={item.width}
          height={item.height}
          className="aspect-[4/3]"
        />
      ))}
    </div>
  )
}
