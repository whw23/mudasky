/**
 * Lucide 图标工具。
 * 按名称动态解析图标，支持 PascalCase、kebab-case、lowercase。
 * 图标名称参考：https://lucide.dev/icons/
 */

import { icons } from "lucide-react"

type LucideIcon = (typeof icons)[keyof typeof icons]

/**
 * 按名称解析 Lucide 图标。
 * 支持 PascalCase (BadgeDollarSign)、kebab-case (badge-dollar-sign)、lowercase (house)。
 * 找不到时返回 fallback（默认 null）。
 */
export function resolveIcon(name: string | undefined, fallback?: LucideIcon): LucideIcon | null {
  if (!name) return fallback ?? null

  if (icons[name as keyof typeof icons]) return icons[name as keyof typeof icons]

  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("")
  return icons[pascal as keyof typeof icons] || fallback || null
}
