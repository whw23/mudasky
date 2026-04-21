"use client"

/**
 * 院校编辑弹窗。
 * 用于创建和编辑合作院校信息。
 */

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Trash2, Upload } from "lucide-react"
import { TiptapEditor } from "@/components/editor/TiptapEditor"

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
  logo_image_id: string | null
  latitude: number | null
  longitude: number | null
  admission_requirements: string | null
  scholarship_info: string | null
  qs_rankings: { year: number; ranking: number }[] | null
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
  const [logoImageId, setLogoImageId] = useState<string | null>(null)
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [admissionReqs, setAdmissionReqs] = useState("")
  const [scholarshipInfo, setScholarshipInfo] = useState("")
  const [qsRankings, setQsRankings] = useState<{ year: number; ranking: number }[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setLogoImageId(university.logo_image_id)
      setLatitude(university.latitude?.toString() ?? "")
      setLongitude(university.longitude?.toString() ?? "")
      setAdmissionReqs(university.admission_requirements ?? "")
      setScholarshipInfo(university.scholarship_info ?? "")
      setQsRankings(university.qs_rankings ?? [])
    } else if (open && !university) {
      setName("")
      setNameEn("")
      setCountry("")
      setProvince("")
      setCity("")
      setDescription("")
      setWebsite("")
      setLogoImageId(null)
      setLatitude("")
      setLongitude("")
      setAdmissionReqs("")
      setScholarshipInfo("")
      setQsRankings([])
    }
  }, [open, university])

  /** 上传 Logo */
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (isEdit) {
        formData.append("university_id", university!.id)
      }

      const res = await api.post(
        isEdit
          ? "/admin/web-settings/universities/list/detail/upload-logo"
          : "/admin/web-settings/universities/upload-logo-temp",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      setLogoImageId(res.data.logo_image_id)
      toast.success("Logo 上传成功")
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
    }
  }

  /** 添加 QS 排名 */
  function addRanking(): void {
    setQsRankings([...qsRankings, { year: new Date().getFullYear(), ranking: 0 }])
  }

  /** 删除 QS 排名 */
  function removeRanking(index: number): void {
    setQsRankings(qsRankings.filter((_, i) => i !== index))
  }

  /** 更新 QS 排名 */
  function updateRanking(index: number, field: "year" | "ranking", value: number): void {
    const updated = [...qsRankings]
    updated[index][field] = value
    setQsRankings(updated)
  }

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
        logo_image_id: logoImageId,
        latitude: latitude.trim() ? parseFloat(latitude) : null,
        longitude: longitude.trim() ? parseFloat(longitude) : null,
        admission_requirements: admissionReqs.trim() || null,
        scholarship_info: scholarshipInfo.trim() || null,
        qs_rankings: qsRankings.length > 0 ? qsRankings : null,
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑院校" : "添加院校"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[80vh] overflow-y-auto">
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
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {logoImageId && (
                <img
                  src={`/api/public/images/detail?id=${logoImageId}`}
                  alt="Logo"
                  className="h-12 w-12 rounded object-contain border"
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="uni-logo-upload"
                disabled={uploading}
              />
              <label
                htmlFor="uni-logo-upload"
                className={`inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload className="size-4" />
                {uploading ? "上传中..." : logoImageId ? "更换 Logo" : "上传 Logo"}
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="uni-lat">纬度</Label>
              <Input
                id="uni-lat"
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="48.148598"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-lon">经度</Label>
              <Input
                id="uni-lon"
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="11.567599"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-desc">简介</Label>
            <TiptapEditor
              content={description}
              onChange={(html) => setDescription(html)}
              placeholder="院校简介"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-admission">录取要求</Label>
            <TiptapEditor
              content={admissionReqs}
              onChange={(html) => setAdmissionReqs(html)}
              placeholder="录取要求（可选）"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uni-scholarship">奖学金信息</Label>
            <TiptapEditor
              content={scholarshipInfo}
              onChange={(html) => setScholarshipInfo(html)}
              placeholder="奖学金信息（可选）"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>QS 世界排名</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRanking}>
                <Plus className="mr-1 h-4 w-4" />
                添加
              </Button>
            </div>
            {qsRankings.map((rank, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="number"
                  value={rank.year}
                  onChange={(e) => updateRanking(idx, "year", parseInt(e.target.value))}
                  placeholder="年份"
                  className="w-24"
                />
                <Input
                  type="number"
                  value={rank.ranking}
                  onChange={(e) => updateRanking(idx, "ranking", parseInt(e.target.value))}
                  placeholder="排名"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRanking(idx)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
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
