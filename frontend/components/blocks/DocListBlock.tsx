"use client"

/**
 * 文档列表区块。
 * 渲染图标 + 文本的网格列表。
 * 图标名称参考：https://lucide.dev/icons/
 */

import { useLocale } from "next-intl"
import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { getLocalizedValue } from "@/lib/i18n-config"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { icons } from "lucide-react"
import { resolveIcon } from "@/lib/icon-utils"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}

/** 根据数据量和最大列数计算网格样式 */
function getDocGridClass(count: number, maxColumns?: number): string {
  const cols = Math.min(count, maxColumns ?? 2)
  if (cols <= 1) return "grid-cols-1"
  if (cols >= 4) return "sm:grid-cols-2 lg:grid-cols-4"
  if (cols >= 3) return "sm:grid-cols-2 lg:grid-cols-3"
  return "sm:grid-cols-2"
}

/** 文档列表区块 */
export function DocListBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  const locale = useLocale()
  const items: Array<{ text: any }> = Array.isArray(block.data) ? block.data : []

  const Icon = resolveIcon(block.options?.iconName, icons.FileText)!

  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className={`mt-8 grid gap-4 ${getDocGridClass(items.length, block.options?.maxColumns)}`}>
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <span className="text-sm">{getLocalizedValue(item.text, locale)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={() => onEdit(block)} label="编辑文档列表">
        {el}
      </EditableOverlay>
    )
  }
  return el
}
