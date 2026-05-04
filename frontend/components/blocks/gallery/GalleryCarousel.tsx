"use client"

/**
 * 轮播布局（中心聚焦风格）。
 * 当前幻灯片居中放大，两侧露出前后图片（缩小+暗化）。
 * 自动轮播（5 秒），hover 暂停，箭头 + 指示条。
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
      className="relative max-h-[80vh] overflow-hidden rounded-xl py-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto flex items-center justify-center">
        {/* 左侧预览 */}
        {len > 1 && (
          <SideSlide item={items[prev]} index={prev} side="left" onClick={() => go(-1)} />
        )}

        {/* 中心主图 */}
        <div className="relative z-10 w-full max-w-4xl shrink-0 px-2">
          {renderItem
            ? renderItem(items[current], current, "aspect-[16/9] max-h-[55vh] rounded-xl")
            : (
              <GalleryItem
                imageId={items[current].image_id}
                caption={items[current].caption}
                width={items[current].width}
                height={items[current].height}
                className="aspect-[16/9] max-h-[55vh] rounded-xl shadow-xl"
              />
            )
          }
        </div>

        {/* 右侧预览 */}
        {len > 1 && (
          <SideSlide item={items[next]} index={next} side="right" onClick={() => go(1)} />
        )}
      </div>

      {/* 箭头 */}
      {len > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow-md transition-all hover:bg-white hover:shadow-lg md:left-3 md:p-2"
            aria-label="上一张"
          >
            <ChevronLeft className="size-5 text-primary md:size-6" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow-md transition-all hover:bg-white hover:shadow-lg md:right-3 md:p-2"
            aria-label="下一张"
          >
            <ChevronRight className="size-5 text-primary md:size-6" />
          </button>
        </>
      )}

      {/* 指示条 */}
      {len > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "h-2 w-7 bg-primary"
                  : "size-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
              }`}
              aria-label={`第 ${i + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** 侧边预览幻灯片 */
function SideSlide({
  item, index, side, onClick,
}: {
  item: GalleryItemData
  index: number
  side: "left" | "right"
  onClick: () => void
}) {
  const translateCls = side === "left" ? "translate-x-[20%]" : "-translate-x-[20%]"

  return (
    <div
      className={`relative z-0 hidden w-full max-w-[240px] cursor-pointer md:block lg:max-w-[300px] ${translateCls}`}
      onClick={onClick}
    >
      <div className="overflow-hidden rounded-xl opacity-40 shadow-md transition-opacity duration-300 hover:opacity-60">
        <div className="aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/public/images/detail?id=${item.image_id}`}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  )
}
