"use client"

/**
 * Banner 图片编辑弹窗。
 * 支持上传、删除 Banner 背景图，集成到 EditableOverlay 编辑流程中。
 */

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from "@/components/ui/dialog"
import api from "@/lib/api"

interface BannerEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 页面标识 */
  pageKey: string
  /** 当前的图片 ID 列表 */
  imageIds: string[]
  /** 更新回调 */
  onUpdate: () => void
}

/** Banner 图片编辑弹窗 */
export function BannerEditDialog({ open, onOpenChange, pageKey, imageIds, onUpdate }: BannerEditDialogProps) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      await api.post(`/admin/web-settings/banners/upload?page_key=${pageKey}`, form)
      toast.success("Banner 图片上传成功")
      onUpdate()
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(imageId: string) {
    try {
      await api.post("/admin/web-settings/banners/remove", {
        page_key: pageKey,
        image_id: imageId,
      })
      toast.success("已移除")
      onUpdate()
    } catch {
      toast.error("移除失败")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑 Banner 图片</DialogTitle>
          <DialogDescription>管理页面顶部 Banner 背景图片。</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Banner 背景图</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id={`banner-upload-${pageKey}`}
              disabled={uploading}
            />
            <label
              htmlFor={`banner-upload-${pageKey}`}
              className={`inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <Plus className="size-4" />
              {uploading ? "上传中..." : "添加图片"}
            </label>
          </div>
          {imageIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {imageIds.map((id) => (
                <div key={id} className="group relative h-20 w-32 overflow-hidden rounded border">
                  <img src={`/api/public/images/detail?id=${id}`} alt="Banner" className="size-full object-cover" />
                  <button
                    onClick={() => handleRemove(id)}
                    className="absolute right-1 top-1 rounded bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="size-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">未设置背景图，使用默认渐变色</p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
