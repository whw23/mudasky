"use client"

/**
 * 通用数组编辑弹窗。
 * 支持多条目增删、拖动排序、多语言字段编辑。
 */

import { useEffect, useState } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { LocalizedField } from "@/lib/i18n-config"
import { LocalizedInput } from "./LocalizedInput"

/** 数组字段定义 */
export interface ArrayFieldDef {
  key: string
  label: string
  type: "text" | "textarea"
  localized: boolean
  rows?: number
}

export interface ArrayEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: ArrayFieldDef[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: any[]) => Promise<void>
}

/** 获取条目的预览文本（取第一个字段的中文值） */
function getPreviewText(item: Record<string, unknown>, fields: ArrayFieldDef[]): string {
  if (fields.length === 0) return ""
  const val = item[fields[0].key]
  if (!val) return ""
  if (typeof val === "string") return val
  return (val as Record<string, string>).zh || ""
}

/** 通用数组编辑弹窗 */
export function ArrayEditDialog({
  open,
  onOpenChange,
  title,
  fields,
  data,
  onSave,
}: ArrayEditDialogProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  /* 打开时深拷贝数据到本地状态 */
  useEffect(() => {
    if (open) {
      setItems(JSON.parse(JSON.stringify(data)))
    }
  }, [open, data])

  /** 更新指定条目的指定字段 */
  function updateItem(index: number, key: string, value: unknown) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  /** 拖动结束：重新排序 */
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    if (result.source.index === result.destination.index) return

    const next = Array.from(items)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    setItems(next)
  }

  /** 添加空条目 */
  function handleAdd() {
    const empty: Record<string, unknown> = {}
    for (const field of fields) empty[field.key] = ""
    setItems((prev) => [...prev, empty])
  }

  /** 确认删除条目 */
  function handleDeleteConfirm() {
    if (deleteIndex === null) return
    setItems((prev) => prev.filter((_, i) => i !== deleteIndex))
    setDeleteIndex(null)
  }

  /** 保存 */
  async function handleSave() {
    setSaving(true)
    try {
      await onSave(items)
      toast.success("保存成功")
      onOpenChange(false)
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  /** 渲染单个字段 */
  function renderField(item: Record<string, unknown>, index: number, field: ArrayFieldDef) {
    const value = item[field.key]

    /* 多语言字段 */
    if (field.localized) {
      return (
        <LocalizedInput
          key={field.key}
          value={(value ?? "") as LocalizedField}
          onChange={(v) => updateItem(index, field.key, v)}
          label={field.label}
          multiline={field.type === "textarea"}
          rows={field.rows}
        />
      )
    }

    const strValue = (value ?? "") as string

    /* 多行文本 */
    if (field.type === "textarea") {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <Textarea
            value={strValue}
            onChange={(e) => updateItem(index, field.key, e.target.value)}
            rows={field.rows ?? 3}
          />
        </div>
      )
    }

    /* 普通文本 */
    return (
      <div key={field.key} className="space-y-2">
        <Label className="text-sm font-medium">{field.label}</Label>
        <Input
          value={strValue}
          onChange={(e) => updateItem(index, field.key, e.target.value)}
        />
      </div>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!saving) onOpenChange(isOpen)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>编辑列表项，拖动排序。</DialogDescription>
          </DialogHeader>

          <DialogBody className="max-h-[70vh] space-y-3 overflow-y-auto">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="array-edit">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {items.map((item, index) => (
                      <Draggable
                        key={index}
                        draggableId={`item-${index}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={provided.draggableProps.style}
                            className={`rounded-lg border p-4 transition-shadow ${
                              snapshot.isDragging ? "shadow-md" : ""
                            }`}
                          >
                            {/* 条目头部：拖动手柄 + 序号 + 预览 + 删除 */}
                            <div className="mb-3 flex items-center gap-2">
                              <span
                                {...provided.dragHandleProps}
                                className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
                              >
                                <GripVertical className="size-4" />
                              </span>
                              <span className="text-sm font-medium">
                                条目 {index + 1}
                              </span>
                              <span className="flex-1 truncate text-xs text-muted-foreground">
                                {getPreviewText(item, fields)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteIndex(index)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>

                            {/* 字段列表 */}
                            <div className="space-y-3">
                              {fields.map((field) => renderField(item, index, field))}
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

            {/* 添加条目按钮 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAdd}
            >
              <Plus className="mr-1 size-4" />
              添加条目
            </Button>
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setDeleteIndex(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除条目 {deleteIndex !== null ? deleteIndex + 1 : ""}？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
