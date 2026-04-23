# Block 统一编辑器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Block 的"区块配置"和"内容编辑"合并为一个 Tab 切换弹窗，同时用统一语言胶囊替代拥挤的多语言输入。

**Architecture:** 新建 UnifiedBlockEditor 组件替代 BlockEditDialog + BlockDataEditor。Header 右上角放 LanguageCapsule 控制所有多语言字段的语言切换。内容 Tab 按 Block 类型分三类处理：简单数据用表单、数组数据用条目列表、API 驱动型禁用 Tab。

**Tech Stack:** React, TypeScript, shadcn/ui (Dialog, Tabs, Switch, Select), @hello-pangea/dnd

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `components/admin/LanguageCapsule.tsx` | 语言切换胶囊公共组件 |
| 修改 | `components/admin/LocalizedInput.tsx` | 增加 `locale` prop 支持单语言模式 |
| 修改 | `components/admin/ArrayFieldRenderer.tsx` | 传递 `locale` 到 LocalizedInput |
| 修改 | `components/admin/NestedItemsField.tsx` | 传递 `locale` 到 LocalizedInput |
| 新建 | `components/admin/web-settings/UnifiedBlockEditor.tsx` | 统一编辑弹窗（Tab + 配置表单 + 语言胶囊） |
| 新建 | `components/admin/web-settings/BlockContentTab.tsx` | 内容编辑 Tab（简单数据 + 数组数据） |
| 修改 | `components/admin/web-settings/BlockEditorOverlay.tsx` | 传递 defaultTab 参数 |
| 修改 | `components/admin/web-settings/PageBlocksPreview.tsx` | 统一为单一 editingBlock 状态 |
| 删除 | `components/admin/web-settings/BlockEditDialog.tsx` | 合并到 UnifiedBlockEditor |
| 删除 | `components/admin/web-settings/BlockDataEditor.tsx` | 合并到 UnifiedBlockEditor |

---

### Task 1: LanguageCapsule 公共组件

**Files:**
- Create: `frontend/components/admin/LanguageCapsule.tsx`

- [ ] **Step 1: 创建 LanguageCapsule 组件**

```tsx
"use client"

/**
 * 语言切换胶囊。
 * 显示支持的语言按钮，点击切换当前编辑语言。
 */

import { CONFIG_LOCALES, type ConfigLocale } from "@/lib/i18n-config"

/** 语言短标签 */
const SHORT_LABELS: Record<string, string> = {
  zh: "中文",
  en: "EN",
  ja: "JA",
  de: "DE",
}

interface LanguageCapsuleProps {
  value: ConfigLocale
  onChange: (locale: ConfigLocale) => void
}

/** 语言切换胶囊 */
export function LanguageCapsule({ value, onChange }: LanguageCapsuleProps) {
  return (
    <div className="inline-flex gap-px rounded-md bg-muted p-0.5">
      {CONFIG_LOCALES.map(({ code }) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          className={`rounded px-2.5 py-1 text-xs transition-colors ${
            value === code
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {SHORT_LABELS[code]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/LanguageCapsule.tsx
git commit -m "feat: 新增 LanguageCapsule 语言切换胶囊组件"
```

---

### Task 2: LocalizedInput 支持单语言模式

**Files:**
- Modify: `frontend/components/admin/LocalizedInput.tsx`

- [ ] **Step 1: 新增 locale prop**

在 `LocalizedInputProps` 接口中新增可选的 `locale` 属性。当传入 `locale` 时，只渲染该语言的输入框（单行模式），不显示语言标签和 label。不传时保持原有行为。

```tsx
interface LocalizedInputProps {
  value: LocalizedField
  onChange: (value: Record<string, string>) => void
  label: string
  multiline?: boolean
  rows?: number
  locale?: ConfigLocale  // 新增：传入时只渲染该语言
}
```

- [ ] **Step 2: 修改渲染逻辑**

在组件函数中，如果 `locale` 有值，渲染单语言模式：

```tsx
export function LocalizedInput({
  value,
  onChange,
  label,
  multiline = false,
  rows = 3,
  locale,
}: LocalizedInputProps) {
  const normalized: Record<string, string> =
    typeof value === "string"
      ? { zh: value, en: "", ja: "", de: "" }
      : { zh: "", en: "", ja: "", de: "", ...value }

  function handleChange(loc: string, newValue: string) {
    onChange({ ...normalized, [loc]: newValue })
  }

  const InputComponent = multiline ? Textarea : Input

  // 单语言模式：只渲染指定语言的输入框
  if (locale) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        <InputComponent
          value={normalized[locale] || ""}
          onChange={(e) => handleChange(locale, e.target.value)}
          required={locale === "zh"}
          placeholder={locale === "zh" ? `${label}（必填）` : `${label}（可选）`}
          {...(multiline ? { rows } : {})}
        />
      </div>
    )
  }

  // 全语言模式（原有逻辑不变）
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-1.5">
        {CONFIG_LOCALES.map(({ code, label: langLabel }) => (
          <div key={code} className="flex items-start gap-2">
            <span className="mt-2 w-16 shrink-0 text-xs text-muted-foreground">
              {langLabel}
            </span>
            <InputComponent
              value={normalized[code] || ""}
              onChange={(e) => handleChange(code, e.target.value)}
              required={code === "zh"}
              placeholder={code === "zh" ? `${label}（必填）` : `${label}（可选）`}
              {...(multiline ? { rows } : {})}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/LocalizedInput.tsx
git commit -m "feat: LocalizedInput 支持 locale 单语言模式"
```

---

### Task 3: ArrayFieldRenderer 和 NestedItemsField 传递 locale

**Files:**
- Modify: `frontend/components/admin/ArrayFieldRenderer.tsx`
- Modify: `frontend/components/admin/NestedItemsField.tsx`

- [ ] **Step 1: ArrayFieldRenderer 增加 locale prop**

在 `ArrayFieldRendererProps` 接口中新增 `locale?` 属性，传递给 LocalizedInput 和 NestedItemsField：

```tsx
import type { ConfigLocale } from "@/lib/i18n-config"

interface ArrayFieldRendererProps {
  item: Record<string, unknown>
  index: number
  field: ArrayFieldDef
  onUpdate: (index: number, key: string, value: unknown) => void
  locale?: ConfigLocale  // 新增
}
```

在渲染多语言字段和嵌套条目处传递 `locale`：

```tsx
  /* 嵌套条目列表 */
  if (field.type === "nested-items") {
    return (
      <NestedItemsField
        key={field.key}
        label={field.label}
        items={(value ?? []) as LocalizedField[]}
        onChange={(v) => onUpdate(index, field.key, v)}
        locale={locale}
      />
    )
  }

  /* 多语言字段 */
  if (field.localized) {
    return (
      <LocalizedInput
        key={field.key}
        value={(value ?? "") as LocalizedField}
        onChange={(v) => onUpdate(index, field.key, v)}
        label={field.label}
        multiline={field.type === "textarea"}
        rows={field.rows}
        locale={locale}
      />
    )
  }
```

- [ ] **Step 2: NestedItemsField 增加 locale prop**

```tsx
import type { ConfigLocale } from "@/lib/i18n-config"

interface NestedItemsFieldProps {
  label: string
  items: LocalizedField[]
  onChange: (items: LocalizedField[]) => void
  locale?: ConfigLocale  // 新增
}
```

传递给内部的 LocalizedInput：

```tsx
export function NestedItemsField({ label, items, onChange, locale }: NestedItemsFieldProps) {
  // ...（逻辑不变）
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="flex-1">
              <LocalizedInput
                value={item}
                onChange={(v) => handleItemChange(i, v as LocalizedField)}
                label={`${label} ${i + 1}`}
                locale={locale}
              />
            </div>
            {/* 删除按钮不变 */}
          </div>
        ))}
        {/* 其余不变 */}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/ArrayFieldRenderer.tsx frontend/components/admin/NestedItemsField.tsx
git commit -m "feat: ArrayFieldRenderer/NestedItemsField 支持 locale 传递"
```

---

### Task 4: BlockContentTab 组件

**Files:**
- Create: `frontend/components/admin/web-settings/BlockContentTab.tsx`

- [ ] **Step 1: 创建 BlockContentTab**

从 BlockDataEditor 的字段定义（ARRAY_FIELDS、CARD_TYPE_FIELDS、SIMPLE_FIELDS）和 ArrayEditDialog 的条目编辑逻辑中提取内容编辑 Tab。

该组件接收 `block`、`locale`、`data`（本地状态）和 `onDataChange`，根据 block.type 渲染对应的表单。

```tsx
"use client"

/**
 * Block 内容编辑 Tab。
 * 根据 Block 类型渲染简单表单或数组条目列表。
 */

import { type ReactNode } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Block } from "@/types/block"
import type { ConfigLocale, LocalizedField } from "@/lib/i18n-config"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import { ArrayFieldRenderer } from "@/components/admin/ArrayFieldRenderer"

/** 简单字段 Block 的字段定义 */
const SIMPLE_FIELDS: Record<string, { fields: FieldDef[] }> = {
  intro: {
    fields: [
      { key: "content", label: "内容", type: "textarea", localized: true, rows: 5 },
    ],
  },
  cta: {
    fields: [
      { key: "title", label: "标题", type: "text", localized: true },
      { key: "desc", label: "描述", type: "text", localized: true },
    ],
  },
}

/** 数组字段 Block 的字段定义 */
const ARRAY_FIELDS: Record<string, FieldDef[]> = {
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

/** card_grid 各 cardType 字段 */
const CARD_TYPE_FIELDS: Record<string, FieldDef[]> = {
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

interface FieldDef {
  key: string
  label: string
  type: string
  localized: boolean
  rows?: number
}

interface BlockContentTabProps {
  block: Block
  locale: ConfigLocale
  data: any
  onDataChange: (data: any) => void
}

/** 获取 Block 的编辑类型 */
export function getBlockEditType(type: string): "simple" | "array" | "api" {
  if (SIMPLE_FIELDS[type]) return "simple"
  if (ARRAY_FIELDS[type] || type === "card_grid") return "array"
  return "api"
}

/** Block 内容编辑 Tab */
export function BlockContentTab({ block, locale, data, onDataChange }: BlockContentTabProps) {
  const editType = getBlockEditType(block.type)

  if (editType === "simple") {
    return (
      <SimpleFieldsForm
        fields={SIMPLE_FIELDS[block.type].fields}
        data={data || {}}
        locale={locale}
        onDataChange={onDataChange}
      />
    )
  }

  if (editType === "array") {
    let fields = ARRAY_FIELDS[block.type]
    if (block.type === "card_grid") {
      const cardType = block.options?.cardType || "guide"
      fields = CARD_TYPE_FIELDS[cardType] || CARD_TYPE_FIELDS.guide
    }
    return (
      <ArrayItemsForm
        fields={fields}
        items={Array.isArray(data) ? data : []}
        locale={locale}
        onItemsChange={onDataChange}
        description={block.type === "card_grid" && block.options?.cardType === "guide"
          ? <>图标名称参考 <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Lucide 图标库</a></>
          : undefined}
      />
    )
  }

  return null
}

/** 简单字段表单 */
function SimpleFieldsForm({
  fields, data, locale, onDataChange,
}: {
  fields: FieldDef[]
  data: Record<string, any>
  locale: ConfigLocale
  onDataChange: (d: Record<string, any>) => void
}) {
  function updateField(key: string, value: any) {
    onDataChange({ ...data, [key]: value })
  }

  return (
    <div className="space-y-4">
      {fields.map((f) =>
        f.localized ? (
          <LocalizedInput
            key={f.key}
            value={data[f.key] ?? ""}
            onChange={(v) => updateField(f.key, v)}
            label={f.label}
            locale={locale}
            multiline={f.type === "textarea"}
            rows={f.rows}
          />
        ) : null
      )}
    </div>
  )
}

/** 数组条目表单 */
function ArrayItemsForm({
  fields, items, locale, onItemsChange, description,
}: {
  fields: FieldDef[]
  items: Record<string, unknown>[]
  locale: ConfigLocale
  onItemsChange: (items: Record<string, unknown>[]) => void
  description?: ReactNode
}) {
  function updateItem(index: number, key: string, value: unknown) {
    const next = [...items]
    next[index] = { ...next[index], [key]: value }
    onItemsChange(next)
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.source.index === result.destination.index) return
    const next = Array.from(items)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    onItemsChange(next)
  }

  function handleAdd() {
    const empty: Record<string, unknown> = {}
    for (const f of fields) {
      empty[f.key] = f.type === "nested-items" ? [] : ""
    }
    onItemsChange([...items, empty])
  }

  function handleDelete(index: number) {
    onItemsChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="block-content-items">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {items.map((item, index) => (
                <Draggable key={index} draggableId={`content-${index}`} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      style={dragProvided.draggableProps.style}
                      className={`rounded-lg border p-4 ${snapshot.isDragging ? "shadow-md" : ""}`}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span {...dragProvided.dragHandleProps} className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                          <GripVertical className="size-4" />
                        </span>
                        <span className="text-sm font-medium">条目 {index + 1}</span>
                        <span className="flex-1" />
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(index)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {fields.map((field) => (
                          <ArrayFieldRenderer key={field.key} item={item} index={index} field={field as any} onUpdate={updateItem} locale={locale} />
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
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/web-settings/BlockContentTab.tsx
git commit -m "feat: 新增 BlockContentTab 内容编辑 Tab 组件"
```

---

### Task 5: UnifiedBlockEditor 组件

**Files:**
- Create: `frontend/components/admin/web-settings/UnifiedBlockEditor.tsx`

- [ ] **Step 1: 创建 UnifiedBlockEditor**

合并 BlockEditDialog（显示配置）和 BlockDataEditor（内容编辑）为 Tab 切换弹窗。

```tsx
"use client"

/**
 * Block 统一编辑弹窗。
 * Tab 切换：显示配置 + 内容编辑，Header 右上角语言胶囊。
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Block } from "@/types/block"
import type { ConfigLocale, LocalizedField } from "@/lib/i18n-config"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import { LanguageCapsule } from "@/components/admin/LanguageCapsule"
import { TypeSpecificFields } from "./BlockTypeFields"
import { BlockContentTab, getBlockEditType } from "./BlockContentTab"

/** 区块类型中文名 */
const BLOCK_TYPE_NAMES: Record<string, string> = {
  intro: "介绍", card_grid: "卡片网格", step_list: "步骤列表",
  doc_list: "文档清单", gallery: "图片墙", article_list: "文章列表",
  university_list: "院校列表", case_grid: "案例网格",
  featured_data: "精选展示", cta: "行动号召", contact_info: "联系信息",
}

interface UnifiedBlockEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  block: Block | null
  defaultTab?: "config" | "content"
  onSave: (updated: Block) => void
}

/** Block 统一编辑弹窗 */
export function UnifiedBlockEditor({
  open, onOpenChange, block, defaultTab, onSave,
}: UnifiedBlockEditorProps) {
  const [locale, setLocale] = useState<ConfigLocale>("zh")
  const [activeTab, setActiveTab] = useState<"config" | "content">("config")

  // 配置状态
  const [showTitle, setShowTitle] = useState(true)
  const [sectionTag, setSectionTag] = useState("")
  const [sectionTitle, setSectionTitle] = useState<Record<string, string>>({})
  const [bgColor, setBgColor] = useState<"white" | "gray">("white")
  const [options, setOptions] = useState<Record<string, any>>({})

  // 内容状态
  const [data, setData] = useState<any>(null)

  // 打开时初始化
  useEffect(() => {
    if (block && open) {
      setShowTitle(block.showTitle)
      setSectionTag(block.sectionTag)
      setSectionTitle(normalizeLocalized(block.sectionTitle))
      setBgColor(block.bgColor)
      setOptions({ ...block.options })
      setData(block.data != null ? JSON.parse(JSON.stringify(block.data)) : null)
      setLocale("zh")

      const editType = getBlockEditType(block.type)
      setActiveTab(defaultTab || (editType === "api" ? "config" : "content"))
    }
  }, [block, open, defaultTab])

  function updateOption(key: string, value: any) {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!block) return
    onSave({ ...block, showTitle, sectionTag, sectionTitle, bgColor, options, data })
    onOpenChange(false)
  }

  if (!block) return null

  const typeName = BLOCK_TYPE_NAMES[block.type] || block.type
  const editType = getBlockEditType(block.type)
  const hasContent = editType !== "api"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>编辑区块 — {typeName}</DialogTitle>
              <DialogDescription>修改显示选项和内容</DialogDescription>
            </div>
            <LanguageCapsule value={locale} onChange={setLocale} />
          </div>
        </DialogHeader>

        {/* Tab 栏 */}
        <div className="flex border-b">
          <button
            type="button"
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "config"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("config")}
          >
            显示配置
          </button>
          <button
            type="button"
            disabled={!hasContent}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "content"
                ? "border-b-2 border-primary text-primary"
                : hasContent
                  ? "text-muted-foreground hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/40"
            }`}
            onClick={() => hasContent && setActiveTab("content")}
          >
            内容编辑
          </button>
        </div>

        <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto [[data-fullscreen]_&]:max-h-none">
          {activeTab === "config" && (
            <ConfigTabContent
              showTitle={showTitle} onShowTitleChange={setShowTitle}
              sectionTag={sectionTag} onSectionTagChange={setSectionTag}
              sectionTitle={sectionTitle} onSectionTitleChange={setSectionTitle}
              bgColor={bgColor} onBgColorChange={setBgColor}
              locale={locale}
              blockType={block.type}
              options={options} onUpdateOption={updateOption}
              isApiDriven={!hasContent}
            />
          )}
          {activeTab === "content" && hasContent && (
            <BlockContentTab
              block={block}
              locale={locale}
              data={data}
              onDataChange={setData}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 标准化多语言字段 */
function normalizeLocalized(field: LocalizedField | undefined): Record<string, string> {
  if (!field) return { zh: "", en: "", ja: "", de: "" }
  if (typeof field === "string") return { zh: field, en: "", ja: "", de: "" }
  return { zh: "", en: "", ja: "", de: "", ...field }
}

/** 显示配置 Tab 内容 */
function ConfigTabContent({
  showTitle, onShowTitleChange,
  sectionTag, onSectionTagChange,
  sectionTitle, onSectionTitleChange,
  bgColor, onBgColorChange,
  locale, blockType, options, onUpdateOption,
  isApiDriven,
}: {
  showTitle: boolean; onShowTitleChange: (v: boolean) => void
  sectionTag: string; onSectionTagChange: (v: string) => void
  sectionTitle: Record<string, string>; onSectionTitleChange: (v: Record<string, string>) => void
  bgColor: "white" | "gray"; onBgColorChange: (v: "white" | "gray") => void
  locale: ConfigLocale
  blockType: string; options: Record<string, any>; onUpdateOption: (k: string, v: any) => void
  isApiDriven: boolean
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Label>显示标题区域</Label>
        <Switch checked={showTitle} onCheckedChange={onShowTitleChange} />
      </div>
      <div className="space-y-1.5">
        <Label>英文标签</Label>
        <Input value={sectionTag} onChange={(e) => onSectionTagChange(e.target.value)} placeholder="如 OUR STORY" />
      </div>
      <LocalizedInput value={sectionTitle} onChange={onSectionTitleChange} label="板块标题" locale={locale} />
      <div className="space-y-1.5">
        <Label>背景色</Label>
        <Select value={bgColor} onValueChange={(v) => onBgColorChange((v ?? "white") as "white" | "gray")}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="white">白色</SelectItem>
            <SelectItem value="gray">浅灰</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <TypeSpecificFields type={blockType} options={options} onUpdateOption={onUpdateOption} />
      {isApiDriven && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          💡 内容通过预览页面中的管理工具栏直接编辑。
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/web-settings/UnifiedBlockEditor.tsx
git commit -m "feat: 新增 UnifiedBlockEditor 统一编辑弹窗"
```

---

### Task 6: 更新 PageBlocksPreview 和 BlockEditorOverlay

**Files:**
- Modify: `frontend/components/admin/web-settings/PageBlocksPreview.tsx`
- Modify: `frontend/components/admin/web-settings/BlockEditorOverlay.tsx`

- [ ] **Step 1: 更新 BlockEditorOverlay**

新增 `onEditData` 回调，让齿轮按钮和内容点击分别传递不同的 defaultTab。

在 `BlockEditorOverlayProps` 接口中：将 `onEditConfig` 改名为 `onEditSettings`（齿轮按钮，打开 config tab），新增 `onEditData`（EditableOverlay 点击，打开 content tab）已经由 BlockRenderer 处理。

实际上只需要把 `onEditConfig` 传递的参数改为包含 defaultTab 信息。最简方案：`onEditConfig` 回调新增第二个参数 `defaultTab`。

修改 `BlockEditorOverlay.tsx` 第 42 行的 `onEditConfig` 类型和第 81 行的调用：

```tsx
interface BlockEditorOverlayProps {
  block: Block
  children: ReactNode
  onDelete: (blockId: string) => void
  onEditConfig: (block: Block, defaultTab?: "config" | "content") => void  // 新增 defaultTab
  dragHandleProps?: Record<string, any>
}
```

齿轮按钮的 onClick：

```tsx
onClick={() => onEditConfig(block, "config")}
```

- [ ] **Step 2: 更新 PageBlocksPreview**

替换两个旧组件为 UnifiedBlockEditor，合并双状态为单状态。

导入变更：

```tsx
// 删除
import { BlockEditDialog } from "./BlockEditDialog"
import { BlockDataEditor } from "./BlockDataEditor"
// 新增
import { UnifiedBlockEditor } from "./UnifiedBlockEditor"
```

状态变更（约第 42-45 行）：

```tsx
// 删除
const [editBlock, setEditBlock] = useState<Block | null>(null)
const [dataEditBlock, setDataEditBlock] = useState<Block | null>(null)
// 新增
const [editingBlock, setEditingBlock] = useState<Block | null>(null)
const [editingTab, setEditingTab] = useState<"config" | "content">("content")
```

修改 `handleEditConfig`（约第 93-95 行）接受 defaultTab：

```tsx
function handleEditConfig(block: Block, defaultTab?: "config" | "content") {
  setEditingBlock(block)
  setEditingTab(defaultTab || "config")
}
```

修改 `handleEditData`（约第 98-100 行）：

```tsx
function handleEditData(block: Block) {
  setEditingBlock(block)
  setEditingTab("content")
}
```

修改 `handleEditSave`（约第 112-117 行）合并配置和数据保存：

```tsx
function handleEditSave(updated: Block) {
  const newBlocks = blocks.map((b) => b.id === updated.id ? updated : b)
  saveBlocks(newBlocks)
  setEditingBlock(null)
}
```

替换弹窗渲染部分（约第 182-196 行）：

```tsx
{/* 删除 BlockEditDialog 和 BlockDataEditor */}
{/* 新增 UnifiedBlockEditor */}
<UnifiedBlockEditor
  open={!!editingBlock}
  onOpenChange={(open) => { if (!open) setEditingBlock(null) }}
  block={editingBlock}
  defaultTab={editingTab}
  onSave={handleEditSave}
/>
```

同时删除不再需要的 `handleDataSave` 函数（约第 103-109 行）。

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/BlockEditorOverlay.tsx frontend/components/admin/web-settings/PageBlocksPreview.tsx
git commit -m "refactor: PageBlocksPreview 集成 UnifiedBlockEditor"
```

---

### Task 7: 删除旧文件并验证

**Files:**
- Delete: `frontend/components/admin/web-settings/BlockEditDialog.tsx`
- Delete: `frontend/components/admin/web-settings/BlockDataEditor.tsx`

- [ ] **Step 1: 删除旧文件**

```bash
rm frontend/components/admin/web-settings/BlockEditDialog.tsx
rm frontend/components/admin/web-settings/BlockDataEditor.tsx
```

- [ ] **Step 2: 确认无残留引用**

```bash
grep -rn "BlockEditDialog\|BlockDataEditor" frontend/ --include="*.tsx" --include="*.ts"
```

预期：无输出。

- [ ] **Step 3: TypeScript 编译检查**

```bash
cd frontend && pnpm tsc --noEmit 2>&1 | head -30
```

预期：无错误。

- [ ] **Step 4: 提交**

```bash
git add -u frontend/components/admin/web-settings/BlockEditDialog.tsx frontend/components/admin/web-settings/BlockDataEditor.tsx
git commit -m "refactor: 删除 BlockEditDialog/BlockDataEditor，已合并到 UnifiedBlockEditor"
```

---

### Task 8: Playwright 验证

- [ ] **Step 1: 启动开发环境**

确认 `docker compose up` 正在运行。

- [ ] **Step 2: 验证统一弹窗 — 齿轮按钮打开（config tab）**

使用 Playwright MCP 导航到 `http://localhost/zh/admin/web-settings`，找到 CTA 区块的齿轮按钮并点击，截图确认弹窗打开且默认在"显示配置" Tab，右上角有语言胶囊。

- [ ] **Step 3: 验证统一弹窗 — 内容点击打开（content tab）**

关闭弹窗，点击 CTA 区块内容区域，截图确认弹窗打开且默认在"内容编辑" Tab。

- [ ] **Step 4: 验证语言胶囊切换**

在弹窗中切换语言胶囊到 EN，确认输入框内容切换为英文值。

- [ ] **Step 5: 验证 API 驱动型 Block**

切换到包含文章列表的页面（如新闻政策），点击文章列表区块的齿轮按钮，确认"内容编辑" Tab 置灰不可点击，底部有蓝色提示框。

- [ ] **Step 6: 验证数组类型 Block**

在首页预览中找到卡片网格或步骤列表区块，点击内容区域，确认弹窗显示条目列表，可增删拖动。

- [ ] **Step 7: 验证保存功能**

修改一个 Block 的板块标题，切换到内容 Tab 修改内容，保存后确认预览更新。

- [ ] **Step 8: 检查容器日志**

```bash
docker compose logs frontend --tail 20 | grep -i "error\|Cannot update"
```

预期：无错误。
