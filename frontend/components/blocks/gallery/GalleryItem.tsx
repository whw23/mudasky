"use client"

/**
 * 画廊单张图片卡片。
 * 包含 hover 缩放/遮罩效果 + PhotoSwipe Item 包裹。
 */

import { useLocale } from "next-intl"
import { Item } from "react-photoswipe-gallery"
import { ZoomIn } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"

interface GalleryItemProps {
  imageId: string
  caption: any
  width: number
  height: number
  className?: string
}

/** 画廊图片卡片 */
export function GalleryItem({ imageId, caption, width, height, className = "" }: GalleryItemProps) {
  const locale = useLocale()
  const src = `/api/public/images/detail?id=${imageId}`
  const alt = getLocalizedValue(caption, locale) || ""
  const captionText = getLocalizedValue(caption, locale) || ""

  return (
    <Item
      original={src}
      thumbnail={src}
      width={width || 1200}
      height={height || 800}
      caption={captionText}
      alt={alt}
    >
      {({ ref, open }) => (
        <div
          className={`group cursor-pointer overflow-hidden rounded-xl ${className}`}
          onClick={open}
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={ref as React.Ref<HTMLImageElement>}
              src={src}
              alt={alt}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
              <ZoomIn className="size-8 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </div>
          {captionText && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {captionText}
            </p>
          )}
        </div>
      )}
    </Item>
  )
}
