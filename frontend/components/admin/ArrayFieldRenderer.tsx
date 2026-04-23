"use client"

/**
 * 数组编辑弹窗的字段渲染器。
 * 根据字段类型渲染对应的输入组件。
 */

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { LocalizedField } from "@/lib/i18n-config"
import { LocalizedInput } from "./LocalizedInput"
import { NestedItemsField } from "./NestedItemsField"
import { ImageUploadField } from "./ImageUploadField"
import type { ArrayFieldDef } from "./ArrayEditDialog"

interface ArrayFieldRendererProps {
  item: Record<string, unknown>
  index: number
  field: ArrayFieldDef
  onUpdate: (index: number, key: string, value: unknown) => void
}

/** 渲染单个数组字段 */
export function ArrayFieldRenderer({ item, index, field, onUpdate }: ArrayFieldRendererProps) {
  if (field.type === "radio") return null
  const value = item[field.key]

  /* 图片上传 */
  if (field.type === "image") {
    return (
      <ImageUploadField
        key={field.key}
        label={field.label}
        imageId={(value ?? "") as string}
        onChange={(v) => onUpdate(index, field.key, v)}
      />
    )
  }

  /* 嵌套条目列表 */
  if (field.type === "nested-items") {
    return (
      <NestedItemsField
        key={field.key}
        label={field.label}
        items={(value ?? []) as LocalizedField[]}
        onChange={(v) => onUpdate(index, field.key, v)}
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
      />
    )
  }

  /* 普通文本或多行文本 */
  const strValue = (value ?? "") as string
  const Component = field.type === "textarea" ? Textarea : Input
  return (
    <div key={field.key} className="space-y-2">
      <Label className="text-sm font-medium">{field.label}</Label>
      <Component
        value={strValue}
        onChange={(e) => onUpdate(index, field.key, e.target.value)}
        {...(field.type === "textarea" ? { rows: field.rows ?? 3 } : {})}
      />
    </div>
  )
}
