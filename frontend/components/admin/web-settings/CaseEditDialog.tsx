"use client"

/**
 * 案例编辑弹窗。
 * 用于创建和编辑成功案例信息。
 */

import { useState, useEffect, useRef } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload } from "lucide-react"

interface CaseData {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  is_featured: boolean
  avatar_image_id: string | null
  offer_image_id: string | null
  related_university_id: string | null
}

interface University {
  id: string
  name: string
}

interface CaseEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseItem: CaseData | null
  onSuccess: () => void
}

/** 案例编辑弹窗 */
export function CaseEditDialog({
  open,
  onOpenChange,
  caseItem,
  onSuccess,
}: CaseEditDialogProps) {
  const isEdit = !!caseItem

  const [studentName, setStudentName] = useState("")
  const [university, setUniversity] = useState("")
  const [program, setProgram] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())
  const [testimonial, setTestimonial] = useState("")
  const [avatarImageId, setAvatarImageId] = useState<string | null>(null)
  const [offerImageId, setOfferImageId] = useState<string | null>(null)
  const [relatedUniversityId, setRelatedUniversityId] = useState<string | null>(null)
  const [universities, setUniversities] = useState<University[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingOffer, setUploadingOffer] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const offerInputRef = useRef<HTMLInputElement>(null)

  /** 加载院校列表 */
  useEffect(() => {
    if (open) {
      api
        .get("/admin/web-settings/universities/list", { params: { page: 1, page_size: 100 } })
        .then((res) => setUniversities(res.data.items ?? []))
        .catch(() => setUniversities([]))
    }
  }, [open])

  /** 打开时初始化表单 */
  useEffect(() => {
    if (open && caseItem) {
      setStudentName(caseItem.student_name)
      setUniversity(caseItem.university)
      setProgram(caseItem.program)
      setYear(caseItem.year)
      setTestimonial(caseItem.testimonial ?? "")
      setAvatarImageId(caseItem.avatar_image_id)
      setOfferImageId(caseItem.offer_image_id)
      setRelatedUniversityId(caseItem.related_university_id)
    } else if (open && !caseItem) {
      setStudentName("")
      setUniversity("")
      setProgram("")
      setYear(new Date().getFullYear())
      setTestimonial("")
      setAvatarImageId(null)
      setOfferImageId(null)
      setRelatedUniversityId(null)
    }
  }, [open, caseItem])

  /** 上传头像 */
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (isEdit) {
        formData.append("case_id", caseItem!.id)
      }

      const res = await api.post(
        isEdit
          ? "/admin/web-settings/cases/list/detail/upload-avatar"
          : "/admin/web-settings/cases/upload-avatar-temp",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      setAvatarImageId(res.data.avatar_image_id)
      toast.success("头像上传成功")
    } catch {
      toast.error("上传失败")
    } finally {
      setUploadingAvatar(false)
    }
  }

  /** 上传录取通知书 */
  async function handleOfferUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingOffer(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (isEdit) {
        formData.append("case_id", caseItem!.id)
      }

      const res = await api.post(
        isEdit
          ? "/admin/web-settings/cases/list/detail/upload-offer"
          : "/admin/web-settings/cases/upload-offer-temp",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      setOfferImageId(res.data.offer_image_id)
      toast.success("录取通知书上传成功")
    } catch {
      toast.error("上传失败")
    } finally {
      setUploadingOffer(false)
    }
  }

  /** 提交表单 */
  async function handleSubmit(): Promise<void> {
    const trimmedName = studentName.trim()
    const trimmedUni = university.trim()
    const trimmedProgram = program.trim()
    if (!trimmedName || !trimmedUni || !trimmedProgram) {
      toast.error("姓名、大学、专业不能为空")
      return
    }

    setSaving(true)
    try {
      const payload = {
        student_name: trimmedName,
        university: trimmedUni,
        program: trimmedProgram,
        year,
        testimonial: testimonial.trim() || null,
        avatar_image_id: avatarImageId,
        offer_image_id: offerImageId,
        related_university_id: relatedUniversityId,
      }

      if (isEdit) {
        await api.post("/admin/web-settings/cases/list/detail/edit", {
          case_id: caseItem.id,
          ...payload,
        })
        toast.success("案例已更新")
      } else {
        await api.post("/admin/web-settings/cases/list/create", payload)
        toast.success("案例已创建")
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑案例" : "添加案例"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="case-name">学生姓名</Label>
              <Input
                id="case-name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="学生姓名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-year">入学年份</Label>
              <Input
                id="case-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="2024"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>学生头像</Label>
            <div className="flex items-center gap-3">
              {avatarImageId && (
                <img
                  src={`/api/public/images/detail?id=${avatarImageId}`}
                  alt="Avatar"
                  className="h-12 w-12 rounded-full object-cover border"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="mr-1 h-4 w-4" />
                {uploadingAvatar ? "上传中..." : avatarImageId ? "更换头像" : "上传头像"}
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="case-university">录取大学</Label>
              <Input
                id="case-university"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="大学名称"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-program">录取专业</Label>
              <Input
                id="case-program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="专业名称"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-related-uni">关联院校（可选）</Label>
            <Select value={relatedUniversityId ?? ""} onValueChange={setRelatedUniversityId}>
              <SelectTrigger id="case-related-uni">
                <SelectValue placeholder="选择院校..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">无</SelectItem>
                {universities.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>录取通知书</Label>
            <div className="flex items-center gap-3">
              {offerImageId && (
                <img
                  src={`/api/public/images/detail?id=${offerImageId}`}
                  alt="Offer"
                  className="h-12 w-16 rounded object-cover border"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => offerInputRef.current?.click()}
                disabled={uploadingOffer}
              >
                <Upload className="mr-1 h-4 w-4" />
                {uploadingOffer ? "上传中..." : offerImageId ? "更换通知书" : "上传通知书"}
              </Button>
              <input
                ref={offerInputRef}
                type="file"
                accept="image/*"
                onChange={handleOfferUpload}
                className="hidden"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-testimonial">学生感言</Label>
            <Textarea
              id="case-testimonial"
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder="可选"
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
