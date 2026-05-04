"use client"

/**
 * 画廊单张图片卡片。
 * 底部渐变遮罩显示标题，hover 缩放 + 半透明遮罩 + 放大镜图标。
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
          ref={ref as React.Ref<HTMLDivElement>}
          className={`group relative cursor-pointer overflow-hidden rounded-lg shadow-sm transition-shadow duration-300 hover:shadow-xl ${className}`}
          onClick={open}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* hover 遮罩 + 放大图标 */}
          <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="rounded-full bg-white/90 p-3 shadow-lg">
              <ZoomIn className="size-5 text-gray-700" />
            </div>
          </div>
          {/* 底部渐变 + 标题 */}
          {captionText && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8">
              <p className="text-sm font-medium text-white drop-shadow-sm">
                {captionText}
              </p>
            </div>
          )}
        </div>
      )}
    </Item>
  )
}
