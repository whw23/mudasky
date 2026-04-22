"use client"

/**
 * 预览容器。
 * 拦截预览内的链接导航，禁用非编辑区域的按钮。
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
  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest("[data-editable]")) return
    const link = target.closest("a")
    if (link) {
      e.preventDefault()
    }
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  )
}
