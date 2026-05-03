"use client"

/**
 * 案例网格区块。
 * 调用 CaseGrid 组件展示成功案例列表。
 * editable 模式下显示 ManageToolbar 并支持案例 CRUD。
 */

import { useState, useCallback } from "react"
import type { ReactNode } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import type { Block } from "@/types/block"
import { CaseGrid } from "@/components/public/CaseGrid"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { ManageToolbar } from "@/components/admin/web-settings/ManageToolbar"
import { CaseEditDialog } from "@/components/admin/web-settings/CaseEditDialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"

interface CaseItem {
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
}

/** 案例网格区块 */
export function CaseGridBlock({ block, header, bg, editable, onEdit }: BlockProps) {
  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<CaseItem | null>(null)

  /* 导入预览状态 */
  const [previewData, setPreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  /* 刷新标记 */
  const [refreshKey, setRefreshKey] = useState(0)

  /** 刷新数据 */
  const refreshData = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  /** 打开编辑弹窗（编辑已有案例） */
  function handleEditCase(item: any) {
    setEditItem(item as CaseItem)
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
      "/admin/web-settings/cases/list/import/confirm",
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
              templateUrl="/admin/web-settings/cases/list/import/template"
              importUrl="/admin/web-settings/cases/list/import/preview"
              exportUrl="/admin/web-settings/cases/list/export"
              onImportPreview={setPreviewData}
              onFileSelect={setImportFile}
              templateFilename="cases_template.zip"
              exportFilename="cases.zip"
            />
            <Button
              size="sm"
              onClick={() => {
                setEditItem(null)
                setEditOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" /> 添加案例
            </Button>
          </ManageToolbar>
        )}

        <CaseGrid
          key={refreshKey}
          editable={editable}
          onEdit={editable ? handleEditCase : undefined}
        />
      </div>
    </section>
  )

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label="编辑案例网格">
        {el}

        {/* 编辑弹窗 */}
        <CaseEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          caseItem={editItem}
          onSuccess={refreshData}
        />

        {/* 导入预览弹窗 */}
        <ImportPreviewDialog
          open={!!previewData}
          onOpenChange={(open) => !open && setPreviewData(null)}
          data={previewData}
          onConfirm={handleImportConfirm}
          columns={IMPORT_COLUMNS}
        />
      </SpotlightOverlay>
    )
  }
  return el
}
