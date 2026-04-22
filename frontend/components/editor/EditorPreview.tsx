"use client"

/**
 * 编辑器预览面板组件。
 * 使用 SafeHtml 安全渲染 HTML 内容。
 */

import { SafeHtml } from "@/components/common/SafeHtml"

interface EditorPreviewProps {
  /** 要预览的 HTML 内容 */
  html: string
}

/** 编辑器预览面板 */
export function EditorPreview({ html }: EditorPreviewProps) {
  return <SafeHtml html={html} className="prose max-w-none" />
}
