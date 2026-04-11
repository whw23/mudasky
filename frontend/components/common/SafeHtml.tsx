'use client'

/**
 * 安全 HTML 渲染组件。
 * 使用 DOMPurify 消毒后渲染 HTML，防止 XSS 攻击。
 */

import { useMemo } from 'react'
import DOMPurify from 'dompurify'

interface SafeHtmlProps {
  html: string
  className?: string
}

/** 安全渲染 HTML 内容 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
