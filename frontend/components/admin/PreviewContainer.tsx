"use client"

/**
 * 预览容器。
 * 拦截预览内的链接和按钮点击，只放行编辑区域的交互。
 *
 * 放行规则：
 * - data-editable 元素及其子元素（ManageToolbar、NavEditor 等）
 * - data-field 元素及其子元素（FieldOverlay）
 * - .group 元素及其子元素（SpotlightOverlay、EditableOverlay）
 * - <input>/<select>/<textarea> 不受影响
 *
 * 禁用规则：
 * - <a> 链接：阻止导航
 * - <button> 按钮：阻止点击（如"立即咨询"）
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
    if (target.closest("[data-field]")) return
    if (target.closest(".group")) return

    const interactive = target.closest("a, button")
    if (interactive) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  )
}
