"use client"

/**
 * 案例预览页面组件。
 * 在网页设置中以视觉化方式预览和编辑案例列表。
 */

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { PageBanner } from "@/components/layout/PageBanner"
import { CtaSection } from "@/components/common/CtaSection"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { CaseGrid } from "@/components/public/CaseGrid"
import { ManageToolbar } from "./ManageToolbar"
import { CaseEditDialog } from "./CaseEditDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
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

interface CasesPreviewPageProps {
  onBannerEdit: (pageKey: string) => void
  onEditConfig: (section: string) => void
}

/** 案例预览页面 */
export function CasesPreviewPage({ onBannerEdit, onEditConfig }: CasesPreviewPageProps) {
  const p = useTranslations("Pages")
  const t = useTranslations("Cases")

  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<CaseItem | null>(null)

  /* 删除弹窗状态 */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CaseItem | null>(null)

  /* 导入预览状态 */
  const [casePreviewData, setCasePreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  /* 刷新标记（用于触发 CaseGrid 重新加载） */
  const [refreshKey, setRefreshKey] = useState(0)

  /** 刷新数据 */
  function refreshData() {
    setRefreshKey((k) => k + 1)
  }

  /** 打开编辑弹窗 */
  function handleEdit(item: any) {
    setEditItem(item)
    setEditOpen(true)
  }

  /** 确认导入案例 */
  async function handleCaseConfirm(items: any[]) {
    if (!importFile) {
      toast.error("未找到导入文件")
      return
    }
    const formData = new FormData()
    formData.append("file", importFile)
    formData.append("items", JSON.stringify(items))
    await api.post("/admin/web-settings/cases/list/import/confirm", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    refreshData()
  }

  return (
    <>
      {/* Banner */}
      <EditableOverlay onClick={() => onBannerEdit("cases")} label="编辑 Banner">
        <PageBanner pageKey="cases" title={p("cases")} subtitle={p("casesSubtitle")} />
      </EditableOverlay>

      {/* 案例简介 */}
      <PageIntroSection
        titleKey="cases_intro_title"
        contentKey="cases_intro_desc"
        titleFallback={t("title")}
        contentFallback="每个成功的留学故事都始于一次专业的咨询"
        sectionTag="Success Stories"
        editable
        onEditTitle={() => onEditConfig("cases_intro_title")}
        onEditContent={() => onEditConfig("cases_intro_desc")}
      />

      {/* 管理工具栏 */}
      <div className="mx-auto max-w-7xl px-4 pb-6">
        <ManageToolbar>
          <ImportExportToolbar
            templateUrl="/admin/web-settings/cases/list/import/template"
            importUrl="/admin/web-settings/cases/list/import/preview"
            exportUrl="/admin/web-settings/cases/list/export"
            onImportPreview={setCasePreviewData}
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
      </div>

      {/* 案例网格 */}
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <CaseGrid key={refreshKey} editable onEdit={handleEdit} />
      </div>

      {/* CTA */}
      <CtaSection translationNamespace="Cases" editable onEdit={() => onEditConfig("cases_cta")} />

      {/* 编辑弹窗 */}
      <CaseEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        caseItem={editItem}
        onSuccess={refreshData}
      />

      {/* 删除确认弹窗（暂不使用，保留接口） */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`删除案例「${deleteTarget?.student_name ?? ""}」`}
        description="此操作不可撤销，案例信息将被永久删除。"
        onConfirm={() =>
          api.post("/admin/web-settings/cases/list/detail/delete", {
            case_id: deleteTarget!.id,
          })
        }
        onSuccess={refreshData}
      />

      {/* 案例导入预览弹窗 */}
      <ImportPreviewDialog
        open={!!casePreviewData}
        onOpenChange={(open) => !open && setCasePreviewData(null)}
        data={casePreviewData}
        onConfirm={handleCaseConfirm}
        columns={[
          { key: "student_name", label: "学生姓名" },
          { key: "university", label: "录取院校" },
          { key: "program", label: "录取专业" },
          { key: "year", label: "年份" },
        ]}
      />
    </>
  )
}
