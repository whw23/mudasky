"use client"

/**
 * 通用页面简介区块。
 * 从 siteInfo 配置读取标题和内容，支持翻译兜底和可编辑模式。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface PageIntroSectionProps {
  /** siteInfo 中标题字段的 key */
  titleKey: string
  /** siteInfo 中内容字段的 key */
  contentKey: string
  /** 标题兜底文本 */
  titleFallback: string
  /** 内容兜底文本 */
  contentFallback: string
  /** 区块小标签（如 "About Us"） */
  sectionTag?: string
  /** 是否可编辑 */
  editable?: boolean
  /** 编辑标题回调 */
  onEditTitle?: () => void
  /** 编辑内容回调 */
  onEditContent?: () => void
}

/** 通用页面简介区块 */
export function PageIntroSection({
  titleKey,
  contentKey,
  titleFallback,
  contentFallback,
  sectionTag,
  editable,
  onEditTitle,
  onEditContent,
}: PageIntroSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info = siteInfo as Record<string, any>
  const title = (info[titleKey] as string) || titleFallback
  const content = (info[contentKey] as string) || contentFallback

  const titleEl = (
    <h3 className="mt-2 text-2xl md:text-3xl font-bold">{title}</h3>
  )

  const contentEl = (
    <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
      {content}
    </p>
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="text-center">
        {sectionTag && (
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {sectionTag}
          </h2>
        )}
        {editable && onEditTitle ? (
          <EditableOverlay onClick={onEditTitle} label="编辑标题">
            {titleEl}
          </EditableOverlay>
        ) : (
          titleEl
        )}
        <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
      </div>
      {editable && onEditContent ? (
        <EditableOverlay onClick={onEditContent} label="编辑内容">
          {contentEl}
        </EditableOverlay>
      ) : (
        contentEl
      )}
    </section>
  )
}
