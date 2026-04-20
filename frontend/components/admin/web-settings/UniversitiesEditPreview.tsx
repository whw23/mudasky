"use client"

/**
 * 院校列表编辑预览组件。
 * 在网页设置中直接管理院校数据，支持增删改。
 */

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, MapPin, Award, ChevronDown, ChevronRight, Save, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface DisciplineCategory {
  id: string
  name: string
  display_order: number
}

interface Discipline {
  id: string
  category_id: string
  name: string
  display_order: number
}

interface UniversitiesEditPreviewProps {
  onBannerEdit: (pageKey: string) => void
}

/** 院校列表编辑预览 */
export function UniversitiesEditPreview({ onBannerEdit }: UniversitiesEditPreviewProps) {
  const t = useTranslations("Pages")
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)

  /* 学科管理状态 */
  const [disciplinesExpanded, setDisciplinesExpanded] = useState(false)
  const [categories, setCategories] = useState<DisciplineCategory[]>([])
  const [disciplines, setDisciplines] = useState<Record<string, Discipline[]>>({})
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [editingDisciplineId, setEditingDisciplineId] = useState<string | null>(null)
  const [editingDisciplineName, setEditingDisciplineName] = useState("")
  const [addingDisciplineToCategoryId, setAddingDisciplineToCategoryId] = useState<string | null>(null)
  const [newDisciplineName, setNewDisciplineName] = useState("")
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

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

  /** 加载学科分类 */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/admin/web-settings/disciplines/categories/list")
      setCategories(res.data ?? [])
    } catch {
      setCategories([])
    }
  }, [])

  /** 加载某个分类下的学科 */
  const fetchDisciplines = useCallback(async (categoryId: string) => {
    try {
      const res = await api.get("/admin/web-settings/disciplines/list", {
        params: { category_id: categoryId },
      })
      setDisciplines((prev) => ({ ...prev, [categoryId]: res.data ?? [] }))
    } catch {
      setDisciplines((prev) => ({ ...prev, [categoryId]: [] }))
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    if (disciplinesExpanded) {
      fetchCategories()
    }
  }, [disciplinesExpanded, fetchCategories])

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

  /** 创建分类 */
  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    try {
      await api.post("/admin/web-settings/disciplines/categories/list/create", {
        name: newCategoryName,
      })
      toast.success("分类已创建")
      setNewCategoryName("")
      setAddingCategory(false)
      fetchCategories()
    } catch {
      toast.error("创建失败")
    }
  }

  /** 更新分类 */
  async function handleUpdateCategory(categoryId: string) {
    if (!editingCategoryName.trim()) return
    try {
      await api.post("/admin/web-settings/disciplines/categories/list/detail/edit", {
        category_id: categoryId,
        name: editingCategoryName,
      })
      toast.success("分类已更新")
      setEditingCategoryId(null)
      fetchCategories()
    } catch {
      toast.error("更新失败")
    }
  }

  /** 删除分类 */
  async function handleDeleteCategory(categoryId: string) {
    if (!confirm("确认删除该分类？")) return
    try {
      await api.post("/admin/web-settings/disciplines/categories/list/detail/delete", {
        category_id: categoryId,
      })
      toast.success("分类已删除")
      fetchCategories()
    } catch {
      toast.error("删除失败")
    }
  }

  /** 创建学科 */
  async function handleCreateDiscipline(categoryId: string) {
    if (!newDisciplineName.trim()) return
    try {
      await api.post("/admin/web-settings/disciplines/list/create", {
        category_id: categoryId,
        name: newDisciplineName,
      })
      toast.success("学科已创建")
      setNewDisciplineName("")
      setAddingDisciplineToCategoryId(null)
      fetchDisciplines(categoryId)
    } catch {
      toast.error("创建失败")
    }
  }

  /** 更新学科 */
  async function handleUpdateDiscipline(disciplineId: string, categoryId: string) {
    if (!editingDisciplineName.trim()) return
    try {
      await api.post("/admin/web-settings/disciplines/list/detail/edit", {
        discipline_id: disciplineId,
        name: editingDisciplineName,
      })
      toast.success("学科已更新")
      setEditingDisciplineId(null)
      fetchDisciplines(categoryId)
    } catch {
      toast.error("更新失败")
    }
  }

  /** 删除学科 */
  async function handleDeleteDiscipline(disciplineId: string, categoryId: string) {
    if (!confirm("确认删除该学科？")) return
    try {
      await api.post("/admin/web-settings/disciplines/list/detail/delete", {
        discipline_id: disciplineId,
      })
      toast.success("学科已删除")
      fetchDisciplines(categoryId)
    } catch {
      toast.error("删除失败")
    }
  }

  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("universities")} label="编辑 Banner">
        <Banner title={t("universities")} subtitle={t("universitiesSubtitle")} />
      </EditableOverlay>
      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          {/* 学科分类管理 */}
          <div className="mb-8 rounded-lg border bg-white p-4">
            <button
              onClick={() => setDisciplinesExpanded(!disciplinesExpanded)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="text-lg font-semibold">学科分类管理</h3>
              {disciplinesExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
            </button>

            {disciplinesExpanded && (
              <div className="mt-4 space-y-4">
                {/* 添加分类按钮 */}
                <div className="flex items-center gap-2">
                  {addingCategory ? (
                    <>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="分类名称"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateCategory()
                          if (e.key === "Escape") {
                            setAddingCategory(false)
                            setNewCategoryName("")
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleCreateCategory}>
                        <Save className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAddingCategory(false)
                          setNewCategoryName("")
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setAddingCategory(true)}>
                      <Plus className="mr-1 size-4" />
                      添加大分类
                    </Button>
                  )}
                </div>

                {/* 分类列表 */}
                {categories.map((cat) => {
                  const catDisciplines = disciplines[cat.id] ?? []
                  const expanded = !!disciplines[cat.id]
                  return (
                    <div key={cat.id} className="rounded border bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (expanded) {
                              setDisciplines((prev) => {
                                const next = { ...prev }
                                delete next[cat.id]
                                return next
                              })
                            } else {
                              fetchDisciplines(cat.id)
                            }
                          }}
                          className="text-muted-foreground"
                        >
                          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                        {editingCategoryId === cat.id ? (
                          <>
                            <Input
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateCategory(cat.id)
                                if (e.key === "Escape") setEditingCategoryId(null)
                              }}
                            />
                            <Button size="sm" onClick={() => handleUpdateCategory(cat.id)}>
                              <Save className="size-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCategoryId(null)}>
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium">{cat.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCategoryId(cat.id)
                                setEditingCategoryName(cat.name)
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(cat.id)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setAddingDisciplineToCategoryId(cat.id)}
                            >
                              <Plus className="mr-1 size-4" />
                              添加学科
                            </Button>
                          </>
                        )}
                      </div>

                      {/* 学科列表 */}
                      {expanded && (
                        <div className="mt-3 ml-6 space-y-2">
                          {addingDisciplineToCategoryId === cat.id && (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newDisciplineName}
                                onChange={(e) => setNewDisciplineName(e.target.value)}
                                placeholder="学科名称"
                                className="flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCreateDiscipline(cat.id)
                                  if (e.key === "Escape") {
                                    setAddingDisciplineToCategoryId(null)
                                    setNewDisciplineName("")
                                  }
                                }}
                              />
                              <Button size="sm" onClick={() => handleCreateDiscipline(cat.id)}>
                                <Save className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddingDisciplineToCategoryId(null)
                                  setNewDisciplineName("")
                                }}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          )}
                          {catDisciplines.map((disc) => (
                            <div key={disc.id} className="flex items-center gap-2 rounded border bg-white p-2">
                              {editingDisciplineId === disc.id ? (
                                <>
                                  <Input
                                    value={editingDisciplineName}
                                    onChange={(e) => setEditingDisciplineName(e.target.value)}
                                    className="flex-1"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleUpdateDiscipline(disc.id, cat.id)
                                      if (e.key === "Escape") setEditingDisciplineId(null)
                                    }}
                                  />
                                  <Button size="sm" onClick={() => handleUpdateDiscipline(disc.id, cat.id)}>
                                    <Save className="size-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingDisciplineId(null)}>
                                    <X className="size-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1">{disc.name}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingDisciplineId(disc.id)
                                      setEditingDisciplineName(disc.name)
                                    }}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteDiscipline(disc.id, cat.id)}
                                  >
                                    <Trash2 className="size-3.5 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
