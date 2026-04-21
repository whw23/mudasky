"use client"

/**
 * 删除导航项确认弹窗。
 * 提示是否同时删除该分类下的文章，调用 API 删除自定义导航项。
 */

import { useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
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

interface RemoveNavItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  name: string
  onSuccess: () => void
}

export function RemoveNavItemDialog({
  open,
  onOpenChange,
  slug,
  name,
  onSuccess,
}: RemoveNavItemDialogProps) {
  const [removing, setRemoving] = useState(false)

  /** 执行删除 */
  async function handleRemove(deleteContent: boolean): Promise<void> {
    setRemoving(true)
    try {
      await api.post("/admin/web-settings/nav/remove-item", {
        slug,
        delete_content: deleteContent,
      })
      toast.success("导航项已删除")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("删除失败")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除导航项「{name}」</AlertDialogTitle>
          <AlertDialogDescription>
            是否同时删除该分类下的文章？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>取消</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => handleRemove(false)}
            disabled={removing}
          >
            仅删除导航项
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleRemove(true)}
            disabled={removing}
          >
            删除导航项及文章
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
