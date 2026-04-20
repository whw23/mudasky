"use client"

/**
 * 图片画廊组件。
 * 支持多图展示和缩略图切换。
 */

import { useState } from "react"

interface ImageGalleryProps {
  imageIds: string[]
  alt: string
}

/** 图片画廊组件 */
export function ImageGallery({ imageIds, alt }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (imageIds.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <img
          src={`/api/public/images/detail?id=${imageIds[activeIndex]}`}
          alt={`${alt} - ${activeIndex + 1}`}
          className="h-full w-full object-cover"
        />
      </div>
      {imageIds.length > 1 && (
        <div className="flex gap-2">
          {imageIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setActiveIndex(i)}
              className={`h-16 w-24 overflow-hidden rounded border-2 transition-colors ${
                i === activeIndex ? "border-primary" : "border-transparent"
              }`}
            >
              <img
                src={`/api/public/images/detail?id=${id}`}
                alt={`${alt} - ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
