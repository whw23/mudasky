"use client"

/** 双层编辑容器。包裹整个 block，提供 block 级 + 字段级（spotlight）编辑。 */

import { Pencil } from "lucide-react"

interface SpotlightOverlayProps {
  children: React.ReactNode
  onClick: () => void
  label?: string
}

export function SpotlightOverlay({ children, onClick, label }: SpotlightOverlayProps) {
  return (
    <div
      className="spotlight-overlay group/block relative cursor-pointer"
      onClick={onClick}
      title={label}
    >
      <div className="spotlight-content">
        {children}
      </div>
      {/* block 级虚线框（无 FieldOverlay hover 时显示） */}
      <div className="spotlight-border pointer-events-none absolute inset-0 rounded border-2 border-dashed border-transparent transition-all group-hover/block:border-blue-400">
        <div className="absolute top-1 right-1 rounded bg-blue-500 p-1 text-white opacity-0 shadow transition-opacity group-hover/block:opacity-100">
          <Pencil className="size-3" />
        </div>
      </div>
    </div>
  )
}
