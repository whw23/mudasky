"use client"

/**
 * 轮播布局（中心聚焦风格）。
 * 深色背景，主图居中，两侧图片藏在主图后方露出边缘。
 * 自动轮播（5 秒），hover 暂停。
 */

import { useState, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GalleryItem } from "./GalleryItem"
import type { GalleryItemData, RenderItem } from "./types"

const AUTO_INTERVAL = 5000

interface GalleryCarouselProps {
  items: GalleryItemData[]
  renderItem?: RenderItem
}

export function GalleryCarousel({ items, renderItem }: GalleryCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const len = items.length

  const go = useCallback((dir: number) => {
    setCurrent((prev) => (prev + dir + len) % len)
  }, [len])

  useEffect(() => {
    if (paused || len <= 1) return
    const timer = setInterval(() => go(1), AUTO_INTERVAL)
    return () => clearInterval(timer)
  }, [paused, len, go])

  if (len === 0) return null

  const prev = (current - 1 + len) % len
  const next = (current + 1) % len

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gray-800 py-8 md:py-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 主图居中 + 侧图 absolute 藏在后面 */}
      <div className="relative mx-auto max-w-6xl px-4">
        {/* 侧图：与主图同高，absolute 定位，露出左右边缘 */}
        {len > 2 && (
          <>
            <div
              className="absolute inset-y-0 left-0 z-0 w-[55%] cursor-pointer"
              onClick={(e) => { e.stopPropagation(); go(-1) }}
            >
              <div className="flex h-full items-center pl-4">
                <div className="w-full overflow-hidden rounded-xl opacity-60 brightness-75">
                  <div className="aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/public/images/detail?id=${items[prev].image_id}`}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              className="absolute inset-y-0 right-0 z-0 w-[55%] cursor-pointer"
              onClick={(e) => { e.stopPropagation(); go(1) }}
            >
              <div className="flex h-full items-center pr-4">
                <div className="w-full overflow-hidden rounded-xl opacity-60 brightness-75">
                  <div className="aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/public/images/detail?id=${items[next].image_id}`}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 中心主图 */}
        <div className="relative z-10 mx-auto w-[60%]">
          {renderItem
            ? renderItem(items[current], current, "aspect-[16/9] rounded-xl")
            : (
              <GalleryItem
                imageId={items[current].image_id}
                caption={items[current].caption}
                width={items[current].width}
                height={items[current].height}
                className="aspect-[16/9] rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            )
          }
        </div>
      </div>

      {/* 箭头 */}
      {len > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1) }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 p-1 text-white/50 transition-colors hover:text-white md:left-4"
            aria-label="上一张"
          >
            <ChevronLeft className="size-7 md:size-9" strokeWidth={2.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1) }}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 p-1 text-white/50 transition-colors hover:text-white md:right-4"
            aria-label="下一张"
          >
            <ChevronRight className="size-7 md:size-9" strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* 指示条 */}
      {len > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "h-2 w-7 bg-primary"
                  : "size-2 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`第 ${i + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
