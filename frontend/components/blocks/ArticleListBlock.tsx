"use client"

/**
 * 文章列表区块。
 * 从 options.categorySlug 读取分类参数，调用 ArticleListClient。
 */

import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { ArticleListClient } from "@/components/public/ArticleListClient"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}

/** 文章列表区块 */
export function ArticleListBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <ArticleListClient
          categorySlug={block.options?.categorySlug}
          editable={editable}
          onEdit={onEdit ? () => onEdit(block) : undefined}
        />
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={() => onEdit(block)} label="编辑文章列表">
        {el}
      </EditableOverlay>
    )
  }
  return el
}
