"use client"

/**
 * 嵌套条目列表字段。
 * 在 ArrayEditDialog 中渲染可增删的多语言子条目列表。
 */

import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { LocalizedField } from "@/lib/i18n-config"
import { LocalizedInput } from "./LocalizedInput"

interface NestedItemsFieldProps {
  label: string
  items: LocalizedField[]
  onChange: (items: LocalizedField[]) => void
}

/** 嵌套条目列表字段 */
export function NestedItemsField({ label, items, onChange }: NestedItemsFieldProps) {
  function handleItemChange(index: number, value: LocalizedField) {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  function handleAdd() {
    onChange([...items, { zh: "", en: "", ja: "", de: "" }])
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

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
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mt-6 size-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(i)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">暂无条目</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAdd}
        >
          <Plus className="mr-1 size-3" />
          添加{label}
        </Button>
      </div>
    </div>
  )
}
