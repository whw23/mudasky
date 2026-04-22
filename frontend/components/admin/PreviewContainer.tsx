"use client"

/**
 * 预览容器。
 * 拦截 <a>/<button> 的点击，防止链接导航和按钮操作。
 *
 * 放行规则：
 * - <div>/<span> + onClick 不受影响（EditableOverlay 等）
 * - data-editable 元素及其子元素不受影响（ManageToolbar 等）
 * - <input>/<select> 不受影响（筛选器）
 */

import { ReactNode, MouseEvent } from "react"

interface PreviewContainerProps {
  children: ReactNode
  className?: string
}

/** 预览容器（禁用非编辑交互） */
export function PreviewContainer({ children, className }: PreviewContainerProps) {
  function handleClickCapture(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest("[data-editable]")) return
    const interactive = target.closest("a, button")
    if (interactive) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className={className} onClickCapture={handleClickCapture}>
      {children}
    </div>
  )
}
