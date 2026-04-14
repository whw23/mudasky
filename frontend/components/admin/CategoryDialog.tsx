"use client"

/**
 * 分类创建/编辑对话框组件。
 * 支持名称、标识、描述和排序的表单。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { usePathname } from "@/i18n/navigation"
import type { Category } from "@/types"

interface CategoryDialogProps {
  category: Category | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 分类创建/编辑对话框 */
export function CategoryDialog({ category, open, onClose, onSave }: CategoryDialogProps) {
  const t = useTranslations("AdminCategories")
  const pathname = usePathname()
  const isEdit = !!category

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    if (category) {
      setName(category.name)
      setSlug(category.slug)
      setDescription(category.description)
      setSortOrder(category.sort_order)
    } else {
      setName("")
      setSlug("")
      setDescription("")
      setSortOrder(0)
    }
  }, [open, category])

  /** 保存分类 */
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    if (!slug.trim()) {
      toast.error(t("slugRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = { name, slug, description, sort_order: sortOrder }
      if (isEdit) {
        await api.post(`${pathname}/list/detail/edit`, { category_id: category.id, ...payload })
      } else {
        await api.post(`${pathname}/list/create`, payload)
      }
      toast.success(t(isEdit ? "updateSuccess" : "createSuccess"))
      onSave()
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editTitle" : "createTitle")}</DialogTitle>
          <DialogDescription>{t(isEdit ? "editDesc" : "createDesc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 名称 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          {/* 标识 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("slug")}</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("slugPlaceholder")}
            />
          </div>

          {/* 描述 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          {/* 排序 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("sortOrder")}</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
        </DialogBody>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
