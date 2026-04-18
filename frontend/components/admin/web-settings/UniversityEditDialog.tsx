"use client"

/**
 * 院校编辑弹窗。
 * 用于创建和编辑合作院校信息。
 */

import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"

interface UniversityData {
  id: string
  name: string
  name_en: string | null
  country: string
  province: string | null
  city: string
  description: string | null
  website: string | null
  is_featured: boolean
}

interface UniversityEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  university: UniversityData | null
  onSuccess: () => void
}

/** 院校编辑弹窗 */
export function UniversityEditDialog({
  open,
  onOpenChange,
  university,
  onSuccess,
}: UniversityEditDialogProps) {
  const isEdit = !!university

  const [name, setName] = useState("")
  const [nameEn, setNameEn] = useState("")
  const [country, setCountry] = useState("")
  const [province, setProvince] = useState("")
  const [city, setCity] = useState("")
  const [description, setDescription] = useState("")
  const [website, setWebsite] = useState("")
  const [saving, setSaving] = useState(false)

  /** 打开时初始化表单 */
  useEffect(() => {
    if (open && university) {
      setName(university.name)
      setNameEn(university.name_en ?? "")
      setCountry(university.country)
      setProvince(university.province ?? "")
      setCity(university.city)
      setDescription(university.description ?? "")
      setWebsite(university.website ?? "")
    } else if (open && !university) {
      setName("")
      setNameEn("")
      setCountry("")
      setProvince("")
      setCity("")
      setDescription("")
      setWebsite("")
    }
  }, [open, university])

  /** 提交表单 */
  async function handleSubmit(): Promise<void> {
    const trimmedName = name.trim()
    const trimmedCountry = country.trim()
    const trimmedCity = city.trim()
    if (!trimmedName || !trimmedCountry || !trimmedCity) {
      toast.error("校名、国家、城市不能为空")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: trimmedName,
        name_en: nameEn.trim() || null,
        country: trimmedCountry,
        province: province.trim() || null,
        city: trimmedCity,
        description: description.trim() || null,
        website: website.trim() || null,
      }

      if (isEdit) {
        await api.post("/admin/web-settings/universities/list/detail/edit", {
          university_id: university.id,
          ...payload,
        })
        toast.success("院校已更新")
      } else {
        await api.post("/admin/web-settings/universities/list/create", payload)
        toast.success("院校已创建")
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error(isEdit ? "更新失败" : "创建失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑院校" : "添加院校"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="uni-name">校名</Label>
              <Input
                id="uni-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="大学名称"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-name-en">英文名</Label>
              <Input
                id="uni-name-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="English Name"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="uni-country">国家</Label>
              <Input
                id="uni-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="国家"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-province">省份/州</Label>
              <Input
                id="uni-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="可选"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-city">城市</Label>
              <Input
                id="uni-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="城市"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-website">官网</Label>
            <Input
              id="uni-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-desc">简介</Label>
            <Textarea
              id="uni-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="院校简介"
              rows={3}
            />
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
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
