"use client"

/**
 * Block 数据编辑分发器。
 * 根据 Block.type 打开对应的编辑弹窗（ArrayEditDialog 或 ConfigEditDialog）。
 */

import { ArrayEditDialog } from "@/components/admin/ArrayEditDialog"
import { ConfigEditDialog } from "@/components/admin/ConfigEditDialog"
import type { Block } from "@/types/block"

interface BlockDataEditorProps {
  block: Block
  onClose: () => void
  onSave: (blockId: string, newData: any) => Promise<void>
}

/** 各 Block 类型的数组字段定义 */
const ARRAY_FIELDS: Record<string, { title: string; fields: any[]; description?: React.ReactNode }> = {
  step_list: {
    title: "编辑步骤列表",
    fields: [
      { key: "title", label: "标题", type: "text", localized: true },
      { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
    ],
  },
  doc_list: {
    title: "编辑文档清单",
    fields: [
      { key: "text", label: "文本", type: "text", localized: true },
    ],
  },
  card_grid: {
    title: "编辑卡片",
    fields: [], // 根据 cardType 动态决定
  },
  gallery: {
    title: "编辑图片墙",
    fields: [
      { key: "image_id", label: "图片", type: "image", localized: false },
      { key: "caption", label: "说明", type: "text", localized: true },
    ],
  },
}

/** card_grid 各 cardType 的字段 */
const CARD_TYPE_FIELDS: Record<string, any[]> = {
  guide: [
    { key: "icon", label: "图标名称", type: "text", localized: false },
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
  ],
  timeline: [
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "time", label: "时间", type: "text", localized: true },
    { key: "desc", label: "描述", type: "text", localized: true },
  ],
  city: [
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "city", label: "城市", type: "text", localized: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
  ],
  program: [
    { key: "name", label: "项目名称", type: "text", localized: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
    { key: "features", label: "特点列表", type: "nested-items", localized: true },
  ],
  checklist: [
    { key: "label", label: "标签", type: "text", localized: true },
    { key: "items", label: "条目列表", type: "nested-items", localized: true },
  ],
}

/** 简单字段 Block 的 ConfigEditDialog 字段定义 */
const SIMPLE_FIELDS: Record<string, { title: string; fields: any[] }> = {
  intro: {
    title: "编辑介绍内容",
    fields: [
      { key: "content", label: "内容", type: "textarea", localized: true, rows: 5 },
    ],
  },
  cta: {
    title: "编辑行动号召",
    fields: [
      { key: "title", label: "标题", type: "text", localized: true },
      { key: "desc", label: "描述", type: "text", localized: true },
    ],
  },
}

/** Block 数据编辑分发 */
export function BlockDataEditor({ block, onClose, onSave }: BlockDataEditorProps) {
  const { type } = block

  // 简单字段类型（intro, cta）→ ConfigEditDialog
  if (SIMPLE_FIELDS[type]) {
    const { title, fields } = SIMPLE_FIELDS[type]
    return (
      <ConfigEditDialog
        open
        onOpenChange={(open) => { if (!open) onClose() }}
        title={title}
        fields={fields}
        data={block.data || {}}
        onSave={async (data) => { await onSave(block.id, data) }}
      />
    )
  }

  // 数组字段类型（step_list, doc_list, card_grid, gallery）→ ArrayEditDialog
  if (ARRAY_FIELDS[type]) {
    let { title, fields, description } = ARRAY_FIELDS[type]

    // card_grid 根据 cardType 选择字段
    if (type === "card_grid") {
      const cardType = block.options?.cardType || "guide"
      fields = CARD_TYPE_FIELDS[cardType] || CARD_TYPE_FIELDS.guide
      title = `编辑卡片 (${cardType})`
      if (cardType === "guide") {
        description = <>图标名称参考 <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide 图标库</a></>
      }
    }

    return (
      <ArrayEditDialog
        open
        onOpenChange={(open) => { if (!open) onClose() }}
        title={title}
        description={description}
        fields={fields}
        data={Array.isArray(block.data) ? block.data : []}
        onSave={async (data) => { await onSave(block.id, data) }}
      />
    )
  }

  // API 驱动型（article_list, university_list, case_grid, featured_data）无数据编辑
  onClose()
  return null
}
