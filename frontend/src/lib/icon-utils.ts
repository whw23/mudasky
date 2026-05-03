/**
 * 图标工具函数。
 * 用于解析和转换图标名称到 Lucide 图标组件。
 */

import { icons, Circle, type LucideIcon } from "lucide-react"

/**
 * 解析图标名称到 Lucide 图标组件。
 *
 * @param name 图标名称（支持 PascalCase 或 kebab-case）
 * @returns Lucide 图标组件，未找到时返回默认圆形图标
 */
export function resolveIcon(name: string): LucideIcon {
  if (!name) return Circle

  // 转换 kebab-case 到 PascalCase
  const pascalCase = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")

  const Icon = icons[pascalCase as keyof typeof icons] as LucideIcon | undefined
  return Icon ?? Circle
}
