"use client"

/**
 * 文档列表区块。
 * 渲染图标 + 文本的网格列表。
 */

import { useLocale } from "next-intl"
import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { getLocalizedValue } from "@/lib/i18n-config"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { icons } from "lucide-react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}

/** 文档列表区块 */
export function DocListBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  const locale = useLocale()
  const items: Array<{ text: any }> = Array.isArray(block.data) ? block.data : []

  // 从 options 中动态解析图标
  const iconName = block.options?.iconName as string | undefined
  const Icon = icons[(iconName as keyof typeof icons)] || icons.FileText

  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
