"use client"

/**
 * 案例网格区块。
 * 调用 CaseGrid 组件展示成功案例列表。
 */

import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { CaseGrid } from "@/components/public/CaseGrid"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}

/** 案例网格区块 */
export function CaseGridBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <CaseGrid
          editable={editable}
          onEdit={onEdit ? () => onEdit(block) : undefined}
        />
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={() => onEdit(block)} label="编辑案例网格">
        {el}
      </EditableOverlay>
    )
  }
  return el
}
