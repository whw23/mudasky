"use client"

/**
 * Block 内容编辑 Tab 组件。
 * 根据 Block 类型渲染简单字段表单或数组条目列表。
 */

import { useEffect, useRef } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import { ArrayFieldRenderer } from "@/components/admin/ArrayFieldRenderer"
import type { Block, BlockType } from "@/types/block"
import type { ConfigLocale } from "@/lib/i18n-config"
import type { ArrayFieldDef } from "@/components/admin/ArrayEditDialog"

/** Block 编辑类型 */
export type BlockEditType = "simple" | "array" | "api"

/** 判断 Block 类型的编辑方式 */
export function getBlockEditType(type: BlockType): BlockEditType {
  if (type === "intro" || type === "cta") return "simple"
  if (type === "card_grid" || type === "step_list" || type === "doc_list" || type === "gallery" || type === "contact_info") return "array"
  return "api"
}

/** 简单字段定义 */
interface SimpleFieldDef {
  key: string
  label: string
  type: "text" | "textarea"
  localized: boolean
  rows?: number
}

/** 各 Block 类型的简单字段 */
const SIMPLE_FIELDS: Record<string, SimpleFieldDef[]> = {
  intro: [
    { key: "content", label: "内容", type: "textarea", localized: true, rows: 5 },
  ],
  cta: [
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "desc", label: "描述", type: "text", localized: true },
    { key: "link", label: "按钮链接", type: "text", localized: false },
  ],
}

/** 各 Block 类型的数组字段 */
const ARRAY_FIELDS: Record<string, ArrayFieldDef[]> = {
  step_list: [
    { key: "title", label: "标题", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true, rows: 2 },
  ],
  doc_list: [
    { key: "text", label: "文本", type: "text", localized: true },
  ],
  gallery: [
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "caption", label: "说明", type: "text", localized: true },
  ],
  contact_info: [
    { key: "icon", label: "图标名称", type: "text", localized: false },
    { key: "label", label: "标签", type: "text", localized: true },
    { key: "content", label: "内容", type: "text", localized: true },
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "hover_zoom", label: "悬浮放大", type: "switch", localized: false },
  ],
}

/** card_grid 各 cardType 的字段 */
const CARD_TYPE_FIELDS: Record<string, ArrayFieldDef[]> = {
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
    { key: "icon", label: "图标名称", type: "text", localized: false },
    { key: "label", label: "标签", type: "text", localized: true },
    { key: "items", label: "条目列表", type: "nested-items", localized: true },
  ],
}

interface BlockContentTabProps {
  block: Block
  locale: ConfigLocale
  data: any
  onDataChange: (data: any) => void
  defaultFieldIndex?: number | null
}

/** Block 内容编辑 Tab */
export function BlockContentTab({ block, locale, data, onDataChange, defaultFieldIndex }: BlockContentTabProps) {
  const editType = getBlockEditType(block.type)
  if (editType === "api") return null

  if (editType === "simple") {
    const fields = SIMPLE_FIELDS[block.type] || []
    return <SimpleFieldsForm fields={fields} data={data || {}} locale={locale} onChange={onDataChange} />
  }

  const fields = getArrayFields(block)
  const cardType = block.type === "card_grid" ? (block.options?.cardType || "guide") : ""
  const hasIconField = cardType === "guide" || cardType === "checklist"
  const description = hasIconField
    ? <>图标名称参考 <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide 图标库</a>，支持 PascalCase 和 kebab-case</>
    : null

  return (
    <ArrayItemsForm
      fields={fields}
      items={Array.isArray(data) ? data : []}
      locale={locale}
      onChange={onDataChange}
      description={description}
      defaultFieldIndex={defaultFieldIndex}
    />
  )
}

/** 获取数组类型 Block 的字段定义 */
function getArrayFields(block: Block): ArrayFieldDef[] {
  if (block.type === "card_grid") {
    const cardType = block.options?.cardType || "guide"
    return CARD_TYPE_FIELDS[cardType] || CARD_TYPE_FIELDS.guide
  }
  return ARRAY_FIELDS[block.type] || []
}

/* ========== 子组件 ========== */

/** 简单字段表单 */
function SimpleFieldsForm({
  fields,
  data,
  locale,
  onChange,
}: {
  fields: SimpleFieldDef[]
  data: Record<string, any>
  locale: ConfigLocale
  onChange: (data: Record<string, any>) => void
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <LocalizedInput
          key={field.key}
          value={data[field.key] ?? ""}
          onChange={(v) => onChange({ ...data, [field.key]: v })}
          label={field.label}
          multiline={field.type === "textarea"}
          rows={field.rows}
          locale={locale}
        />
      ))}
    </div>
  )
}

/** 数组条目列表表单 */
function ArrayItemsForm({
  fields,
  items,
  locale,
  onChange,
  description,
  defaultFieldIndex,
}: {
  fields: ArrayFieldDef[]
  items: Record<string, unknown>[]
  locale: ConfigLocale
  onChange: (items: Record<string, unknown>[]) => void
  description: React.ReactNode
  defaultFieldIndex?: number | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultFieldIndex != null && scrollRef.current) {
      const target = scrollRef.current.querySelector(`[data-item-index="${defaultFieldIndex}"]`)
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [defaultFieldIndex])
  /** 更新指定条目的指定字段 */
  function updateItem(index: number, key: string, value: unknown) {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    onChange(next)
  }

  /** 拖动排序 */
  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.source.index === result.destination.index) return
    const next = Array.from(items)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    onChange(next)
  }

  /** 添加空条目 */
  function handleAdd() {
    const empty: Record<string, unknown> = {}
    for (const f of fields) {
      empty[f.key] = f.type === "nested-items" ? [] : ""
    }
    onChange([...items, empty])
  }

  /** 删除条目 */
  function handleDelete(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div ref={scrollRef} className="space-y-3">
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="block-content-items">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {items.map((item, index) => (
                <Draggable key={index} draggableId={`content-item-${index}`} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      data-item-index={index}
                      style={dragProvided.draggableProps.style}
                      className={`rounded-lg border p-4 transition-shadow ${snapshot.isDragging ? "shadow-md" : ""}`}
                    >
                      {/* 条目头部 */}
                      <div className="mb-3 flex items-center gap-2">
                        <span {...dragProvided.dragHandleProps} className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                          <GripVertical className="size-4" />
                        </span>
                        <span className="text-sm font-medium">条目 {index + 1}</span>
                        <span className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {/* 字段列表 */}
                      <div className="space-y-3">
                        {fields.map((field) => (
                          <ArrayFieldRenderer
                            key={field.key}
                            item={item}
                            index={index}
                            field={field}
                            onUpdate={updateItem}
                            locale={locale}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button variant="outline" className="w-full" onClick={handleAdd}>
        <Plus className="mr-1 size-4" />
        添加条目
      </Button>
    </div>
  )
}
