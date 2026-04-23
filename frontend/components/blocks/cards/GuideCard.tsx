"use client"

/**
 * 指南卡片。
 * 显示动态图标 + 标题 + 描述。
 */

import { icons } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"

interface GuideCardProps {
  card: Record<string, any>
  locale: string
}

/** 按名称查找图标（支持 PascalCase 和 kebab-case） */
function resolveIcon(name: string) {
  if (!name) return icons.Info
  if (icons[name as keyof typeof icons]) return icons[name as keyof typeof icons]
  const pascal = name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("")
  return icons[pascal as keyof typeof icons] || icons.Info
}

/** 图标 + 标题 + 描述 卡片 */
export function GuideCard({ card, locale }: GuideCardProps) {
  const Icon = resolveIcon(card.icon)
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
