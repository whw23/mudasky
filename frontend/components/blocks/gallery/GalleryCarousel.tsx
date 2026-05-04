"use client"

/**
 * 轮播布局。
 * 自动轮播（5 秒间隔），hover 暂停，左右箭头 + 指示点。
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GalleryItem } from "./GalleryItem"
import type { GalleryItemData, RenderItem } from "./types"

const AUTO_INTERVAL = 5000

interface GalleryCarouselProps {
  items: GalleryItemData[]
  renderItem?: RenderItem
}

export function GalleryCarousel({ items, renderItem }: GalleryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const child = el.children[index] as HTMLElement
    if (child) {
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" })
      setCurrent(index)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function handleScroll() {
      const children = Array.from(el!.children) as HTMLElement[]
      const scrollLeft = el!.scrollLeft + el!.offsetWidth / 2
      const idx = children.findIndex((c) => c.offsetLeft + c.offsetWidth > scrollLeft)
      if (idx >= 0) setCurrent(idx)
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (paused || items.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % items.length
        scrollTo(next)
        return next
      })
    }, AUTO_INTERVAL)
    return () => clearInterval(timer)
  }, [paused, items.length, scrollTo])

  if (items.length === 0) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-none"
      >
        {items.map((item, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {renderItem
              ? renderItem(item, i, "aspect-[21/9] max-h-[500px]")
              : (
                <GalleryItem
                  imageId={item.image_id}
                  caption={item.caption}
                  width={item.width}
                  height={item.height}
                  className="aspect-[21/9] max-h-[500px]"
                />
              )
            }
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={() => {
              const prev = current === 0 ? items.length - 1 : current - 1
              scrollTo(prev)
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2.5 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl"
            aria-label="上一张"
          >
            <ChevronLeft className="size-5 text-gray-700" />
          </button>
          <button
            onClick={() => {
              const next = (current + 1) % items.length
              scrollTo(next)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-2.5 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl"
            aria-label="下一张"
          >
            <ChevronRight className="size-5 text-gray-700" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "h-2 w-6 bg-white shadow-sm"
                    : "size-2 bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`第 ${i + 1} 张`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
