"use client"

/**
 * 联系信息区块。
 * 数据来自全局 ConfigContext（非 block.data），因为联系信息是全站共享的。
 * 内部渲染 ContactInfoSection 组件。
 */

import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import type { Block } from "@/types/block"
import type { ReactNode } from "react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  /** 字段级编辑回调（contact_item_0 等），由 BlockRenderer 透传 */
  onEditConfig?: (section: string) => void
}

/** 联系信息区块：渲染动态联系条目 + 图片/二维码 */
export function ContactInfoBlock({ block, header, bg, editable, onEdit, onEditConfig }: BlockProps) {
  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑联系信息">
        <div className={bg}>
          {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
          <ContactInfoSection
            editable={editable}
            maxColumns={block.options?.maxColumns}
            onEditField={onEditConfig
              ? (index) => onEditConfig(`contact_item_${index}`)
              : undefined}
          />
        </div>
      </SpotlightOverlay>
    )
  }

  return (
    <div className={bg}>
      {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
      <ContactInfoSection maxColumns={block.options?.maxColumns} />
    </div>
  )
}
