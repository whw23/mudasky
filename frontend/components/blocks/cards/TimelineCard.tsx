"use client"

/**
 * 时间线卡片。
 * 显示时钟图标 + 标题 + 时间 + 描述。
 */

import { Clock } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"

interface TimelineCardProps {
  card: Record<string, any>
  locale: string
}

/** 时间线卡片 */
export function TimelineCard({ card, locale }: TimelineCardProps) {
  const title = getLocalizedValue(card.title, locale)
  const time = getLocalizedValue(card.time, locale)
  const desc = getLocalizedValue(card.desc, locale)

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Clock className="size-5" />
        <span className="text-sm font-medium">{time}</span>
      </div>
      <h4 className="font-semibold">{title}</h4>
      {desc && <p className="mt-2 text-sm text-muted-foreground">{desc}</p>}
    </div>
  )
}
