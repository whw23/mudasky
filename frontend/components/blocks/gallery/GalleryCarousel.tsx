"use client"

/** 轮播布局。scroll-snap 实现，左右箭头 + 指示点。 */

import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GalleryItem } from "./GalleryItem"

interface GalleryCarouselProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryCarousel({ items }: GalleryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)

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

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-none"
      >
        {items.map((item, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            <GalleryItem
              imageId={item.image_id}
              caption={item.caption}
              width={item.width}
              height={item.height}
              className="aspect-video"
            />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={() => scrollTo(Math.max(0, current - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-opacity hover:bg-white disabled:opacity-30"
            disabled={current === 0}
            aria-label="上一张"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => scrollTo(Math.min(items.length - 1, current + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-opacity hover:bg-white disabled:opacity-30"
            disabled={current === items.length - 1}
            aria-label="下一张"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="mt-4 flex justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
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
