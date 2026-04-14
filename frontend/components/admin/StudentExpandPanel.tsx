"use client"

/**
 * 学生详情行内展开面板。
 * 在学生表格中展开显示，提供编辑、顾问分配、文档查看、降级等操作。
 */

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import api from "@/lib/api"
import type { Student, Document } from "@/types"

interface StudentExpandPanelProps {
  userId: string
  onUpdate: () => void
}

/** 学生详情行内展开面板 */
export function StudentExpandPanel({ userId, onUpdate }: StudentExpandPanelProps) {

  const [student, setStudent] = useState<Student | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isActive, setIsActive] = useState(false)
  const [contactNote, setContactNote] = useState("")
  const [advisorId, setAdvisorId] = useState("")
  const [saving, setSaving] = useState(false)
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)

  /** 加载学生详情 */
  const fetchStudent = useCallback(async () => {
    try {
      const { data } = await api.get<Student>(
        "/admin/students/list/detail",
        { params: { user_id: userId } },
      )
      setStudent(data)
      setIsActive(data.is_active)
      setContactNote(data.contact_note ?? "")
      setAdvisorId(data.advisor_id ?? "")
    } catch {
      toast.error("加载学生信息失败")
    }
  }, [userId])

  /** 加载学生文档列表 */
  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await api.get<{ items: Document[] }>(
        "/admin/students/list/detail/documents/list",
        { params: { user_id: userId } },
      )
      setDocuments(data.items)
    } catch {
      /* 忽略 */
    }
  }, [userId])

  useEffect(() => {
    fetchStudent()
    fetchDocuments()
  }, [fetchStudent, fetchDocuments])

  /** 通用操作包装 */
  async function runAction(action: () => Promise<void>, successMsg: string): Promise<void> {
    setSaving(true)
    try {
      await action()
      toast.success(successMsg)
      onUpdate()
    } catch (err) {
      toast.error("操作失败")
    } finally {
      setSaving(false)
    }
  }

  /** 保存编辑（状态 + 联系备注） */
  function handleSaveEdit(): void {
    runAction(
      () => api.post("/admin/students/list/detail/edit", {
        user_id: userId,
        is_active: isActive,
        contact_note: contactNote,
      }),
      "保存成功",
    )
  }

  /** 保存顾问分配 */
  function handleAssignAdvisor(): void {
    runAction(
      () => api.post("/admin/students/list/detail/assign-advisor", {
        user_id: userId,
        advisor_id: advisorId || null,
      }),
      "分配顾问成功",
    )
  }

  /** 降级学生 */
  async function handleDowngrade(): Promise<void> {
    setSaving(true)
    try {
      await api.post("/admin/students/list/detail/downgrade", { user_id: userId })
      toast.success("降级成功")
      setShowDowngradeDialog(false)
      onUpdate()
    } catch (err) {
      toast.error("操作失败")
    } finally {
      setSaving(false)
    }
  }

  /** 下载文档 */
  function handleDownloadDoc(docId: string): void {
    window.open(`/api/admin/students/list/detail/documents/list/detail/download?doc_id=${docId}`)
  }

  /** 格式化日期 */
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString()
  }

  /** 格式化文件大小 */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!student) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        {"加载中..."}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* 基本信息 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {"基本信息"}
          </h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">{"用户名"}</span>
            <span>{student.username ?? "-"}</span>
            <span className="text-muted-foreground">{"手机号"}</span>
            <span>{student.phone ?? "-"}</span>
            <span className="text-muted-foreground">{"状态"}</span>
            <span>{student.is_active ? "已激活" : "已禁用"}</span>
            <span className="text-muted-foreground">{"创建时间"}</span>
            <span>{formatDate(student.created_at)}</span>
          </div>
        </section>

        {/* 编辑区域 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {"编辑"}
          </h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            {"已激活"}
          </label>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">{"备注"}</label>
            <textarea
              value={contactNote}
              onChange={(e) => setContactNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <Button size="sm" disabled={saving} onClick={handleSaveEdit}>
            {"保存"}
          </Button>
        </section>

        {/* 顾问分配 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {"分配顾问"}
          </h3>
          <Input
            placeholder="顾问 ID"
            value={advisorId}
            onChange={(e) => setAdvisorId(e.target.value)}
          />
          <Button size="sm" disabled={saving} onClick={handleAssignAdvisor}>
            {"确认"}
          </Button>
        </section>

        {/* 文档列表 */}
        <section className="space-y-2 sm:col-span-2 lg:col-span-3">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {"文件列表"}
          </h3>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{"暂无文件"}</p>
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium">{"文件名"}</th>
                    <th className="px-3 py-2 text-left font-medium">{"分类"}</th>
                    <th className="px-3 py-2 text-left font-medium">{"大小"}</th>
                    <th className="px-3 py-2 text-left font-medium">{"创建时间"}</th>
                    <th className="px-3 py-2 text-left font-medium">{"操作"}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b">
                      <td className="px-3 py-2">{doc.original_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{doc.category}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatFileSize(doc.file_size)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(doc.created_at)}</td>
                      <td className="px-3 py-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => handleDownloadDoc(doc.id)}
                        >
                          {"下载"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Separator className="sm:col-span-2 lg:col-span-3" />

        {/* 降级操作 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {"降为访客"}
          </h3>
          <p className="text-xs text-muted-foreground">{"将学生降级为访客角色，此操作不可撤销"}</p>
          <Button
            variant="destructive"
            size="sm"
            disabled={saving}
            onClick={() => setShowDowngradeDialog(true)}
          >
            {"降为访客"}
          </Button>
        </section>
      </div>

      {/* 降级确认弹窗 */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{"确认降级"}</AlertDialogTitle>
            <AlertDialogDescription>{"确定要将该学生降级为访客吗？此操作不可撤销。"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{"取消"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDowngrade}
              disabled={saving}
            >
              {"确认降级"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
