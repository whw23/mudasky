"use client"

/**
 * 指南卡片。
 * 显示动态图标 + 标题 + 描述。
 * 图标名称参考：https://lucide.dev/icons/
 */

import { icons } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"
import { resolveIcon } from "@/lib/icon-utils"

interface GuideCardProps {
  card: Record<string, any>
  locale: string
}

/** 图标 + 标题 + 描述 卡片 */
export function GuideCard({ card, locale }: GuideCardProps) {
  const Icon = resolveIcon(card.icon, icons.Info)!
  const title = getLocalizedValue(card.title, locale)
  const desc = getLocalizedValue(card.desc, locale)

  return (
    <div className="rounded-lg border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-6 text-primary" />
      </div>
      <h4 className="font-semibold">{title}</h4>
      {desc && <p className="mt-2 text-sm text-muted-foreground">{desc}</p>}
    </div>
  )
}
