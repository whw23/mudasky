"use client"

/**
 * Banner 图片管理组件。
 * 支持上传、删除 Banner 背景图。
 */

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"

interface BannerImageEditorProps {
  /** 页面标识 */
  pageKey: string
  /** 当前的图片 ID 列表 */
  imageIds: string[]
  /** 更新回调 */
  onUpdate: () => void
}

/** Banner 图片管理组件 */
export function BannerImageEditor({ pageKey, imageIds, onUpdate }: BannerImageEditorProps) {
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
    <div className="space-y-3 p-4 border-b">
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
    </div>
  )
}
