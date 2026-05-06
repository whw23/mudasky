"use client"

/**
 * PDF 查看器组件。
 * 基于 react-pdf 渲染所有页面，支持文字选择、缩放、搜索和目录跳转。
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

/** PDF 查看器：渲染所有页面，支持文字选择、缩放、搜索、目录 */
export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState(false)
  const [hasOutline, setHasOutline] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [scale, setScale] = useState(1.0)
  const [inView, setInView] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

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

  const onLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total)
    },
    [],
  )

  const onLoadError = useCallback(() => {
    setError(true)
  }, [])

  const onOutlineLoadSuccess = useCallback(
    (outline: unknown[] | null) => {
      setHasOutline(Array.isArray(outline) && outline.length > 0)
    },
    [],
  )

  const onItemClick = useCallback(
    ({ pageNumber }: { pageNumber: number }) => {
      const el = pageRefs.current.get(pageNumber)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      setShowOutline(false)
    },
    [],
  )

  const setPageRef = useCallback(
    (pageNum: number, el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(pageNum, el)
      } else {
        pageRefs.current.delete(pageNum)
      }
    },
    [],
  )

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
      <div ref={containerRef} className="relative overflow-x-auto rounded-lg border">
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
          {numPages > 0 &&
            Array.from({ length: numPages }, (_, i) => (
              <div key={i + 1} ref={(el) => setPageRef(i + 1, el)}>
                <Page
                  pageNumber={i + 1}
                  width={containerWidth ? containerWidth * scale : undefined}
                  renderTextLayer={true}
                  renderAnnotationLayer={false}
                />
              </div>
            ))}
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
          containerRef={containerRef}
        />
      )}
    </>
  )
}
