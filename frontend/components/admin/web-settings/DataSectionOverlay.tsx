"use client"

/**
 * 数据驱动区块的编辑浮层组件。
 * hover 显示编辑按钮，点击打开管理表格弹窗。
 */

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DataSectionOverlayProps {
  children: React.ReactNode
  label: string
  renderManager: () => React.ReactNode
}

/**
 * 数据驱动区块的编辑浮层
 * hover 显示编辑按钮，点击打开管理表格弹窗
 */
export function DataSectionOverlay({
  children,
  label,
  renderManager,
}: DataSectionOverlayProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="group relative">
        {children}
        <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-transparent transition-colors group-hover:border-blue-400 group-hover:bg-blue-50/30">
          <button
            onClick={() => setOpen(true)}
            className="pointer-events-auto absolute right-2 top-2 rounded bg-blue-500 px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          >
            {label}
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          {renderManager()}
        </DialogContent>
      </Dialog>
    </>
  )
}
