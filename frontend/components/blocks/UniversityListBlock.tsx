"use client"

/**
 * 院校列表区块。
 * 调用 UniversityList 组件展示完整院校列表（含搜索筛选）。
 * editable 模式下显示 ManageToolbar 并支持院校 CRUD + 学科管理。
 */

import { useState, useCallback } from "react"
import type { ReactNode } from "react"
import { Plus, Tags } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { Block } from "@/types/block"
import { UniversityList } from "@/components/public/UniversityList"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { ManageToolbar } from "@/components/admin/web-settings/ManageToolbar"
import { UniversityEditDialog } from "@/components/admin/web-settings/UniversityEditDialog"
import { DisciplineManageDialog } from "@/components/admin/web-settings/DisciplineManageDialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"

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
}

/** 院校列表区块 */
export function UniversityListBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<UniversityData | null>(null)

  /* 学科管理弹窗 */
  const [disciplineOpen, setDisciplineOpen] = useState(false)

  /* 导入预览状态 */
  const [previewData, setPreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  /* 刷新标记 */
  const [refreshKey, setRefreshKey] = useState(0)

  /** 刷新数据 */
  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  /** 打开编辑弹窗（编辑已有院校） */
  function handleEditUniversity(uni: any) {
    setEditItem(uni as UniversityData)
    setEditOpen(true)
  }

  /** 确认导入 */
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

  const el = (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}

        {/* 管理工具栏（仅编辑模式） */}
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
            <Button
              size="sm"
              onClick={() => {
                setEditItem(null)
                setEditOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" /> 添加院校
            </Button>
          </ManageToolbar>
        )}

        <UniversityList
          key={refreshKey}
          editable={editable}
          onEdit={editable ? handleEditUniversity : undefined}
          onManageDisciplines={editable ? () => setDisciplineOpen(true) : undefined}
        />
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <EditableOverlay onClick={() => onEdit(block)} label="编辑院校列表">
        {el}

        {/* 编辑弹窗 */}
        <UniversityEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          university={editItem}
          onSuccess={refreshData}
        />

        {/* 学科管理弹窗 */}
        <DisciplineManageDialog
          open={disciplineOpen}
          onOpenChange={setDisciplineOpen}
        />

        {/* 导入预览弹窗 */}
        <ImportPreviewDialog
          open={!!previewData}
          onOpenChange={(open) => !open && setPreviewData(null)}
          data={previewData}
          onConfirm={handleImportConfirm}
          columns={IMPORT_COLUMNS}
        />
      </EditableOverlay>
    )
  }
  return el
}
