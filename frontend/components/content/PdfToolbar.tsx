"use client"

/**
 * PDF 悬浮工具栏。
 * FAB 按钮 fixed 在 PDF 容器左下角，点击后扇形展开工具项。
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
const FAN_RADIUS = 90

/** 计算扇形上第 i 个按钮的位置（从正上方到正右方的 90° 弧） */
function fanPosition(index: number, total: number) {
  const angle = (Math.PI / 2) * (index / (total - 1))
  return {
    x: Math.sin(angle) * FAN_RADIUS,
    y: -Math.cos(angle) * FAN_RADIUS,
  }
}

/** PDF 悬浮工具栏 */
export function PdfToolbar(props: PdfToolbarProps) {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState(16)

  useEffect(() => {
    function updateLeft() {
      const rect = props.containerRef.current?.getBoundingClientRect()
      if (rect) setLeft(rect.left + 16)
    }
    updateLeft()
    window.addEventListener("resize", updateLeft)
    window.addEventListener("scroll", updateLeft)
    return () => {
      window.removeEventListener("resize", updateLeft)
      window.removeEventListener("scroll", updateLeft)
    }
  }, [props.containerRef])

  return (
    <div className="fixed bottom-6 z-40" style={{ left: `${left}px` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 flex size-10 items-center justify-center rounded-full bg-foreground/80 text-background shadow-lg transition-transform hover:scale-110 active:scale-95"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && <ToolPanel {...props} />}
    </div>
  )
}

/** 展开的工具面板（扇形按钮 + 子面板） */
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
  const [activePanel, setActivePanel] = useState<string | null>(null)
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
      const next = (currentMatch + direction + matches.length) % matches.length
      setCurrentMatch(next)
      matches[next].classList.add("pdf-search-current")
      matches[next].scrollIntoView({ behavior: "smooth", block: "center" })
    },
    [matches, currentMatch],
  )

  const closeSearch = useCallback(() => {
    setActivePanel(null)
    setQuery("")
    containerRef.current?.querySelectorAll(".pdf-search-highlight").forEach((el) => {
      el.classList.remove("pdf-search-highlight", "pdf-search-current")
    })
    setMatches([])
    setCurrentMatch(-1)
  }, [containerRef])

  useEffect(() => {
    if (activePanel === "search") inputRef.current?.focus()
  }, [activePanel])

  const btn =
    "absolute flex size-9 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-foreground/10 hover:scale-110 active:scale-95 transition-all"

  const items = [
    ...(hasOutline
      ? [{
          icon: <List className="size-4" />,
          title: "目录",
          onClick: () => { onToggleOutline(); setActivePanel(activePanel === "outline" ? null : "outline") },
          active: activePanel === "outline",
        }]
      : []),
    {
      icon: <span className="text-xs font-medium">{Math.round(scale * 100)}%</span>,
      title: "缩放",
      onClick: () => setActivePanel(activePanel === "zoom" ? null : "zoom"),
      active: activePanel === "zoom",
    },
    {
      icon: handMode ? <Hand className="size-4" /> : <MousePointer2 className="size-4" />,
      title: handMode ? "文字选择" : "拖动平移",
      onClick: onToggleHandMode,
      dim: !handMode,
    },
    {
      icon: <SeparatorHorizontal className="size-4" />,
      title: seamless ? "分页视图" : "连续视图",
      onClick: onToggleSeamless,
      active: seamless,
    },
    ...(seamless
      ? [{
          icon: <span className="text-xs">±</span>,
          title: "调节裁切",
          onClick: () => setActivePanel(activePanel === "clip" ? null : "clip"),
          active: activePanel === "clip",
        }]
      : []),
    {
      icon: <Search className="size-4" />,
      title: "搜索",
      onClick: () => setActivePanel(activePanel === "search" ? null : "search"),
      active: activePanel === "search",
    },
  ]

  return (
    <>
      {/* 扇形按钮 */}
      {items.map((item, i) => {
        const pos = fanPosition(i, items.length)
        return (
          <button
            key={item.title}
            className={`${btn} ${item.active ? "ring-primary ring-2" : ""} ${item.dim ? "opacity-40" : ""}`}
            style={{
              left: `${pos.x}px`,
              bottom: `${-pos.y}px`,
            }}
            onClick={item.onClick}
            title={item.title}
          >
            {item.icon}
          </button>
        )
      })}

      {/* 子面板 */}
      {activePanel === "zoom" && (
        <div className="absolute bottom-0 left-[140px] w-56 rounded-lg border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>缩放</span>
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <input
            type="range"
            min={MIN_SCALE * 100}
            max={MAX_SCALE * 100}
            step={SCALE_STEP * 100}
            value={Math.round(scale * 100)}
            onChange={(e) => onScaleChange(Number(e.target.value) / 100)}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => onScaleChange(Math.max(MIN_SCALE, scale - SCALE_STEP))}>
              − 缩小
            </button>
            <button className="text-primary hover:underline" onClick={() => onScaleChange(1.0)}>
              重置
            </button>
            <button className="hover:text-foreground" onClick={() => onScaleChange(Math.min(MAX_SCALE, scale + SCALE_STEP))}>
              放大 +
            </button>
          </div>
        </div>
      )}

      {activePanel === "clip" && seamless && (
        <div className="absolute bottom-0 left-[140px] w-56 rounded-lg border bg-background p-3 shadow-lg">
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

      {activePanel === "outline" && (
        <div className="absolute bottom-0 left-[140px] max-h-[60vh] w-72 overflow-y-auto rounded-lg border bg-background p-4 shadow-lg">
          <Document file={outlineUrl}>
            <Outline onItemClick={onOutlineItemClick} className="pdf-outline" />
          </Document>
        </div>
      )}

      {activePanel === "search" && (
        <div className="absolute bottom-0 left-[140px] flex items-center gap-1 rounded-lg border bg-background p-2 shadow-lg">
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
    </>
  )
}
