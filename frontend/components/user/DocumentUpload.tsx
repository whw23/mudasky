"use client"

/**
 * 文档上传对话框组件。
 * 提供文件拖拽上传区域和分类选择器。
 */

import { useState, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api from "@/lib/api"
import type { DocumentCategory } from "@/types"

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"

/** 所有文档分类 */
const CATEGORIES: DocumentCategory[] = [
  "transcript",
  "certificate",
  "passport",
  "language_test",
  "application",
  "other",
]

interface DocumentUploadProps {
  onSuccess: () => void
}

/** 文档上传对话框 */
export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const t = useTranslations("Documents")

  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>("other")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** 重置表单状态 */
  const resetForm = useCallback(() => {
    setFile(null)
    setCategory("other")
    setUploading(false)
    setDragOver(false)
  }, [])

  /** 校验文件扩展名 */
  const isFileAccepted = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
    const allowedExts = ACCEPTED_TYPES.split(",").map((t) => t.replace(".", ""))
    return allowedExts.includes(ext)
  }, [])

  /** 处理文件选择 */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (!selected) return
      if (!isFileAccepted(selected)) {
        toast.error(t("invalidFileType"))
        e.target.value = ""
        return
      }
      setFile(selected)
    },
    [isFileAccepted, t],
  )

  /** 处理拖拽放置 */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    if (!isFileAccepted(dropped)) {
      toast.error(t("invalidFileType"))
      return
    }
    setFile(dropped)
  }, [isFileAccepted, t])

  /** 处理拖拽进入 */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  /** 处理拖拽离开 */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  /** 提交上传 */
  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      await api.post("/portal/documents/list/upload", formData)
      toast.success(t("uploadSuccess"))
      resetForm()
      setOpen(false)
      onSuccess()
    } catch {
      toast.error(t("uploadError"))
    } finally {
      setUploading(false)
    }
  }

  /** 对话框打开/关闭回调 */
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Upload className="mr-2 size-4" />
            {t("upload")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("uploadTitle")}</DialogTitle>
          <DialogDescription>{t("uploadDesc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium">{t("selectFile")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dragDrop")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("acceptedTypes")}
                </p>
              </>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* 分类选择 */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("category")}</Label>
            <Select value={category} onValueChange={(v) => setCategory((v ?? "other") as DocumentCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) => t(value ?? "other")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? t("uploading") : t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
