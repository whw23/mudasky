"use client"

/**
 * 案例编辑弹窗。
 * 用于创建和编辑成功案例信息。
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

interface CaseData {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  is_featured: boolean
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
  const [saving, setSaving] = useState(false)

  /** 打开时初始化表单 */
  useEffect(() => {
    if (open && caseItem) {
      setStudentName(caseItem.student_name)
      setUniversity(caseItem.university)
      setProgram(caseItem.program)
      setYear(caseItem.year)
      setTestimonial(caseItem.testimonial ?? "")
    } else if (open && !caseItem) {
      setStudentName("")
      setUniversity("")
      setProgram("")
      setYear(new Date().getFullYear())
      setTestimonial("")
    }
  }, [open, caseItem])

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑案例" : "添加案例"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
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
