"use client"

/**
 * 导入预览弹窗组件。
 * 显示导入数据的摘要、错误、冲突和数据表格。
 */

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog"
import { AlertCircle, AlertTriangle } from "lucide-react"

interface PreviewItem {
  row: number
  status: "new" | "update" | "unchanged" | "error"
  [key: string]: unknown
}

interface PreviewData {
  items: PreviewItem[]
  errors: Array<{ row?: number; error: string }>
  summary: Record<string, number>
  unknown_disciplines?: string[]
  unknown_universities?: string[]
}

interface ImportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PreviewData | null
  onConfirm: (items: PreviewItem[]) => Promise<void>
  columns: Array<{ key: string; label: string }>  // which columns to show in table
}

/** 状态标签样式 */
const STATUS_LABELS: Record<
  PreviewItem["status"],
  { label: string; color: string }
> = {
  new: { label: "新增", color: "text-green-600" },
  update: { label: "更新", color: "text-blue-600" },
  unchanged: { label: "无变化", color: "text-gray-400" },
  error: { label: "错误", color: "text-red-600" },
}

/**
 * 导入预览弹窗。
 */
export function ImportPreviewDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  columns,
}: ImportPreviewDialogProps) {
  const [confirming, setConfirming] = useState(false)

  if (!data) return null

  const { items, errors, summary, unknown_disciplines, unknown_universities } = data

  const hasErrors = errors.length > 0
  const hasConflicts = (unknown_disciplines?.length ?? 0) > 0 || (unknown_universities?.length ?? 0) > 0

  /** 确认导入 */
  async function handleConfirm() {
    setConfirming(true)
    try {
      await onConfirm(items)
      toast.success("导入成功")
      onOpenChange(false)
    } catch {
      toast.error("导入失败")
    } finally {
      setConfirming(false)
    }
  }

  /** 统计有效条目（排除 error 和 unchanged） */
  const validCount = items.filter((item) => item.status !== "error" && item.status !== "unchanged").length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>导入预览</DialogTitle>
          <DialogDescription>
            请检查导入数据，确认无误后点击「确认导入」。
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto">
          {/* 摘要条 */}
          <div className="flex items-center gap-4 text-sm">
            {Object.entries(summary).map(([status, count]) => {
              const config = STATUS_LABELS[status as PreviewItem["status"]]
              if (!config) return null
              return (
                <div key={status} className="flex items-center gap-1">
                  <span className={config.color}>{config.label}</span>
                  <span className="font-medium">{count} 条</span>
                </div>
              )
            })}
          </div>

          {/* 错误区块 */}
          {hasErrors && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-900">
                <AlertCircle className="size-4" />
                数据错误（{errors.length} 条）
              </div>
              <ul className="space-y-1 text-xs text-red-700">
                {errors.map((err, idx) => (
                  <li key={idx}>
                    {err.row !== undefined ? `行 ${err.row}: ` : ""}
                    {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 冲突区块 */}
          {hasConflicts && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-900">
                <AlertTriangle className="size-4" />
                数据冲突
              </div>
              <div className="space-y-2 text-xs text-amber-700">
                {unknown_disciplines && unknown_disciplines.length > 0 && (
                  <div>
                    <span className="font-medium">未找到的学科：</span>
                    <span className="ml-1">{unknown_disciplines.join("、")}</span>
                  </div>
                )}
                {unknown_universities && unknown_universities.length > 0 && (
                  <div>
                    <span className="font-medium">未找到的院校：</span>
                    <span className="ml-1">{unknown_universities.join("、")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 数据表格 */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">行号</th>
                  <th className="px-3 py-2 text-left font-medium">状态</th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-left font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => {
                  const statusConfig = STATUS_LABELS[item.status]
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{item.row}</td>
                      <td className={`px-3 py-2 ${statusConfig.color}`}>
                        {statusConfig.label}
                      </td>
                      {columns.map((col) => (
                        <td key={col.key} className="px-3 py-2">
                          {String(item[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming || hasErrors || validCount === 0}
          >
            确认导入 ({validCount} 条)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
