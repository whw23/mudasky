"use client"

/**
 * 院校列表区块。
 * 调用 UniversityList 组件展示完整院校列表（含搜索筛选）。
 */

import type { ReactNode } from "react"
import type { Block } from "@/types/block"
import { UniversityList } from "@/components/public/UniversityList"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
}

/** 院校列表区块 */
export function UniversityListBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <UniversityList
          editable={editable}
          onEdit={onEdit ? () => onEdit(block) : undefined}
        />
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={() => onEdit(block)} label="编辑院校列表">
        {el}
      </EditableOverlay>
    )
  }
  return el
}
