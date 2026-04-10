"use client"

/**
 * 配置编辑弹窗。
 * 支持多语言文本、纯文本、图片上传三种字段类型。
 */

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogBody,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { LocalizedInput } from "./LocalizedInput"

/** 字段定义 */
interface FieldDefinition {
  key: string
  label: string
  type: "text" | "textarea" | "image"
  localized: boolean
  rows?: number
}

interface ConfigEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: FieldDefinition[]
  data: Record<string, any>
  onSave: (data: Record<string, any>) => Promise<void>
}

/**
 * 上传图片到文档接口。
 * @returns 图片的下载 URL
 */
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post("/documents/upload", formData)
  return data.download_url || data.url
}

/** 配置编辑弹窗 */
export function ConfigEditDialog({
  open,
  onOpenChange,
  title,
  fields,
  data,
  onSave,
}: ConfigEditDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  /* 打开时复制数据到本地状态 */
  useEffect(() => {
    if (open) {
      setFormData({ ...data })
    }
  }, [open, data])

  /** 更新单个字段值 */
  function updateField(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  /** 处理图片上传 */
  async function handleImageUpload(key: string, file: File) {
    setUploading(key)
    try {
      const url = await uploadImage(file)
      updateField(key, url)
      toast.success("图片上传成功")
    } catch {
      toast.error("图片上传失败")
    } finally {
      setUploading(null)
    }
  }

  /** 校验并保存 */
  async function handleSave() {
    /* 校验所有多语言字段的中文值非空 */
    for (const field of fields) {
      if (field.localized) {
        const val = formData[field.key]
        const zhValue = typeof val === "string" ? val : val?.zh
        if (!zhValue?.trim()) {
          toast.error(`${field.label}（中文）不能为空`)
          return
        }
      }
    }

    setSaving(true)
    try {
      await onSave(formData)
      onOpenChange(false)
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  /** 渲染单个字段 */
  function renderField(field: FieldDefinition) {
    const value = formData[field.key]

    /* 多语言字段 */
    if (field.localized) {
      return (
        <LocalizedInput
          key={field.key}
          value={value ?? ""}
          onChange={(v) => updateField(field.key, v)}
          label={field.label}
          multiline={field.type === "textarea"}
          rows={field.rows}
        />
      )
    }

    /* 图片上传字段 */
    if (field.type === "image") {
      const isFieldUploading = uploading === field.key
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</Label>
          {/* 图片预览 */}
          {value && (
            <div className="relative h-20 w-20 overflow-hidden rounded border">
              <img
                src={value}
                alt={field.label}
                className="size-full object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={(el) => { fileInputRefs.current[field.key] = el }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(field.key, file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFieldUploading}
              onClick={() => fileInputRefs.current[field.key]?.click()}
            >
              {isFieldUploading ? "上传中..." : "上传"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateField(field.key, "")}
              >
                清除
              </Button>
            )}
          </div>
        </div>
      )
    }

    /* 纯文本字段 */
    if (field.type === "textarea") {
      return (
        <div key={field.key} className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</Label>
          <Textarea
            value={value ?? ""}
            onChange={(e) => updateField(field.key, e.target.value)}
            rows={field.rows ?? 3}
          />
        </div>
      )
    }

    /* 普通文本输入 */
    return (
      <div key={field.key} className="space-y-2">
        <Label className="text-sm font-medium">{field.label}</Label>
        <Input
          value={value ?? ""}
          onChange={(e) => updateField(field.key, e.target.value)}
        />
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!saving) onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>编辑配置项，中文字段为必填。</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 overflow-y-auto max-h-[60vh]">
          {fields.map(renderField)}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || !!uploading}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
