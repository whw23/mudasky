"use client"

/**
 * 院校列表区块。
 * 调用 UniversityList 组件展示完整院校列表（含搜索筛选）。
 * editable 模式下显示管理工具栏（导入导出+学科管理）+ 添加院校占位卡片。
 */

import { useState, useCallback } from "react"
import type { ReactNode } from "react"
import { Tags } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { Block } from "@/types/block"
import { UniversityList } from "@/components/public/UniversityList"
import { ManageToolbar } from "@/components/admin/web-settings/ManageToolbar"
import { UniversityEditDialog } from "@/components/admin/web-settings/UniversityEditDialog"
import { DisciplineManageDialog } from "@/components/admin/web-settings/DisciplineManageDialog"
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

/** 导入预览表格列 */
const IMPORT_COLUMNS = [
  { key: "name", label: "院校名称" },
  { key: "country", label: "国家" },
  { key: "city", label: "城市" },
]

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  blockLabel?: string
}

/** 院校列表区块 */
export function UniversityListBlock({ block, header, bg, editable }: BlockProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<UniversityData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UniversityData | null>(null)
  const [disciplineOpen, setDisciplineOpen] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  function handleEditUniversity(uni: any) {
    setEditItem(uni as UniversityData)
    setEditOpen(true)
  }

  function handleCreateUniversity() {
    setEditItem(null)
    setEditOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await api.post("/admin/web-settings/universities/list/detail/delete", {
        university_id: deleteTarget.id,
      })
      toast.success("院校已删除")
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
      "/admin/web-settings/universities/list/import/confirm",
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
                templateUrl="/admin/web-settings/universities/list/import/template"
                importUrl="/admin/web-settings/universities/list/import/preview"
                exportUrl="/admin/web-settings/universities/list/export"
                onImportPreview={setPreviewData}
                onFileSelect={setImportFile}
                templateFilename="universities_template.zip"
                exportFilename="universities.zip"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDisciplineOpen(true)}
              >
                <Tags className="mr-1 size-4" /> 学科管理
              </Button>
            </ManageToolbar>
          )}

          <UniversityList
            key={refreshKey}
            editable={editable}
            onEdit={editable ? handleEditUniversity : undefined}
            onAdd={editable ? handleCreateUniversity : undefined}
            onDelete={editable ? (uni) => setDeleteTarget(uni as UniversityData) : undefined}
            onManageDisciplines={editable ? () => setDisciplineOpen(true) : undefined}
          />
        </div>
      </section>

      {editable && (
        <UniversityEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          university={editItem}
          onSuccess={refreshData}
        />
      )}

      {editable && (
        <DisciplineManageDialog
          open={disciplineOpen}
          onOpenChange={setDisciplineOpen}
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
              确定要删除院校「{deleteTarget?.name}」吗？此操作不可撤销。
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
