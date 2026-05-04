"use client"

/**
 * Block 内容编辑 Tab 组件。
 * 根据 Block 类型渲染简单字段表单或数组条目列表。
 */

import { useEffect, useRef } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Info, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SwitchField } from "@/components/admin/SwitchField"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import { ArrayFieldRenderer } from "@/components/admin/ArrayFieldRenderer"
import { useConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import { resolveIcon } from "@/lib/icon-utils"
import { AddContactItemMenu } from "@/components/blocks/AddContactItemMenu"
import { BlockItemsList } from "@/components/admin/web-settings/BlockItemsList"
import type { Block, BlockType, ContactInfoBlockItem } from "@/types/block"
import type { ConfigLocale } from "@/lib/i18n-config"
import type { ArrayFieldDef } from "@/components/admin/ArrayEditDialog"

/** Block 编辑类型 */
export type BlockEditType = "simple" | "array" | "api"

/** 判断 Block 类型的编辑方式 */
export function getBlockEditType(type: BlockType): BlockEditType {
  if (type === "intro" || type === "cta") return "simple"
  if (
    type === "card_grid" || type === "step_list" ||
    type === "doc_list" || type === "gallery" || type === "contact_info"
  ) return "array"
  return "api"
}

/** 简单字段定义 */
interface SimpleFieldDef {
  key: string
  label: string
  type: "text" | "textarea" | "switch"
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
    { key: "showLogin", label: "未登录时弹出登录弹窗", type: "switch", localized: false },
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
  onEditConfig?: (section: string) => void
  onClose?: () => void
}

/** Block 内容编辑 Tab */
export function BlockContentTab({ block, locale, data, onDataChange, defaultFieldIndex, onEditConfig, onClose }: BlockContentTabProps) {
  const editType = getBlockEditType(block.type)
  if (editType === "api") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <Info className="mb-2 size-8" />
        <p className="text-sm">此区块的数据通过管理页面编辑</p>
        <p className="mt-1 text-xs">使用左侧导航栏进入对应的管理模块</p>
      </div>
    )
  }

  if (editType === "simple") {
    const fields = SIMPLE_FIELDS[block.type] || []
    return <SimpleFieldsForm fields={fields} data={data || {}} locale={locale} onChange={onDataChange} />
  }

  if (block.type === "contact_info" && onEditConfig) {
    return <ContactItemsList block={block} locale={locale} onEditConfig={onEditConfig} />
  }

  if (block.type === "card_grid" && onEditConfig) {
    return <CardGridItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  if (block.type === "step_list" && onEditConfig) {
    return <StepListItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  if (block.type === "doc_list" && onEditConfig) {
    return <DocListItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
  }

  if (block.type === "gallery" && onEditConfig) {
    return <GalleryItemsList block={block} locale={locale} data={data} onEditConfig={onEditConfig} />
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

/** 联系信息条目列表（支持拖动排序） */
function ContactItemsList({
  block, locale, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  onEditConfig: (section: string) => void
}) {
  const { contactItems, pageBlocks } = useConfig()
  const currentBlock = Object.values(pageBlocks).flat().find((b) => b.id === block.id)
  const items: ContactInfoBlockItem[] | null = currentBlock?.data?.items ?? block.data?.items ?? null
  const resolved = resolveContactItems(items, contactItems, locale, block.id)

  return (
    <BlockItemsList
      items={resolved}
      onEditItem={(idx) => onEditConfig(resolved[idx].editSection)}
      onDeleteItem={(idx) => onEditConfig(`contact_item_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`contact_item_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item) => ({
        icon: item.icon,
        label: item.label,
        content: item.content,
        badge: item.source === "global" ? "共享" : undefined,
      })}
      addButton={
        <AddContactItemMenu
          block={block}
          items={items}
          globalItems={contactItems}
          onEditConfig={onEditConfig}
          compact
        />
      }
    />
  )
}

/** 从 ConfigContext 读最新的 Block data（稳定引用避免跳动） */
function useLatestBlockData(block: Block, fallbackData: any): any[] {
  const { pageBlocks } = useConfig()
  const latest = Object.values(pageBlocks).flat().find((b) => b.id === block.id)
  const raw = latest?.data ?? fallbackData
  const items = Array.isArray(raw) ? raw : []
  const ref = useRef(items)
  const json = JSON.stringify(items)
  const prevJson = useRef(json)
  if (json !== prevJson.current) {
    ref.current = items
    prevJson.current = json
  }
  return ref.current
}

/** card_grid 卡片列表（支持拖动排序） */
function CardGridItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const cards = useLatestBlockData(block, data)
  const cardType = block.options?.cardType || "guide"

  return (
    <BlockItemsList
      items={cards}
      onEditItem={(idx) => onEditConfig(`card_grid_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`card_grid_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`card_grid_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const firstTextField = getFirstTextField(item, cardType, locale)
        const secondTextField = getSecondTextField(item, cardType, locale)
        const iconField = getIconField(item, cardType)
        return {
          icon: iconField,
          label: firstTextField || `卡片 ${idx + 1}`,
          content: secondTextField || '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`card_grid_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加卡片
        </Button>
      }
    />
  )
}

/** step_list 步骤列表（支持拖动排序） */
function StepListItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const steps = useLatestBlockData(block, data)

  return (
    <BlockItemsList
      items={steps}
      onEditItem={(idx) => onEditConfig(`step_list_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`step_list_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`step_list_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const title = typeof item.title === 'object' ? (item.title[locale] || item.title.zh || '') : (item.title || '')
        const desc = typeof item.desc === 'object' ? (item.desc[locale] || item.desc.zh || '') : (item.desc || '')
        return {
          label: title || `步骤 ${idx + 1}`,
          content: desc || '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`step_list_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加步骤
        </Button>
      }
    />
  )
}

/** doc_list 文档列表（支持拖动排序） */
function DocListItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const docs = useLatestBlockData(block, data)

  return (
    <BlockItemsList
      items={docs}
      onEditItem={(idx) => onEditConfig(`doc_list_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`doc_list_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`doc_list_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const text = typeof item.text === 'object' ? (item.text[locale] || item.text.zh || '') : (item.text || '')
        return {
          icon: item.icon || block.options?.iconName,
          label: text || `文档 ${idx + 1}`,
          content: '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`doc_list_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加文档
        </Button>
      }
    />
  )
}

/** gallery 图片列表（支持拖动排序） */
function GalleryItemsList({
  block, locale, data, onEditConfig,
}: {
  block: Block
  locale: ConfigLocale
  data: any
  onEditConfig: (section: string) => void
}) {
  const items = useLatestBlockData(block, data)

  return (
    <BlockItemsList
      items={items}
      onEditItem={(idx) => onEditConfig(`gallery_item_${block.id}_${idx}`)}
      onDeleteItem={(idx) => onEditConfig(`gallery_delete_${block.id}_${idx}`)}
      onReorder={(fromIndex, toIndex) => {
        onEditConfig(`gallery_reorder_${block.id}_${fromIndex}_${toIndex}`)
      }}
      renderItemSummary={(item, idx) => {
        const caption = typeof item.caption === 'object' ? (item.caption[locale] || item.caption.zh || '') : (item.caption || '')
        return {
          label: caption || `图片 ${idx + 1}`,
          content: item.image_id ? `ID: ${item.image_id}` : '',
        }
      }}
      addButton={
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onEditConfig(`gallery_add_${block.id}`)}
        >
          <Plus className="mr-1 size-4" />
          添加图片
        </Button>
      }
    />
  )
}

/** 获取卡片的第一个文本字段（作为标签） */
function getFirstTextField(item: any, cardType: string, locale: string): string {
  const fieldMap: Record<string, string> = {
    guide: 'title',
    timeline: 'title',
    city: 'city',
    program: 'name',
    checklist: 'label',
  }
  const key = fieldMap[cardType]
  if (!key) return ''
  const value = item[key]
  return typeof value === 'object' ? (value[locale] || value.zh || '') : (value || '')
}

/** 获取卡片的第二个文本字段（作为内容） */
function getSecondTextField(item: any, cardType: string, locale: string): string {
  const fieldMap: Record<string, string> = {
    guide: 'desc',
    timeline: 'time',
    city: 'country',
    program: 'country',
    checklist: 'items',
  }
  const key = fieldMap[cardType]
  if (!key) return ''
  const value = item[key]
  if (key === 'items' && Array.isArray(value)) {
    // checklist.items 是数组，显示第一项
    const first = value[0]
    return typeof first === 'object' ? (first[locale] || first.zh || '') : (first || '')
  }
  return typeof value === 'object' ? (value[locale] || value.zh || '') : (value || '')
}

/** 获取卡片的图标字段 */
function getIconField(item: any, cardType: string): string | undefined {
  if (cardType === 'guide' || cardType === 'checklist') {
    return item.icon || undefined
  }
  return undefined
}

/** 解析联系条目到列表展示数据 */
function resolveContactItems(
  items: ContactInfoBlockItem[] | null,
  globalItems: Array<{ id: string; icon: string; label: any; content: any }>,
  locale: string,
  blockId: string,
): Array<{ icon: string; label: string; content: string; source: "global" | "custom"; editSection: string }> {
  const source = items ?? globalItems.map((g) => ({ type: "global" as const, id: g.id }))
  return source.map((item, idx) => {
    if (item.type === "global") {
      const g = globalItems.find((gi) => gi.id === item.id)
      if (!g) return null
      return {
        icon: g.icon,
        label: getLocalizedValue(g.label, locale),
        content: getLocalizedValue(g.content, locale),
        source: "global" as const,
        editSection: `contact_item_global_${g.id}`,
      }
    }
    return {
      icon: item.icon,
      label: getLocalizedValue(item.label, locale),
      content: getLocalizedValue(item.content, locale),
      source: "custom" as const,
      editSection: `contact_item_custom_${blockId}_${idx}`,
    }
  }).filter(Boolean) as any[]
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
      {fields.map((field) => {
        if (field.type === "switch") {
          return (
            <SwitchField
              key={field.key}
              label={field.label}
              checked={!!data[field.key]}
              onCheckedChange={(v) => onChange({ ...data, [field.key]: v })}
            />
          )
        }
        if (field.localized) {
          return (
            <LocalizedInput
              key={field.key}
              value={data[field.key] ?? ""}
              onChange={(v) => onChange({ ...data, [field.key]: v })}
              label={field.label}
              multiline={field.type === "textarea"}
              rows={field.rows}
              locale={locale}
            />
          )
        }
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Input
              value={(data[field.key] ?? "") as string}
              onChange={(e) => onChange({ ...data, [field.key]: e.target.value })}
            />
          </div>
        )
      })}
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
