"use client"

/**
 * 可编辑区域包装器。
 * hover 时显示蓝色虚线边框 + 铅笔图标，点击触发编辑。
 */

import { Pencil, Trash2 } from "lucide-react"

interface EditableOverlayProps {
  children: React.ReactNode
  onClick: () => void
  onDelete?: () => void
  actions?: React.ReactNode
  label?: string
  inline?: boolean
  className?: string
}

/** 可编辑区域高亮包装器 */
export function EditableOverlay({ children, onClick, onDelete, actions, label, inline, className }: EditableOverlayProps) {
  const Tag = inline ? "span" : "div"
  return (
    <Tag
      className={`group relative cursor-pointer ${inline ? "inline" : ""} ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
    >
      {children}
      <Tag className="pointer-events-none absolute inset-0 rounded border-2 border-dashed border-transparent transition-colors group-hover:border-blue-400">
        <Tag className="absolute top-1 right-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {actions}
          {onDelete && (
            <button
              className="pointer-events-auto rounded bg-red-500 p-1 text-white shadow hover:bg-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              title="删除"
            >
              <Trash2 className="size-3" />
            </button>
          )}
          <Tag className="rounded bg-blue-500 p-1 text-white shadow">
            <Pencil className="size-3" />
          </Tag>
        </Tag>
      </Tag>
    </Tag>
  )
}
