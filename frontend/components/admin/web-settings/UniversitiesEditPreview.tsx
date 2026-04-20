"use client"

/**
 * 院校列表编辑预览组件。
 * 在网页设置中直接管理院校数据，支持增删改。
 */

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, MapPin, Award } from "lucide-react"
import { useTranslations } from "next-intl"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/layout/Banner"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { UniversityEditDialog } from "./UniversityEditDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

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
  qs_rankings: { year: number; ranking: number }[] | null
}

interface UniversitiesEditPreviewProps {
  onBannerEdit: (pageKey: string) => void
}

/** 院校列表编辑预览 */
export function UniversitiesEditPreview({ onBannerEdit }: UniversitiesEditPreviewProps) {
  const t = useTranslations("Pages")
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)

  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<University | null>(null)

  /* 删除弹窗状态 */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null)

  /** 加载院校数据 */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/admin/web-settings/universities/list", {
        params: { page: 1, page_size: 100 },
      })
      setUniversities(res.data.items ?? [])
    } catch {
      setUniversities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

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

  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("universities")} label="编辑 Banner">
        <Banner title={t("universities")} subtitle={t("universitiesSubtitle")} />
      </EditableOverlay>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          {/* 顶部操作栏 */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold">院校管理</h3>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="mr-1 size-4" />
              添加院校
            </Button>
          </div>

        {/* 院校网格 */}
        {loading ? (
          <p className="text-center text-muted-foreground">加载中...</p>
        ) : universities.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">暂无院校</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {universities.map((uni) => {
              const latest = uni.qs_rankings?.sort((a, b) => b.year - a.year)[0]
              return (
                <div
                  key={uni.id}
                  className="group relative rounded-lg border bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    {uni.logo_image_id ? (
                      <img
                        src={`/api/public/images/detail?id=${uni.logo_image_id}`}
                        alt={uni.name}
                        className="h-10 w-10 rounded object-contain border"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-sm font-bold text-gray-400">
                        {uni.name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-medium">{uni.name}</h4>
                      {uni.name_en && (
                        <p className="truncate text-xs text-muted-foreground">
                          {uni.name_en}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    <span>
                      {uni.country}
                      {uni.province ? ` · ${uni.province}` : ""}
                      {` · ${uni.city}`}
                    </span>
                  </div>
                  {latest && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <Award className="size-3" />
                      QS {latest.year} #{latest.ranking}
                    </div>
                  )}
                  {/* 操作按钮 */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(uni)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDelete(uni)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>

        {/* 编辑弹窗 */}
        <UniversityEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          university={editItem}
          onSuccess={fetchData}
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
          onSuccess={fetchData}
        />
      </div>
    </>
  )
}
