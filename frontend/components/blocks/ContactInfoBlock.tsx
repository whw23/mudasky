"use client"

/**
 * 联系信息区块。
 * 数据解析逻辑：block.data.items 支持 global 引用和 custom 自定义条目。
 * 内部渲染 ContactInfoSection 组件。
 */

import { useLocale } from "next-intl"
import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { AddContactItemMenu } from "@/components/blocks/AddContactItemMenu"
import { useConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import type { Block, ContactInfoBlockItem } from "@/types/block"
import type { ReactNode } from "react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  /** 字段级编辑回调，由 BlockRenderer 透传 */
  onEditConfig?: (section: string) => void
}

/** 联系信息区块：渲染动态联系条目 + 图片/二维码 */
export function ContactInfoBlock({ block, header, bg, editable, onEdit, onEditConfig }: BlockProps) {
  const { contactItems: rawContactItems } = useConfig()
  const locale = useLocale()
  const items: ContactInfoBlockItem[] | null = block.data?.items ?? null
  const displayItems = resolveItems(items, rawContactItems, locale)

  if (editable && onEdit && onEditConfig) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑联系信息">
        <div className={bg}>
          {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
          <ContactInfoSection
            editable={editable}
            maxColumns={block.options?.maxColumns}
            items={displayItems}
            onEditField={(index) => {
              const itemDef = items?.[Number(index)]
              if (!itemDef || itemDef.type === "global") {
                onEditConfig(`contact_item_global_${itemDef?.id ?? index}`)
              } else {
                onEditConfig(`contact_item_custom_${block.id}_${index}`)
              }
            }}
            onDelete={(index) => onEditConfig(`contact_item_delete_${block.id}_${index}`)}
          />
          <div className="mx-auto max-w-7xl px-4 pb-6" data-editable>
            <AddContactItemMenu
              block={block}
              items={items}
              globalItems={rawContactItems}
              onEditConfig={onEditConfig}
            />
          </div>
        </div>
      </SpotlightOverlay>
    )
  }

  return (
    <div className={bg}>
      {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
      <ContactInfoSection maxColumns={block.options?.maxColumns} items={displayItems} />
    </div>
  )
}

/**
 * 解析 Block 条目到展示数据。
 * items 为 null 时回退到全量 globalItems。
 */
function resolveItems(
  items: ContactInfoBlockItem[] | null,
  globalItems: Array<{ id: string; icon: string; label: any; content: any; image_id: string | null; hover_zoom: boolean }>,
  locale: string,
): Array<{ icon: string; label: string; content: string; image_id: string | null; hover_zoom: boolean }> {
  if (!items) {
    return globalItems.map((g) => ({
      icon: g.icon,
      label: getLocalizedValue(g.label, locale),
      content: getLocalizedValue(g.content, locale),
      image_id: g.image_id,
      hover_zoom: g.hover_zoom,
    }))
  }

  const result: Array<{ icon: string; label: string; content: string; image_id: string | null; hover_zoom: boolean }> = []
  for (const item of items) {
    if (item.type === "global") {
      const g = globalItems.find((gi) => gi.id === item.id)
      if (!g) continue
      result.push({
        icon: g.icon,
        label: getLocalizedValue(g.label, locale),
        content: getLocalizedValue(g.content, locale),
        image_id: g.image_id,
        hover_zoom: g.hover_zoom,
      })
    } else {
      result.push({
        icon: item.icon,
        label: getLocalizedValue(item.label, locale),
        content: getLocalizedValue(item.content, locale),
        image_id: item.image_id,
        hover_zoom: item.hover_zoom,
      })
    }
  }
  return result
}
