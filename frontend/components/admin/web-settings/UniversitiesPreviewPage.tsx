"use client"

/**
 * 院校页面预览组件。
 * 视觉预览模式 + 管理功能（增删改院校、管理学科分类）。
 */

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/layout/Banner"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { PageIntroSection } from "@/components/common/PageIntroSection"
import { UniversityList } from "@/components/public/UniversityList"
import { CtaSection } from "@/components/common/CtaSection"
import { UniversityEditDialog } from "./UniversityEditDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { DisciplineManageDialog } from "./DisciplineManageDialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"
import api from "@/lib/api"

interface University {
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

interface UniversitiesPreviewPageProps {
  onBannerEdit: (pageKey: string) => void
  onEditConfig: (section: string) => void
}

/** 院校页面预览 */
export function UniversitiesPreviewPage({ onBannerEdit, onEditConfig }: UniversitiesPreviewPageProps) {
  const t = useTranslations("Pages")
  const ut = useTranslations("Universities")

  /* 院校编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<University | null>(null)

  /* 院校删除弹窗状态 */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null)

  /* 学科管理弹窗状态 */
  const [disciplineOpen, setDisciplineOpen] = useState(false)

  /* 导入预览状态 */
  const [uniPreviewData, setUniPreviewData] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  /* 刷新 key，用于触发 UniversityList 重新加载 */
  const [refreshKey, setRefreshKey] = useState(0)

  /** 打开新建弹窗 */
  function handleCreate(): void {
    setEditItem(null)
    setEditOpen(true)
  }

  /** 打开编辑弹窗 */
  function handleEdit(uni: University): void {
    setEditItem(uni)
    setEditOpen(true)
  }

  /** 打开删除弹窗 */
  function handleDelete(uni: University): void {
    setDeleteTarget(uni)
    setDeleteOpen(true)
  }

  /** 打开学科管理弹窗 */
  function handleManageDisciplines(): void {
    setDisciplineOpen(true)
  }

  /** 编辑/删除成功后刷新列表 */
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  /** 确认导入院校 */
  async function handleUniConfirm(items: any[]) {
    if (!importFile) {
      throw new Error("未找到导入文件")
    }
    const formData = new FormData()
    formData.append("file", importFile)
    formData.append("items", JSON.stringify(items))
    await api.post("/admin/web-settings/universities/list/import/confirm", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    handleRefresh()
  }

  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("universities")} label="编辑 Banner">
        <Banner title={t("universities")} subtitle={t("universitiesSubtitle")} />
      </EditableOverlay>

      {/* Overview section */}
      <PageIntroSection
        titleKey="universities_intro_title"
        contentKey="universities_intro_desc"
        titleFallback={ut("title")}
        contentFallback={ut("intro")}
        sectionTag="Partner Universities"
        editable
        onEditTitle={() => onEditConfig("universities_intro_title")}
        onEditContent={() => onEditConfig("universities_intro_desc")}
      />

      {/* 管理工具栏 */}
      <div className="mx-auto max-w-7xl px-4 pb-6">
        <div className="flex items-center justify-end gap-2">
          <ImportExportToolbar
            templateUrl="/admin/web-settings/universities/list/import/template"
            importUrl="/admin/web-settings/universities/list/import/preview"
            exportUrl="/admin/web-settings/universities/list/export"
            onImportPreview={setUniPreviewData}
            onFileSelect={setImportFile}
            templateFilename="universities_template.zip"
            exportFilename="universities.zip"
          />
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1 size-4" />
            添加院校
          </Button>
        </div>
      </div>

      {/* 院校列表（可编辑模式） */}
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <UniversityList
          key={refreshKey}
          editable
          onEdit={handleEdit}
          onManageDisciplines={handleManageDisciplines}
        />
      </div>

      {/* CTA Section */}
      <CtaSection translationNamespace="Universities" editable onEdit={() => onEditConfig("universities_cta")} />

      {/* 编辑弹窗 */}
      <UniversityEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        university={editItem}
        onSuccess={handleRefresh}
      />

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`删除院校「${deleteTarget?.name ?? ""}」`}
        description="此操作不可撤销，院校信息将被永久删除。"
        onConfirm={() =>
          api.post("/admin/web-settings/universities/list/detail/delete", {
            university_id: deleteTarget!.id,
          })
        }
        onSuccess={handleRefresh}
      />

      {/* 学科管理弹窗 */}
      <DisciplineManageDialog
        open={disciplineOpen}
        onOpenChange={setDisciplineOpen}
      />

      {/* 院校导入预览弹窗 */}
      <ImportPreviewDialog
        open={!!uniPreviewData}
        onOpenChange={(open) => !open && setUniPreviewData(null)}
        data={uniPreviewData}
        onConfirm={handleUniConfirm}
        columns={[
          { key: "name", label: "院校名称" },
          { key: "country", label: "国家" },
          { key: "city", label: "城市" },
        ]}
      />
    </>
  )
}
