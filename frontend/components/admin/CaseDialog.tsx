"use client"

/**
 * 成功案例创建/编辑对话框组件。
 * 支持学生姓名、大学、专业、年份、感言、推荐状态和排序的表单。
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import api from "@/lib/api"
import type { SuccessCase } from "@/types"

interface CaseDialogProps {
  /** 编辑时传入案例对象，创建时为 null */
  successCase: SuccessCase | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 成功案例创建/编辑对话框 */
export function CaseDialog({ successCase, open, onClose, onSave }: CaseDialogProps) {
  const t = useTranslations("AdminCases")
  const isEdit = !!successCase

  const [studentName, setStudentName] = useState("")
  const [university, setUniversity] = useState("")
  const [program, setProgram] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())
  const [testimonial, setTestimonial] = useState("")
  const [isFeatured, setIsFeatured] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    if (successCase) {
      setStudentName(successCase.student_name)
      setUniversity(successCase.university)
      setProgram(successCase.program)
      setYear(successCase.year)
      setTestimonial(successCase.testimonial ?? "")
      setIsFeatured(successCase.is_featured)
      setSortOrder(successCase.sort_order)
    } else {
      setStudentName("")
      setUniversity("")
      setProgram("")
      setYear(new Date().getFullYear())
      setTestimonial("")
      setIsFeatured(false)
      setSortOrder(0)
    }
  }, [open, successCase])

  /** 保存案例 */
  const handleSave = async () => {
    if (!studentName.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    if (!university.trim()) {
      toast.error(t("universityRequired"))
      return
    }
    if (!program.trim()) {
      toast.error(t("programRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = {
        student_name: studentName,
        university,
        program,
        year,
        testimonial: testimonial || null,
        is_featured: isFeatured,
        sort_order: sortOrder,
      }
      if (isEdit) {
        await api.patch(`/admin/cases/${successCase.id}`, payload)
      } else {
        await api.post("/admin/cases", payload)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editTitle" : "createTitle")}</DialogTitle>
          <DialogDescription>{t(isEdit ? "editDesc" : "createDesc")}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 学生姓名 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("studentName")}</Label>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t("studentNamePlaceholder")}
            />
          </div>

          {/* 大学 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("university")}</Label>
            <Input
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder={t("universityPlaceholder")}
            />
          </div>

          {/* 专业 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("program")}</Label>
            <Input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder={t("programPlaceholder")}
            />
          </div>

          {/* 年份和排序 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("year")}</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
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

          {/* 感言 */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("testimonial")}</Label>
            <Textarea
              rows={3}
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder={t("testimonialPlaceholder")}
            />
          </div>

          {/* 推荐 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_featured"
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(checked === true)}
            />
            <Label htmlFor="is_featured" className="text-xs uppercase tracking-wide text-muted-foreground">{t("isFeatured")}</Label>
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
