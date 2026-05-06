"use client"

/**
 * PDF 悬浮工具栏。
 * 包含目录、缩放、搜索功能，fixed 定位在视口底部居中。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Document, Outline } from "react-pdf"
import {
  ChevronDown,
  ChevronUp,
  Hand,
  List,
  Minus,
  MousePointer2,
  Plus,
  Search,
  SeparatorHorizontal,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface PdfToolbarProps {
  /** 是否有目录 */
  hasOutline: boolean
  /** 切换目录面板 */
  onToggleOutline: () => void
  /** 目录面板是否打开 */
  showOutline: boolean
  /** PDF 文件 URL（目录用） */
  outlineUrl: string
  /** 目录项点击回调 */
  onOutlineItemClick: (item: { pageNumber: number }) => void
  /** 当前缩放比例 */
  scale: number
  /** 设置缩放比例 */
  onScaleChange: (scale: number) => void
  /** 拖拽模式 */
  handMode: boolean
  /** 切换拖拽模式 */
  onToggleHandMode: () => void
  /** 连续视图（合并页间空白） */
  seamless: boolean
  /** 切换连续视图 */
  onToggleSeamless: () => void
  /** PDF 容器 ref，用于搜索 */
  containerRef: React.RefObject<HTMLDivElement | null>
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SCALE_STEP = 0.1

/** PDF 悬浮工具栏 */
export function PdfToolbar({
  hasOutline,
  onToggleOutline,
  showOutline,
  outlineUrl,
  onOutlineItemClick,
  scale,
  onScaleChange,
  handMode,
  onToggleHandMode,
  seamless,
  onToggleSeamless,
  containerRef,
}: PdfToolbarProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<HTMLElement[]>([])
  const [currentMatch, setCurrentMatch] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(
    (text: string) => {
      const container = containerRef.current
      if (!container) return

      container
        .querySelectorAll(".pdf-search-highlight")
        .forEach((el) => {
          el.classList.remove("pdf-search-highlight", "pdf-search-current")
        })

      if (!text.trim()) {
        setMatches([])
        setCurrentMatch(-1)
        return
      }

      const lower = text.toLowerCase()
      const found: HTMLElement[] = []
      container.querySelectorAll(".textLayer span").forEach((span) => {
        const el = span as HTMLElement
        if (el.textContent?.toLowerCase().includes(lower)) {
          el.classList.add("pdf-search-highlight")
          found.push(el)
        }
      })

      setMatches(found)
      if (found.length > 0) {
        setCurrentMatch(0)
        found[0].classList.add("pdf-search-current")
        found[0].scrollIntoView({ behavior: "smooth", block: "center" })
      } else {
        setCurrentMatch(-1)
      }
    },
    [containerRef],
  )

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (matches.length === 0) return
      matches[currentMatch]?.classList.remove("pdf-search-current")
      const next =
        (currentMatch + direction + matches.length) % matches.length
      setCurrentMatch(next)
      matches[next].classList.add("pdf-search-current")
      matches[next].scrollIntoView({ behavior: "smooth", block: "center" })
    },
    [matches, currentMatch],
  )

  const closeSearch = useCallback(() => {
    setShowSearch(false)
    setQuery("")
    containerRef.current
      ?.querySelectorAll(".pdf-search-highlight")
      .forEach((el) => {
        el.classList.remove("pdf-search-highlight", "pdf-search-current")
      })
    setMatches([])
    setCurrentMatch(-1)
  }, [containerRef])

  useEffect(() => {
    if (showSearch) inputRef.current?.focus()
  }, [showSearch])

  return (
    <>
      {showOutline && (
        <div className="fixed bottom-16 left-1/2 z-40 max-h-[60vh] w-72 -translate-x-1/2 overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
          <Document file={outlineUrl}>
            <Outline
              onItemClick={onOutlineItemClick}
              className="pdf-outline"
            />
          </Document>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 z-40 flex w-fit -translate-x-1/2 items-center gap-1 rounded-full bg-background/90 px-2 py-1 shadow-lg ring-1 ring-foreground/10 backdrop-blur">
        {hasOutline && (
          <Button
            variant="ghost"
            size="sm"
            className="size-8 rounded-full p-0"
            onClick={onToggleOutline}
            title="目录"
          >
            {showOutline ? (
              <X className="size-4" />
            ) : (
              <List className="size-4" />
            )}
          </Button>
        )}

        <span className="mx-1 h-4 w-px bg-foreground/20" />

        <Button
          variant="ghost"
          size="sm"
          className="size-8 rounded-full p-0"
          disabled={scale <= MIN_SCALE}
          onClick={() =>
            onScaleChange(Math.max(MIN_SCALE, scale - SCALE_STEP))
          }
          title="缩小"
        >
          <Minus className="size-4" />
        </Button>
        <button
          className="min-w-[3rem] text-center text-xs text-muted-foreground"
          onClick={() => onScaleChange(1.0)}
          title="重置缩放"
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 rounded-full p-0"
          disabled={scale >= MAX_SCALE}
          onClick={() =>
            onScaleChange(Math.min(MAX_SCALE, scale + SCALE_STEP))
          }
          title="放大"
        >
          <Plus className="size-4" />
        </Button>

        <span className="mx-1 h-4 w-px bg-foreground/20" />

        <Button
          variant="ghost"
          size="sm"
          className={`size-8 rounded-full p-0 ${handMode ? "bg-foreground/10" : ""}`}
          onClick={onToggleHandMode}
          title={handMode ? "文字选择" : "拖动平移"}
        >
          {handMode ? (
            <Hand className="size-4" />
          ) : (
            <MousePointer2 className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`size-8 rounded-full p-0 ${seamless ? "bg-foreground/10" : ""}`}
          onClick={onToggleSeamless}
          title={seamless ? "分页视图" : "连续视图"}
        >
          <SeparatorHorizontal className="size-4" />
        </Button>

        <span className="mx-1 h-4 w-px bg-foreground/20" />

        {showSearch ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                doSearch(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(e.shiftKey ? -1 : 1)
                if (e.key === "Escape") closeSearch()
              }}
              placeholder="搜索..."
              className="w-28 rounded-md border bg-transparent px-2 py-0.5 text-sm outline-none sm:w-40"
            />
            {matches.length > 0 && (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {currentMatch + 1}/{matches.length}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="size-7 rounded-full p-0"
              disabled={matches.length === 0}
              onClick={() => navigate(-1)}
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 rounded-full p-0"
              disabled={matches.length === 0}
              onClick={() => navigate(1)}
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 rounded-full p-0"
              onClick={closeSearch}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="size-8 rounded-full p-0"
            onClick={() => setShowSearch(true)}
            title="搜索"
          >
            <Search className="size-4" />
          </Button>
        )}
      </div>
    </>
  )
}
