"use client"

/**
 * 清单卡片。
 * 显示图标 + 标签 + 清单项（CheckSquare 图标列表）。
 */

import { icons, SquareCheck } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"

interface ChecklistCardProps {
  card: Record<string, any>
  locale: string
}

/** 按名称查找图标 */
function resolveIcon(name: string) {
  if (!name) return null
  if (icons[name as keyof typeof icons]) return icons[name as keyof typeof icons]
  const pascal = name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("")
  return icons[pascal as keyof typeof icons] || null
}

/** 清单卡片 */
export function ChecklistCard({ card, locale }: ChecklistCardProps) {
  const label = getLocalizedValue(card.label, locale)
  const items: any[] = Array.isArray(card.items) ? card.items : []
  const Icon = resolveIcon(card.icon)

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        )}
        <h4 className="font-semibold">{label}</h4>
      </div>
      {items.length > 0 && (
        <ul className={`space-y-2 ${Icon ? "mt-4" : "mt-4"}`}>
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <SquareCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{getLocalizedValue(item, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
