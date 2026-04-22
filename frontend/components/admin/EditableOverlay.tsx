"use client"

/**
 * 可编辑区域包装器。
 * hover 时显示蓝色虚线边框 + 铅笔图标，点击触发编辑。
 */

import { Pencil } from "lucide-react"

interface EditableOverlayProps {
  children: React.ReactNode
  onClick: () => void
  label?: string
  inline?: boolean
}

/** 可编辑区域高亮包装器 */
export function EditableOverlay({ children, onClick, label, inline }: EditableOverlayProps) {
  const Tag = inline ? "span" : "div"
  return (
    <Tag
      data-editable
      className={`group relative cursor-pointer ${inline ? "inline" : ""}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
    >
      {children}
      <Tag className="pointer-events-none absolute inset-0 rounded border-2 border-dashed border-transparent transition-colors group-hover:border-blue-400">
        <Tag className="absolute top-1 right-1 rounded bg-blue-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
          <Pencil className="size-3" />
        </Tag>
      </Tag>
    </Tag>
  )
}
