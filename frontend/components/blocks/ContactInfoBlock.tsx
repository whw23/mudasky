"use client"

/**
 * 联系信息区块。
 * 数据来自全局 ConfigContext（非 block.data），因为联系信息是全站共享的。
 * 内部渲染 ContactInfoSection 组件。
 */

import { ContactInfoSection } from "@/components/about/ContactInfoSection"
import type { Block } from "@/types/block"
import type { ReactNode } from "react"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  /** 字段级编辑回调（contact_address 等），由 BlockRenderer 透传 */
  onEditConfig?: (section: string) => void
}

/** 联系信息区块：渲染 5 个联系字段 + 微信二维码 */
export function ContactInfoBlock({ block, header, bg, editable, onEditConfig }: BlockProps) {
  return (
    <div className={bg}>
      {header && <div className="mx-auto max-w-7xl px-4 pt-10">{header}</div>}
      <ContactInfoSection
        editable={editable}
        maxColumns={block.options?.maxColumns}
        onEditField={onEditConfig
          ? (field) => onEditConfig(`contact_${field}`)
          : undefined}
      />
    </div>
  )
}
