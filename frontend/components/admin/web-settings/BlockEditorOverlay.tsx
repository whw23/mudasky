"use client"

/**
 * Block 编辑覆盖层。
 * 包裹预览中的每个 Block，hover 时显示浮动工具栏（类型标签 + 删除按钮）。
 * 使用 div + data-editable 属性，不被 PreviewContainer 拦截。
 */

import { type ReactNode, useState } from "react"
import { Trash2, GripVertical, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { getBlockLabel } from "@/lib/block-labels"
import type { Block } from "@/types/block"

interface BlockEditorOverlayProps {
  block: Block
  children: ReactNode
  onDelete: (blockId: string) => void
  onEditConfig: (block: Block, defaultTab?: "config" | "content") => void
  dragHandleProps?: Record<string, any>
}

/** Block 编辑覆盖层 */
export function BlockEditorOverlay({
  block,
  children,
  onDelete,
  onEditConfig,
  dragHandleProps,
}: BlockEditorOverlayProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const typeName = getBlockLabel(block)

  return (
    <>
      <div className="group relative" data-editable>
        {/* 浮动工具栏 */}
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-blue-500/90 px-3 py-1.5 text-sm text-white shadow-lg">
            {/* 拖拽手柄 + 类型名称 */}
            <div className="flex items-center gap-1.5">
              <span
                className="cursor-grab active:cursor-grabbing"
                {...dragHandleProps}
              >
                <GripVertical className="size-4" />
              </span>
              <span className="font-medium">{typeName}</span>
            </div>

            {/* 分隔线 */}
            <div className="mx-1.5 h-4 w-px bg-white/40" />

            {/* 设置按钮 */}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={() => onEditConfig(block, "config")}
            >
              <Settings className="size-3.5" />
            </Button>

            {/* 删除按钮 */}
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-white hover:bg-red-500/80 hover:text-white"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* 实际的 Block 内容 */}
        {children}
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除区块</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{typeName}」区块吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(block.id)
                setConfirmOpen(false)
              }}
            >
              确认删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
