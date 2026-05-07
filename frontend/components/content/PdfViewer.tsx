"use client"

/**
 * PDF 查看器组件。
 * 基于 react-pdf 渲染所有页面，支持文字选择/拖动切换、缩放、搜索和目录跳转。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Document, Outline, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PdfToolbar } from "./PdfToolbar"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

interface PdfViewerProps {
  /** PDF 文件 URL */
  url: string
}

/** 扫描每页 TextLayer，计算内容上下边界 */
/** 扫描 canvas 像素行，判断是否全为白色（或接近白色） */
function isRowWhite(
  data: Uint8ClampedArray,
  width: number,
  row: number,
): boolean {
  const start = row * width * 4
  for (let x = 0; x < width; x++) {
    const idx = start + x * 4
    if (data[idx] < 250 || data[idx + 1] < 250 || data[idx + 2] < 250) {
      return false
    }
  }
  return true
}

/** 扫描 canvas 找到内容的上下边界（第一个/最后一个非白色像素行） */
function scanCanvasBounds(
  canvas: HTMLCanvasElement,
): { top: number; bottom: number } | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  const { width, height } = canvas
  if (width === 0 || height === 0) return null
  const data = ctx.getImageData(0, 0, width, height).data

  let contentTop = 0
  for (let y = 0; y < height; y++) {
    if (!isRowWhite(data, width, y)) {
      contentTop = y
      break
    }
  }

  let contentBottom = height
  for (let y = height - 1; y >= 0; y--) {
    if (!isRowWhite(data, width, y)) {
      contentBottom = y + 1
      break
    }
  }

  return { top: contentTop, bottom: height - contentBottom }
}

/** @param offset 用户自定义偏移量（正值=多裁，负值=少裁） */
function computeClips(
  pageRefs: Map<number, HTMLDivElement>,
  numPages: number,
  offset: number,
): Map<number, { top: number; bottom: number }> {
  const clips = new Map<number, { top: number; bottom: number }>()
  for (let i = 1; i <= numPages; i++) {
    const wrapper = pageRefs.get(i)
    if (!wrapper) continue
    const canvas = wrapper.querySelector("canvas")
    if (!canvas) continue

    const bounds = scanCanvasBounds(canvas)
    if (!bounds) continue

    const pageEl = wrapper.querySelector(".react-pdf__Page")
    if (!pageEl) continue
    const displayH = pageEl.getBoundingClientRect().height
    const canvasH = canvas.height
    const ratio = displayH / canvasH

    const padding = 0
    const offsetPx = displayH * offset / 100
    clips.set(i, {
      top: Math.max(0, bounds.top * ratio - padding + offsetPx),
      bottom: Math.max(0, bounds.bottom * ratio - padding + offsetPx),
    })
  }
  return clips
}

/** PDF 查看器 */
export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState(false)
  const [hasOutline, setHasOutline] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [scale, setScale] = useState(1.0)
  const [handMode, setHandMode] = useState(true)
  const [inView, setInView] = useState(false)
  const [seamless, setSeamless] = useState(false)
  const [clipOffset, setClipOffset] = useState(-1)
  const [clips, setClips] = useState<Map<number, { top: number; bottom: number }>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 })
  const renderedPages = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  /** 切换连续视图时重新计算裁切 */
  useEffect(() => {
    if (!seamless || numPages === 0) {
      setClips(new Map())
      return
    }
    const timer = setTimeout(() => {
      setClips(computeClips(pageRefs.current, numPages, clipOffset))
    }, 500)
    return () => clearTimeout(timer)
  }, [seamless, numPages, scale, clipOffset])

  /** 每页渲染完成后，如果处于连续视图则更新裁切 */
  const onPageRenderSuccess = useCallback(() => {
    renderedPages.current++
    if (seamless && renderedPages.current >= numPages) {
      setTimeout(() => {
        setClips(computeClips(pageRefs.current, numPages, clipOffset))
      }, 100)
    }
  }, [seamless, numPages])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!handMode) return
      const el = containerRef.current
      if (!el) return
      isDragging.current = true
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollX: el.scrollLeft,
        scrollY: window.scrollY,
      }
    },
    [handMode],
  )

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const el = containerRef.current
    if (!el) return
    el.scrollLeft = dragStart.current.scrollX - (e.clientX - dragStart.current.x)
    window.scrollTo(0, dragStart.current.scrollY - (e.clientY - dragStart.current.y))
  }, [])

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
  }, [])

  const onLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      renderedPages.current = 0
      setNumPages(total)
    },
    [],
  )

  const onLoadError = useCallback(() => setError(true), [])

  const onOutlineLoadSuccess = useCallback(
    (outline: unknown[] | null) => {
      setHasOutline(Array.isArray(outline) && outline.length > 0)
    },
    [],
  )

  const onItemClick = useCallback(
    ({ pageNumber }: { pageNumber: number }) => {
      setShowOutline(false)
      requestAnimationFrame(() => {
        const wrapper = pageRefs.current.get(pageNumber)
        if (!wrapper) return
        const header = document.querySelector("header")
        const navH = header?.getBoundingClientRect().height ?? 0
        const rect = wrapper.getBoundingClientRect()
        const targetY = window.scrollY + rect.top - navH - 8
        window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" })
      })
    },
    [],
  )

  const setPageRef = useCallback(
    (pageNum: number, el: HTMLDivElement | null) => {
      if (el) pageRefs.current.set(pageNum, el)
      else pageRefs.current.delete(pageNum)
    },
    [],
  )

  /** 计算每页的裁切样式：overflow:hidden + 固定高度 + 负 margin 上移 */
  function getPageStyle(pageNum: number): React.CSSProperties | undefined {
    if (!seamless || clips.size === 0) return undefined
    const clip = clips.get(pageNum)
    if (!clip) return undefined
    const topCut = clip.top
    const bottomCut = clip.bottom
    if (topCut === 0 && bottomCut === 0) return undefined
    const pageEl = pageRefs.current.get(pageNum)?.querySelector(".react-pdf__Page")
    const fullHeight = pageEl?.getBoundingClientRect().height ?? 0
    if (fullHeight === 0) return undefined
    return {
      height: `${fullHeight - topCut - bottomCut}px`,
      overflow: "hidden",
    }
  }

  /** 计算内页偏移（向上移动裁掉顶部） */
  function getInnerStyle(pageNum: number): React.CSSProperties | undefined {
    if (!seamless || clips.size === 0) return undefined
    const clip = clips.get(pageNum)
    if (!clip) return undefined
    const topCut = clip.top
    if (topCut === 0) return undefined
    return { marginTop: `-${topCut}px` }
  }

  const containerWidth = containerRef.current?.clientWidth

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground">PDF 加载失败</p>
        <Button variant="outline" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
          <Download className="mr-2 size-4" />
          下载文件
        </Button>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-x-auto rounded-lg border ${handMode ? "pdf-cursor-grab select-none" : "pdf-cursor-text"}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={
            <div className="flex items-center justify-center py-24">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Outline onLoadSuccess={onOutlineLoadSuccess} className="hidden" />
          {numPages > 0 && (
            <div className="mx-auto w-fit">
              {Array.from({ length: numPages }, (_, i) => (
                <div
                  key={i + 1}
                  ref={(el) => setPageRef(i + 1, el)}
                  style={getPageStyle(i + 1)}
                >
                  <div style={getInnerStyle(i + 1)}>
                    <Page
                      pageNumber={i + 1}
                      width={containerWidth ? containerWidth * scale : undefined}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      onRenderSuccess={onPageRenderSuccess}
                      className={handMode ? "pointer-events-none" : ""}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Document>
      </div>

      {inView && numPages > 0 && (
        <PdfToolbar
          hasOutline={hasOutline}
          onToggleOutline={() => setShowOutline((v) => !v)}
          showOutline={showOutline}
          outlineUrl={url}
          onOutlineItemClick={onItemClick}
          scale={scale}
          onScaleChange={setScale}
          handMode={handMode}
          onToggleHandMode={() => setHandMode((v) => !v)}
          seamless={seamless}
          onToggleSeamless={() => setSeamless((v) => !v)}
          clipOffset={clipOffset}
          onClipOffsetChange={setClipOffset}
          containerRef={containerRef}
        />
      )}
    </>
  )
}
