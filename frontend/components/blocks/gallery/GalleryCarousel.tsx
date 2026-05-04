"use client"

/**
 * 轮播布局（中心聚焦风格）。
 * 深色背景，当前幻灯片居中突出，两侧图片重叠在后方。
 * 主图下方显示标题和说明文字。自动轮播（5 秒），hover 暂停。
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
      {/* 三层卡片——用 grid 实现精确居中 */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-[1fr_minmax(0,3fr)_1fr] items-center px-10 md:px-14">
        {/* 左侧 */}
        {len > 2 ? (
          <div
            className="z-0 translate-x-[30%] cursor-pointer transition-all duration-500"
            onClick={(e) => { e.stopPropagation(); go(-1) }}
          >
            <div className="overflow-hidden rounded-xl opacity-50 brightness-75">
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
        ) : <div />}

        {/* 中心主图 */}
        <div className="relative z-10">
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

        {/* 右侧 */}
        {len > 2 ? (
          <div
            className="z-0 -translate-x-[30%] cursor-pointer transition-all duration-500"
            onClick={(e) => { e.stopPropagation(); go(1) }}
          >
            <div className="overflow-hidden rounded-xl opacity-50 brightness-75">
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
        ) : <div />}
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
