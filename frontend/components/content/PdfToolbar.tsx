"use client"

/**
 * PDF 悬浮工具栏。
 * 左下角 FAB 按钮吸附在 PDF 容器内，点击后展开工具项。
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Document, Outline } from "react-pdf"
import {
  ChevronDown,
  ChevronUp,
  Hand,
  List,
  Menu,
  Minus,
  MousePointer2,
  Plus,
  Search,
  SeparatorHorizontal,
  X,
} from "lucide-react"

interface PdfToolbarProps {
  hasOutline: boolean
  onToggleOutline: () => void
  showOutline: boolean
  outlineUrl: string
  onOutlineItemClick: (item: { pageNumber: number }) => void
  scale: number
  onScaleChange: (scale: number) => void
  handMode: boolean
  onToggleHandMode: () => void
  seamless: boolean
  onToggleSeamless: () => void
  clipOffset: number
  onClipOffsetChange: (offset: number) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SCALE_STEP = 0.1

/** PDF 悬浮工具栏 */
export function PdfToolbar(props: PdfToolbarProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="sticky bottom-4 z-30 ml-4 mb-4 w-fit">
      <FabMenu open={open} onToggle={() => setOpen((v) => !v)} />
      {open && <ToolPanel {...props} />}
    </div>
  )
}

/** FAB 主按钮 */
function FabMenu({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex size-10 items-center justify-center rounded-full bg-foreground/80 text-background shadow-lg transition-transform hover:scale-110 active:scale-95"
    >
      {open ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
  )
}

/** 展开的工具面板 */
function ToolPanel({
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
  clipOffset,
  onClipOffsetChange,
  containerRef,
}: PdfToolbarProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [showClipSlider, setShowClipSlider] = useState(false)
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<HTMLElement[]>([])
  const [currentMatch, setCurrentMatch] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(
    (text: string) => {
      const container = containerRef.current
      if (!container) return
      container.querySelectorAll(".pdf-search-highlight").forEach((el) => {
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

  const btn =
    "flex size-9 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-foreground/10 hover:scale-110 active:scale-95 transition-all"

  return (
    <div className="absolute bottom-0 left-0 z-30">
      {/* 按钮组：从 FAB 上方向上排列 */}
      <div className="mb-14 ml-0.5 flex flex-col-reverse gap-2">
        {hasOutline && (
          <button className={btn} onClick={onToggleOutline} title="目录">
            <List className="size-4" />
          </button>
        )}
        <button
          className={btn}
          onClick={() => onScaleChange(Math.max(MIN_SCALE, scale - SCALE_STEP))}
          disabled={scale <= MIN_SCALE}
          title="缩小"
        >
          <Minus className="size-4" />
        </button>
        <button
          className={`${btn} text-xs font-medium`}
          onClick={() => onScaleChange(1.0)}
          title="重置缩放"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          className={btn}
          onClick={() => onScaleChange(Math.min(MAX_SCALE, scale + SCALE_STEP))}
          disabled={scale >= MAX_SCALE}
          title="放大"
        >
          <Plus className="size-4" />
        </button>
        <button
          className={`${btn} ${!handMode ? "opacity-40" : ""}`}
          onClick={onToggleHandMode}
          title={handMode ? "文字选择" : "拖动平移"}
        >
          {handMode ? <Hand className="size-4" /> : <MousePointer2 className="size-4" />}
        </button>
        <button
          className={`${btn} ${seamless ? "ring-primary ring-2" : ""}`}
          onClick={onToggleSeamless}
          title={seamless ? "分页视图" : "连续视图"}
        >
          <SeparatorHorizontal className="size-4" />
        </button>
        {seamless && (
          <button
            className={`${btn} text-xs ${showClipSlider ? "ring-primary ring-2" : ""}`}
            onClick={() => setShowClipSlider((v) => !v)}
            title="调节裁切"
          >
            ±
          </button>
        )}
        <button
          className={btn}
          onClick={() => setShowSearch((v) => !v)}
          title="搜索"
        >
          <Search className="size-4" />
        </button>
      </div>

      {/* 子面板：从按钮组右侧弹出 */}
      {showClipSlider && seamless && (
        <div className="absolute bottom-14 left-14 w-56 rounded-lg border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>裁切调节</span>
            <span>{clipOffset > 0 ? "+" : ""}{clipOffset}%</span>
          </div>
          <input
            type="range"
            min={-3}
            max={5}
            step={0.5}
            value={clipOffset}
            onChange={(e) => onClipOffsetChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => onClipOffsetChange(Math.max(-3, clipOffset - 0.5))}>
              ← 少裁
            </button>
            <button className="text-primary hover:underline" onClick={() => onClipOffsetChange(-1)}>
              重置
            </button>
            <button className="hover:text-foreground" onClick={() => onClipOffsetChange(Math.min(5, clipOffset + 0.5))}>
              多裁 →
            </button>
          </div>
        </div>
      )}

      {showOutline && (
        <div className="absolute bottom-14 left-14 max-h-[60vh] w-72 overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
          <Document file={outlineUrl}>
            <Outline onItemClick={onOutlineItemClick} className="pdf-outline" />
          </Document>
        </div>
      )}

      {showSearch && (
        <div className="absolute bottom-14 left-14 flex items-center gap-1 rounded-lg border bg-background p-2 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(e.shiftKey ? -1 : 1)
              if (e.key === "Escape") closeSearch()
            }}
            placeholder="搜索..."
            className="w-32 rounded-md border bg-transparent px-2 py-1 text-sm outline-none sm:w-44"
          />
          {matches.length > 0 && (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {currentMatch + 1}/{matches.length}
            </span>
          )}
          <button className="rounded p-1 hover:bg-muted disabled:opacity-30" disabled={matches.length === 0} onClick={() => navigate(-1)}>
            <ChevronUp className="size-4" />
          </button>
          <button className="rounded p-1 hover:bg-muted disabled:opacity-30" disabled={matches.length === 0} onClick={() => navigate(1)}>
            <ChevronDown className="size-4" />
          </button>
          <button className="rounded p-1 hover:bg-muted" onClick={closeSearch}>
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
