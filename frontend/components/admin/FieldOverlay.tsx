"use client"

/** 字段级编辑高亮。hover 时显示紧凑虚线框 + 铅笔图标。 */

import { Pencil } from "lucide-react"

interface FieldOverlayProps {
  children: React.ReactNode
  onClick: () => void
  label?: string
  className?: string
}

export function FieldOverlay({ children, onClick, label, className }: FieldOverlayProps) {
  return (
    <div
      data-field
      className={`group/field relative cursor-pointer ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
    >
      {children}
      <div className="pointer-events-none absolute inset-0 rounded border-2 border-dashed border-transparent transition-colors group-hover/field:border-blue-400">
        <div className="absolute top-1 right-1 rounded bg-blue-500 p-1 text-white opacity-0 shadow transition-opacity group-hover/field:opacity-100">
          <Pencil className="size-3" />
        </div>
      </div>
    </div>
  )
}
