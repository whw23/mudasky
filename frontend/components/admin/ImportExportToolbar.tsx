"use client"

/**
 * 导入导出工具栏组件。
 * 提供下载模板、导入、导出三个按钮。
 */

import { useRef, useState } from "react"
import { Download, Upload, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import api from "@/lib/api"

interface ImportExportToolbarProps {
  templateUrl: string      // GET endpoint for template download
  importUrl: string        // POST endpoint for import preview
  exportUrl: string        // GET endpoint for export download
  onImportPreview: (data: unknown) => void  // callback when preview data received
  onFileSelect?: (file: File) => void       // callback when file is selected (for re-upload on confirm)
  templateFilename?: string
  exportFilename?: string
  acceptZip?: boolean      // whether to accept .zip files (default true)
}

/**
 * 触发浏览器下载 Blob。
 */
function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导入导出工具栏。
 */
export function ImportExportToolbar({
  templateUrl,
  importUrl,
  exportUrl,
  onImportPreview,
  onFileSelect,
  templateFilename = "template.xlsx",
  exportFilename = "export.xlsx",
  acceptZip = true,
}: ImportExportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)
  const [loadingExport, setLoadingExport] = useState(false)

  /** 下载模板 */
  async function handleDownloadTemplate() {
    setLoadingTemplate(true)
    try {
      const res = await api.get(templateUrl, { responseType: "blob" })
      downloadBlob(res.data, templateFilename)
    } catch {
      toast.error("下载模板失败")
    } finally {
      setLoadingTemplate(false)
    }
  }

  /** 导入文件 */
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingImport(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await api.post(importUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      onImportPreview(res.data)
      if (onFileSelect) {
        onFileSelect(file)
      }
    } catch {
      toast.error("导入预览失败")
    } finally {
      setLoadingImport(false)
      // 重置 input，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  /** 导出数据 */
  async function handleExport() {
    setLoadingExport(true)
    try {
      const res = await api.get(exportUrl, { responseType: "blob" })
      downloadBlob(res.data, exportFilename)
    } catch {
      toast.error("导出失败")
    } finally {
      setLoadingExport(false)
    }
  }

  const accept = acceptZip ? ".xlsx,.zip" : ".xlsx"

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleImport}
        className="hidden"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownloadTemplate}
        disabled={loadingTemplate}
      >
        <Download className="mr-1 size-4" />
        下载模板
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={loadingImport}
      >
        <Upload className="mr-1 size-4" />
        导入
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={loadingExport}
      >
        <FileDown className="mr-1 size-4" />
        导出
      </Button>
    </div>
  )
}
