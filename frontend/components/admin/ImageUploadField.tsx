"use client"

/**
 * 图片上传字段组件。
 * 在 ArrayEditDialog 中用于上传/预览/删除图片。
 */

import { useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"

interface ImageUploadFieldProps {
  label: string
  imageId: string
  onChange: (imageId: string) => void
}

/** 图片上传字段 */
export function ImageUploadField({ label, imageId, onChange }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/admin/web-settings/images/upload", formData)
      onChange(data.id)
      toast.success("上传成功")
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        {imageId ? (
          <div className="relative">
            <img
              src={`/api/public/images/detail?id=${imageId}`}
              alt={label}
              className="h-20 w-32 rounded border object-cover"
            />
            <button
              type="button"
              className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white shadow"
              onClick={() => onChange("")}
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-1 size-4" />
            {uploading ? "上传中..." : "上传图片"}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>
    </div>
  )
}
