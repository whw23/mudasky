"use client"

/**
 * 合作院校创建/编辑对话框组件。
 * 支持校名、英文名、国家、城市、简介、项目、官网、Logo、推荐、排序的表单。
 */

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { University } from "@/types"

interface UniversityDialogProps {
  university: University | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 合作院校创建/编辑对话框 */
export function UniversityDialog({ university, open, onClose, onSave }: UniversityDialogProps) {
  const t = useTranslations("AdminUniversities")
  const isEdit = !!university

  const [name, setName] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [description, setDescription] = useState("")
  const [programs, setPrograms] = useState("")
  const [website, setWebsite] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [isFeatured, setIsFeatured] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    if (university) {
      setName(university.name)
      setNameEn(university.name_en ?? "")
      setCountry(university.country)
      setCity(university.city)
      setDescription(university.description ?? "")
      setPrograms(university.programs.join(", "))
      setWebsite(university.website ?? "")
      setLogoUrl(university.logo_url ?? "")
      setIsFeatured(university.is_featured)
      setSortOrder(university.sort_order)
    } else {
      setName("")
      setNameEn("")
      setCountry("")
      setCity("")
      setDescription("")
      setPrograms("")
      setWebsite("")
      setLogoUrl("")
      setIsFeatured(false)
      setSortOrder(0)
    }
  }, [open, university])

  /** 保存院校 */
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    if (!country.trim()) {
      toast.error(t("countryRequired"))
      return
    }
    if (!city.trim()) {
      toast.error(t("cityRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        name_en: nameEn || null,
        country,
        city,
        description: description || null,
        programs: programs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        website: website || null,
        logo_url: logoUrl || null,
        is_featured: isFeatured,
        sort_order: sortOrder,
      }
      if (isEdit) {
        await api.post(`/admin/university/edit/${university.id}`, payload)
      } else {
        await api.post("/admin/university/create", payload)
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editTitle" : "createTitle")}</DialogTitle>
          <DialogDescription>{t(isEdit ? "editDesc" : "createDesc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 校名 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          {/* 英文名 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("nameEn")}</Label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t("nameEnPlaceholder")}
            />
          </div>

          {/* 国家 + 城市 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("country")}</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t("countryPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("city")}</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("cityPlaceholder")}
              />
            </div>
          </div>

          {/* 简介 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          {/* 开设项目 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("programs")}</Label>
            <Input
              value={programs}
              onChange={(e) => setPrograms(e.target.value)}
              placeholder={t("programsPlaceholder")}
            />
          </div>

          {/* 官网 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("website")}</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t("websitePlaceholder")}
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("logoUrl")}</Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={t("logoUrlPlaceholder")}
            />
          </div>

          {/* 推荐 + 排序 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("isFeatured")}</Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("sortOrder")}</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
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
