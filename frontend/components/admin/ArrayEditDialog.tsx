"use client"

/**
 * 通用数组编辑弹窗。
 * 支持多条目增删、拖动排序、多语言字段编辑。
 */

import { useEffect, useState } from "react"
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from "@hello-pangea/dnd"
import { GripVertical, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrayFieldRenderer } from "./ArrayFieldRenderer"

/** 数组字段定义 */
export interface ArrayFieldDef {
  key: string
  label: string
  type: "text" | "textarea" | "nested-items" | "radio" | "image" | "switch"
  localized: boolean
  rows?: number
}

export interface ArrayEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** 弹窗描述（支持 ReactNode，可传链接等） */
  description?: React.ReactNode
  fields: ArrayFieldDef[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: any[]) => Promise<void>
}

/** 通用数组编辑弹窗 */
export function ArrayEditDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  data,
  onSave,
}: ArrayEditDialogProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  /* 打开时深拷贝数据到本地状态 */
  useEffect(() => {
    if (open) setItems(JSON.parse(JSON.stringify(data)))
  }, [open, data])

  /** 更新指定条目的指定字段 */
  function updateItem(index: number, key: string, value: unknown) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value }
      return next
    })
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    if (result.source.index === result.destination.index) return

    const next = Array.from(items)
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    setItems(next)
  }

  const radioField = fields.find((f) => f.type === "radio")

  function handleRadioSelect(index: number) {
    if (!radioField) return
    setItems((prev) => prev.map((item, i) => ({ ...item, [radioField.key]: i === index })))
  }

  function handleAdd() {
    const empty: Record<string, unknown> = {}
    for (const f of fields) empty[f.key] = f.type === "nested-items" ? [] : f.type === "radio" ? false : ""
    setItems((prev) => [...prev, empty])
  }

  function handleDeleteConfirm() {
    if (deleteIndex === null) return
    setItems((prev) => prev.filter((_, i) => i !== deleteIndex))
    setDeleteIndex(null)
  }

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
            <DialogDescription>{description || "编辑列表项，拖动排序。"}</DialogDescription>
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
                                {(() => {
                                  const val = fields.find((f) => f.type !== "radio" && f.type !== "nested-items")
                                  if (!val) return ""
                                  const v = item[val.key]
                                  if (!v) return ""
                                  return typeof v === "string" ? v : (v as Record<string, string>).zh || ""
                                })()}
                              </span>
                              {radioField && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  title={radioField.label}
                                  onClick={() => handleRadioSelect(index)}
                                >
                                  <Star className={`size-4 ${item[radioField.key] ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                                </Button>
                              )}
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
                              {fields.map((field) => (
                                <ArrayFieldRenderer key={field.key} item={item} index={index} field={field} onUpdate={updateItem} />
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
