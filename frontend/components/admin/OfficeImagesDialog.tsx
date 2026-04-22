"use client"

/**
 * 办公环境图片管理弹窗。
 * 每条是一个图片上传区域 + 描述，支持增删排序。
 */

import { useState, useRef } from "react"
import { GripVertical, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface OfficeImage {
  image_id: string
  caption: string | Record<string, string>
}

interface OfficeImagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: OfficeImage[]
  onSave: (data: OfficeImage[]) => Promise<void>
}

/** 办公环境图片管理弹窗 */
export function OfficeImagesDialog({ open, onOpenChange, data, onSave }: OfficeImagesDialogProps) {
  const [items, setItems] = useState<OfficeImage[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)
  const [uploading, setUploading] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadIdxRef = useRef<number>(-1)

  function handleOpenChange(v: boolean) {
    if (v) setItems(JSON.parse(JSON.stringify(data)))
    onOpenChange(v)
  }

  async function handleUpload(idx: number, file: File) {
    setUploading(idx)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { data: res } = await api.post("/admin/web-settings/images/upload", formData)
      const imageId = res.url?.match(/id=(.+)/)?.[1] || res.id || ""
      setItems(prev => {
        const next = [...prev]
        next[idx] = { ...next[idx], image_id: imageId }
        return next
      })
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && uploadIdxRef.current >= 0) {
      handleUpload(uploadIdxRef.current, file)
    }
    e.target.value = ""
  }

  function triggerUpload(idx: number) {
    uploadIdxRef.current = idx
    fileInputRef.current?.click()
  }

  function handleAdd() {
    setItems(prev => [...prev, { image_id: "", caption: "" }])
  }

  function handleCaptionChange(idx: number, value: string) {
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], caption: value }
      return next
    })
  }

  function handleDragEnd(result: any) {
    if (!result.destination) return
    const next = [...items]
    const [moved] = next.splice(result.source.index, 1)
    next.splice(result.destination.index, 0, moved)
    setItems(next)
  }

  async function handleSave() {
    const valid = items.filter(i => i.image_id)
    if (valid.length === 0 && items.length > 0) {
      toast.error("请至少上传一张图片")
      return
    }
    setSaving(true)
    try {
      await onSave(valid)
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
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑办公环境图片</DialogTitle>
            <DialogDescription>上传图片，拖动排序。</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="office-images">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {items.map((item, idx) => (
                      <Draggable key={idx} draggableId={`img-${idx}`} index={idx}>
                        {(prov) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} className="rounded-lg border p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div {...prov.dragHandleProps} className="cursor-grab text-muted-foreground">
                                <GripVertical className="size-4" />
                              </div>
                              <span className="text-sm font-medium flex-1">图片 {idx + 1}</span>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteIdx(idx)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>

                            {/* 图片预览/上传 */}
                            <div className="flex gap-3">
                              <div
                                onClick={() => triggerUpload(idx)}
                                className="flex h-24 w-36 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-primary"
                              >
                                {uploading === idx ? (
                                  <span className="text-xs text-muted-foreground">上传中...</span>
                                ) : item.image_id ? (
                                  <img
                                    src={`/api/public/images/detail?id=${item.image_id}`}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center text-muted-foreground">
                                    <Upload className="size-5" />
                                    <span className="mt-1 text-xs">点击上传</span>
                                  </div>
                                )}
                              </div>

                              {/* 描述 */}
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">图片说明（可选）</label>
                                <Input
                                  value={typeof item.caption === "string" ? item.caption : (item.caption as any)?.zh || ""}
                                  onChange={(e) => handleCaptionChange(idx, e.target.value)}
                                  placeholder="如：公司前台、教学教室..."
                                  className="mt-1"
                                />
                              </div>
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
              <Plus className="mr-1 size-4" /> 添加图片
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteIdx !== null} onOpenChange={(v) => !v && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除图片</AlertDialogTitle>
            <AlertDialogDescription>确认删除这张图片？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteIdx !== null) {
                setItems(prev => prev.filter((_, i) => i !== deleteIdx))
                setDeleteIdx(null)
              }
            }}>
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
