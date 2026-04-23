"use client"

/**
 * 通用标题区域。
 * 渲染英文小标签 + 多语言标题 + 红色分隔线。
 */

import { useLocale } from "next-intl"
import type { LocalizedField } from "@/lib/i18n-config"
import { getLocalizedValue } from "@/lib/i18n-config"

interface SectionHeaderProps {
  tag: string
  title: LocalizedField
}

/** 通用 section 标题 */
export function SectionHeader({ tag, title }: SectionHeaderProps) {
  const locale = useLocale()
  const resolvedTitle = typeof title === "string" ? title : getLocalizedValue(title, locale)

  return (
    <div className="text-center">
      {tag && (
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {tag}
        </h2>
      )}
      <h3 className="mt-2 text-2xl md:text-3xl font-bold">{resolvedTitle}</h3>
      <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
    </div>
  )
}
