"use client"

/**
 * 案例网格区块。
 * 调用 CaseGrid 组件展示成功案例列表。
 * editable 模式下显示管理工具栏（导入导出）+ 添加案例占位卡片。
 */

import { useState, useCallback } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import type { Block } from "@/types/block"
import { CaseGrid } from "@/components/public/CaseGrid"
import { ManageToolbar } from "@/components/admin/web-settings/ManageToolbar"
import { CaseEditDialog } from "@/components/admin/web-settings/CaseEditDialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"
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

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number | null
  testimonial: string | null
  is_featured: boolean
  avatar_image_id: string | null
  offer_image_id: string | null
  university_id: string | null
}

/** 导入预览表格列 */
const IMPORT_COLUMNS = [
  { key: "student_name", label: "学生姓名" },
  { key: "university", label: "录取院校" },
  { key: "program", label: "录取专业" },
  { key: "year", label: "年份" },
]

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  blockLabel?: string
}

/** 案例网格区块 */
export function CaseGridBlock({ block, header, bg, editable }: BlockProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<CaseItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CaseItem | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  function handleEditCase(item: any) {
    setEditItem(item as CaseItem)
    setEditOpen(true)
  }

  function handleCreateCase() {
    setEditItem(null)
    setEditOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await api.post("/admin/web-settings/cases/list/detail/delete", {
        case_id: deleteTarget.id,
      })
      toast.success("案例已删除")
      setDeleteTarget(null)
      refreshData()
    } catch {
      toast.error("删除失败")
    }
  }

  async function handleImportConfirm(items: any[]) {
    if (!importFile) {
      toast.error("未找到导入文件")
      return
    }
    const formData = new FormData()
    formData.append("file", importFile)
    formData.append("items", JSON.stringify(items))
    await api.post(
      "/admin/web-settings/cases/list/import/confirm",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    )
    refreshData()
  }

  return (
    <>
      <section className={`py-10 md:py-16 ${bg}`}>
        <div className="mx-auto max-w-7xl px-4">
          {header}

          {editable && (
            <ManageToolbar>
              <ImportExportToolbar
                templateUrl="/admin/web-settings/cases/list/import/template"
                importUrl="/admin/web-settings/cases/list/import/preview"
                exportUrl="/admin/web-settings/cases/list/export"
                onImportPreview={setPreviewData}
                onFileSelect={setImportFile}
                templateFilename="cases_template.zip"
                exportFilename="cases.zip"
              />
            </ManageToolbar>
          )}

          <CaseGrid
            key={refreshKey}
            editable={editable}
            onEdit={editable ? handleEditCase : undefined}
            onAdd={editable ? handleCreateCase : undefined}
            onDelete={editable ? (item) => setDeleteTarget(item as CaseItem) : undefined}
          />
        </div>
      </section>

      {editable && (
        <CaseEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          caseItem={editItem}
          onSuccess={refreshData}
        />
      )}

      {editable && (
        <ImportPreviewDialog
          open={!!previewData}
          onOpenChange={(open) => !open && setPreviewData(null)}
          data={previewData}
          onConfirm={handleImportConfirm}
          columns={IMPORT_COLUMNS}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除案例「{deleteTarget?.student_name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
