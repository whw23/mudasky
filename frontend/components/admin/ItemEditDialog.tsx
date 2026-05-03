"use client"

/**
 * 通用条目编辑弹窗。
 * 字段定义驱动，LanguageCapsule 语言切换。
 */

import { useState, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LanguageCapsule } from "@/components/admin/LanguageCapsule"
import { IconPicker } from "@/components/admin/IconPicker"
import { ImageUploadField } from "@/components/admin/ImageUploadField"
import { CONFIG_LOCALES, type ConfigLocale } from "@/lib/i18n-config"

/** 字段定义 */
export interface FieldDefinition {
  key: string
  label: string
  type: "text" | "textarea" | "icon" | "image" | "switch" | "select" | "number"
  localized: boolean
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  description?: string
  showWhen?: (data: Record<string, unknown>) => boolean
}

interface ItemEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  fields: FieldDefinition[]
  data: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  sourceHint?: string
}

/** 通用条目编辑弹窗 */
export function ItemEditDialog({
  open, onOpenChange, title, subtitle, fields, data, onSave, sourceHint,
}: ItemEditDialogProps) {
  const [locale, setLocale] = useState<ConfigLocale>("zh")
  const [formData, setFormData] = useState<Record<ConfigLocale, Record<string, unknown>>>(() =>
    initFormData(fields, data),
  )
  const [sharedData, setSharedData] = useState<Record<string, unknown>>(() =>
    initSharedData(fields, data),
  )
  const [saving, setSaving] = useState(false)

  const getLocaleValue = useCallback(
    (key: string) => (formData[locale]?.[key] as string) ?? "",
    [formData, locale],
  )

  function setLocaleValue(key: string, value: string): void {
    setFormData((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [key]: value },
    }))
  }

  function setSharedValue(key: string, value: unknown): void {
    setSharedData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      const merged: Record<string, unknown> = { ...sharedData }
      for (const field of fields) {
        if (field.localized) {
          const localized: Record<string, string> = {}
          for (const loc of CONFIG_LOCALES) {
            const v = formData[loc.code as ConfigLocale]?.[field.key]
            if (v) localized[loc.code] = v as string
          }
          merged[field.key] = localized
        }
      }
      await onSave(merged)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const mergedForCondition = { ...sharedData, ...formData[locale] }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-16">
            <div>
              <DialogTitle>{title}</DialogTitle>
              {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
            </div>
            <LanguageCapsule value={locale} onChange={setLocale} />
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {sourceHint && (
            <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {sourceHint}
            </div>
          )}
          {fields.map((field) => {
            if (field.showWhen && !field.showWhen(mergedForCondition)) return null
            return (
              <div key={field.key}>
                <Label className="mb-1.5 block text-sm font-medium">
                  {field.label}
                  {field.required && locale === "zh" && (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </Label>
                {renderField(field, locale, getLocaleValue, setLocaleValue, sharedData, setSharedValue)}
                {field.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            )
          })}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 渲染单个字段 */
function renderField(
  field: FieldDefinition,
  locale: ConfigLocale,
  getLocaleValue: (key: string) => string,
  setLocaleValue: (key: string, value: string) => void,
  sharedData: Record<string, unknown>,
  setSharedValue: (key: string, value: unknown) => void,
): React.ReactNode {
  const isOptional = locale !== "zh"
  const ph = field.placeholder ?? (isOptional && field.localized ? `${field.label}（可选）` : "")

  if (field.type === "icon") {
    return (
      <IconPicker
        value={(sharedData[field.key] as string) ?? ""}
        onChange={(v: string) => setSharedValue(field.key, v)}
      />
    )
  }
  if (field.type === "image") {
    return (
      <ImageUploadField
        label=""
        imageId={(sharedData[field.key] as string) ?? ""}
        onChange={(imageId: string) => setSharedValue(field.key, imageId)}
      />
    )
  }
  if (field.type === "switch") {
    return (
      <Switch
        checked={!!sharedData[field.key]}
        onCheckedChange={(v) => setSharedValue(field.key, v)}
      />
    )
  }
  if (field.type === "textarea") {
    return field.localized ? (
      <Textarea
        value={getLocaleValue(field.key)}
        onChange={(e) => setLocaleValue(field.key, e.target.value)}
        placeholder={ph}
        rows={3}
      />
    ) : (
      <Textarea
        value={(sharedData[field.key] as string) ?? ""}
        onChange={(e) => setSharedValue(field.key, e.target.value)}
        placeholder={ph}
        rows={3}
      />
    )
  }
  // text, number, select — 默认用 Input
  return field.localized ? (
    <Input
      value={getLocaleValue(field.key)}
      onChange={(e) => setLocaleValue(field.key, e.target.value)}
      placeholder={ph}
    />
  ) : (
    <Input
      value={(sharedData[field.key] as string) ?? ""}
      onChange={(e) => setSharedValue(field.key, e.target.value)}
      placeholder={ph}
    />
  )
}

/** 初始化多语言表单数据 */
function initFormData(
  fields: FieldDefinition[],
  data: Record<string, unknown>,
): Record<ConfigLocale, Record<string, unknown>> {
  const result = {} as Record<ConfigLocale, Record<string, unknown>>
  for (const loc of CONFIG_LOCALES) {
    const k = loc.code as ConfigLocale
    result[k] = {}
    for (const field of fields) {
      if (!field.localized) continue
      const val = data[field.key]
      if (typeof val === "object" && val !== null) {
        result[k][field.key] = (val as Record<string, string>)[k] ?? ""
      } else if (typeof val === "string" && k === "zh") {
        result[k][field.key] = val
      } else {
        result[k][field.key] = ""
      }
    }
  }
  return result
}

/** 初始化非多语言（共享）字段数据 */
function initSharedData(
  fields: FieldDefinition[],
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.localized) continue
    result[field.key] = data[field.key] ?? (field.type === "switch" ? false : "")
  }
  return result
}
