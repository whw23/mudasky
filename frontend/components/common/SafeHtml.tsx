'use client'

/**
 * 安全 HTML 渲染组件。
 * 使用 DOMPurify 消毒后渲染 HTML，防止 XSS 攻击。
 */

import { useMemo } from 'react'
import DOMPurify from 'dompurify'

/** 需要强制保留的属性（按标签） */
const FORCE_KEEP_ATTRS: Record<string, Set<string>> = {
  IFRAME: new Set([
    'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen',
    'scrolling', 'sandbox', 'referrerpolicy', 'loading', 'tabindex',
    'style', 'class',
  ]),
  IMG: new Set(['src', 'alt', 'width', 'height', 'style', 'class']),
  DIV: new Set(['style', 'class', 'data-video-url']),
  P: new Set(['style']),
  H1: new Set(['style']),
  H2: new Set(['style']),
  H3: new Set(['style']),
  H4: new Set(['style']),
}

interface SafeHtmlProps {
  html: string
  className?: string
}

/** 安全渲染 HTML 内容（所有内容经 DOMPurify 消毒） */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = useMemo(() => {
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
      const allowed = FORCE_KEEP_ATTRS[node.tagName]
      if (allowed?.has(data.attrName)) {
        data.forceKeepAttr = true
      }
    })

    const result = DOMPurify.sanitize(html, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: [
        'allow', 'allowfullscreen', 'frameborder', 'scrolling',
        'sandbox', 'referrerpolicy', 'loading', 'tabindex',
        'data-video-url', 'style', 'class', 'target',
        'width', 'height',
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|\/api\/)/i,
    })

    DOMPurify.removeHook('uponSanitizeAttribute')
    return result
  }, [html])

  // DOMPurify 已消毒，安全渲染
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
