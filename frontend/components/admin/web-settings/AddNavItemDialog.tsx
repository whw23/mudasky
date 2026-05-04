"use client"

/**
 * 新增导航项弹窗。
 * 输入多语言名称和 slug，调用 API 添加自定义导航项。
 */

import { useState } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"

interface AddNavItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** slug 格式校验：英文小写 + 连字符 */
const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/

export function AddNavItemDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddNavItemDialogProps) {
  const [name, setName] = useState<Record<string, string>>({ zh: "", en: "", ja: "", de: "" })
  const [slug, setSlug] = useState("")
  const [saving, setSaving] = useState(false)

  /** 重置表单 */
  function resetForm(): void {
    setName({ zh: "", en: "", ja: "", de: "" })
    setSlug("")
  }

  /** 提交新增导航项 */
  async function handleSubmit(): Promise<void> {
    const trimmedSlug = slug.trim()
    const zhName = name.zh?.trim()

    if (!zhName) {
      toast.error("中文名称不能为空")
      return
    }
    if (!trimmedSlug) {
      toast.error("slug 不能为空")
      return
    }
    if (!SLUG_PATTERN.test(trimmedSlug)) {
      toast.error("slug 格式错误，仅支持英文小写和连字符")
      return
    }

    setSaving(true)
    try {
      await api.post("/admin/web-settings/nav/add-item", {
        slug: trimmedSlug,
        name,
        description: "",
      })
      toast.success("导航项已添加")
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("添加失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增导航项</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <LocalizedInput
            value={name}
            onChange={setName}
            label="名称"
          />
          <div className="space-y-1.5">
            <Label htmlFor="nav-item-slug">Slug</Label>
            <Input
              id="nav-item-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：campus-life"
            />
            <p className="text-xs text-muted-foreground">
              仅支持英文小写字母和连字符
            </p>
          </div>
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
            {saving ? "添加中..." : "添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
