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
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { icons, Trash2, Plus } from "lucide-react"
import { resolveIcon } from "@/lib/icon-utils"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
  onEditConfig?: (section: string) => void
  blockLabel?: string
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
export function DocListBlock({ block, header, bg, editable, onEdit, onFieldEdit, onEditConfig, blockLabel }: BlockProps) {
  const locale = useLocale()
  const items: Array<{ text: any }> = Array.isArray(block.data) ? block.data : []

  const DefaultIcon = resolveIcon(block.options?.iconName, icons.FileText)!

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label={blockLabel || "编辑文档列表"}>
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className={`mx-auto mt-8 grid w-fit gap-4 ${getDocGridClass(items.length, block.options?.maxColumns)}`}>
              {items.map((item, i) => {
                const ItemIcon = resolveIcon((item as any).icon, DefaultIcon) ?? DefaultIcon
                return (
                <div key={i} className="group relative">
                  <FieldOverlay
                    onClick={() => onEditConfig?.(`doc_list_item_${block.id}_${i}`)}
                    label={`编辑文档 ${i + 1}`}
                  >
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <ItemIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span className="text-sm">{getLocalizedValue(item.text, locale)}</span>
                    </div>
                  </FieldOverlay>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditConfig?.(`doc_list_delete_${block.id}_${i}`)
                    }}
                    className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                    title="移除"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                )
              })}
              {/* 添加文档按钮 */}
              <div
                className="hidden cursor-pointer group-hover/block:block"
                data-editable
                onClick={(e) => { e.stopPropagation(); onEditConfig?.(`doc_list_add_${block.id}`) }}
              >
                <div className="flex items-start gap-3 rounded-lg border p-4 opacity-50 transition-opacity hover:opacity-80">
                  <Plus className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">新建文档</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }

  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className={`mx-auto mt-8 grid w-fit gap-4 ${getDocGridClass(items.length, block.options?.maxColumns)}`}>
          {items.map((item, i) => {
            const ItemIcon = resolveIcon((item as any).icon, DefaultIcon) ?? DefaultIcon
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
                <ItemIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="text-sm">{getLocalizedValue(item.text, locale)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
