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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
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

        <div className="space-y-4">
          {/* 学生姓名 */}
          <div className="space-y-1">
            <Label>{t("studentName")}</Label>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t("studentNamePlaceholder")}
            />
          </div>

          {/* 大学 */}
          <div className="space-y-1">
            <Label>{t("university")}</Label>
            <Input
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder={t("universityPlaceholder")}
            />
          </div>

          {/* 专业 */}
          <div className="space-y-1">
            <Label>{t("program")}</Label>
            <Input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder={t("programPlaceholder")}
            />
          </div>

          {/* 年份和排序 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t("year")}</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("sortOrder")}</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>

          {/* 感言 */}
          <div className="space-y-1">
            <Label>{t("testimonial")}</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder={t("testimonialPlaceholder")}
            />
          </div>

          {/* 推荐 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_featured">{t("isFeatured")}</Label>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
