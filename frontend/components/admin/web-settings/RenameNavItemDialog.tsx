"use client"

/**
 * 重命名导航项弹窗。
 * 输入多语言名称，调用 API 更新导航项名称。
 */

import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"

interface RenameNavItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  currentName: string | Record<string, string>
  onSuccess: () => void
}

export function RenameNavItemDialog({
  open,
  onOpenChange,
  slug,
  currentName,
  onSuccess,
}: RenameNavItemDialogProps) {
  const [name, setName] = useState<Record<string, string>>({ zh: "", en: "", ja: "", de: "" })
  const [saving, setSaving] = useState(false)

  /** 打开时填充当前名称 */
  useEffect(() => {
    if (open) {
      if (typeof currentName === "string") {
        setName({ zh: currentName, en: "", ja: "", de: "" })
      } else {
        setName({ zh: "", en: "", ja: "", de: "", ...currentName })
      }
    }
  }, [open, currentName])

  /** 提交改名 */
  async function handleSubmit(): Promise<void> {
    const zhName = name.zh?.trim()
    if (!zhName) {
      toast.error("中文名称不能为空")
      return
    }

    setSaving(true)
    try {
      await api.post("/admin/web-settings/nav/rename-item", {
        slug,
        name,
      })
      toast.success("导航项已重命名")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("重命名失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名导航项</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <LocalizedInput
            value={name}
            onChange={setName}
            label="名称"
          />
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
