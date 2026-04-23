"use client"

/**
 * Block 渲染器。
 * 遍历 Block 数组，按 type 分发到对应组件。
 */

import { Fragment, type ReactNode } from "react"
import type { Block } from "@/types/block"
import { SectionHeader } from "./SectionHeader"

interface BlockRendererProps {
  blocks: Block[]
  editable?: boolean
  onEditBlock?: (block: Block) => void
  onEditData?: (block: Block) => void
}

/** Block 列表渲染器 */
export function BlockRenderer({ blocks, editable, onEditBlock, onEditData }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <Fragment key={block.id}>
          {renderBlock(block, editable, onEditData)}
        </Fragment>
      ))}
    </>
  )
}

/** 单个 Block 渲染 */
function renderBlock(block: Block, editable?: boolean, onEditData?: (b: Block) => void): ReactNode {
  const header = block.showTitle
    ? <SectionHeader tag={block.sectionTag} title={block.sectionTitle} />
    : null
  const bg = block.bgColor === "gray" ? "bg-gray-50" : ""

  // Placeholder rendering — actual Block components will be plugged in Tasks 4-5
  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className="mt-8 rounded border border-dashed border-gray-300 p-8 text-center text-muted-foreground">
          Block: {block.type}
        </div>
      </div>
    </section>
  )
}
