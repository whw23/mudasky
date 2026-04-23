"use client"

/**
 * 页面 Block 渲染器。
 * 从 SSR 预取的 initialBlocks 或 ConfigContext 读取 Block 列表。
 */

import { useConfig } from "@/contexts/ConfigContext"
import { BlockRenderer } from "./BlockRenderer"
import type { Block } from "@/types/block"

interface PageBlocksRendererProps {
  pageSlug: string
  initialBlocks?: Block[]
  editable?: boolean
  onEditBlock?: (block: Block) => void
  onEditData?: (block: Block) => void
}

/** 页面级 Block 渲染器 */
export function PageBlocksRenderer({
  pageSlug, initialBlocks, editable, onEditBlock, onEditData,
}: PageBlocksRendererProps) {
  const { pageBlocks } = useConfig()
  const contextBlocks = pageBlocks[pageSlug]
  const blocks = contextBlocks?.length > 0 ? contextBlocks : initialBlocks ?? []

  if (blocks.length === 0) return null

  return (
    <BlockRenderer
      blocks={blocks}
      editable={editable}
      onEditBlock={onEditBlock}
      onEditData={onEditData}
    />
  )
}
