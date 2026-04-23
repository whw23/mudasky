"use client"

/**
 * 项目卡片。
 * 显示国家标签 + 项目名 + 描述 + 特色列表。
 */

import { CircleCheckBig } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"

interface ProgramCardProps {
  card: Record<string, any>
  locale: string
}

/** 项目卡片 */
export function ProgramCard({ card, locale }: ProgramCardProps) {
  const name = getLocalizedValue(card.name, locale)
  const country = getLocalizedValue(card.country, locale)
  const desc = getLocalizedValue(card.desc, locale)
  const features: any[] = Array.isArray(card.features) ? card.features : []

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* 国家标签 */}
      {country && (
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {country}
        </span>
      )}
      <h4 className="mt-3 font-semibold">{name}</h4>
      {desc && <p className="mt-2 text-sm text-muted-foreground">{desc}</p>}
      {/* 特色列表 */}
      {features.length > 0 && (
        <ul className="mt-4 space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-green-500" />
              <span>{getLocalizedValue(f, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
