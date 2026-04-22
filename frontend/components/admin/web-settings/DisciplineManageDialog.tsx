"use client"

/**
 * 学科分类管理弹窗。
 * 提供分类和学科的增删改功能，包含导入导出。
 */

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Save, X } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog"
import { ImportExportToolbar } from "@/components/admin/ImportExportToolbar"
import { ImportPreviewDialog } from "@/components/admin/ImportPreviewDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

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

interface DisciplineManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 学科分类管理弹窗 */
export function DisciplineManageDialog({ open, onOpenChange }: DisciplineManageDialogProps) {
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

  /* 导入预览状态 */
  const [discPreviewData, setDiscPreviewData] = useState<any>(null)

  /* 删除确认弹窗状态 */
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<DisciplineCategory | null>(null)
  const [deleteDisciplineOpen, setDeleteDisciplineOpen] = useState(false)
  const [deleteDisciplineTarget, setDeleteDisciplineTarget] = useState<{ disc: Discipline; catId: string } | null>(null)

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

  useEffect(() => {
    if (open) {
      fetchCategories()
    }
  }, [open, fetchCategories])

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

  /** 打开删除分类确认弹窗 */
  function handleDeleteCategory(category: DisciplineCategory) {
    setDeleteCategoryTarget(category)
    setDeleteCategoryOpen(true)
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

  /** 打开删除学科确认弹窗 */
  function handleDeleteDiscipline(discipline: Discipline, categoryId: string) {
    setDeleteDisciplineTarget({ disc: discipline, catId: categoryId })
    setDeleteDisciplineOpen(true)
  }

  /** 确认导入学科 */
  async function handleDiscConfirm(items: any[]) {
    await api.post("/admin/web-settings/disciplines/import/confirm", { items })
    fetchCategories()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>学科分类管理</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
            {/* 导入导出工具栏 */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">学科大分类</h4>
              <ImportExportToolbar
                templateUrl="/admin/web-settings/disciplines/import/template"
                importUrl="/admin/web-settings/disciplines/import/preview"
                exportUrl="/admin/web-settings/disciplines/export"
                onImportPreview={setDiscPreviewData}
                templateFilename="disciplines_template.xlsx"
                exportFilename="disciplines.xlsx"
                acceptZip={false}
              />
            </div>

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
                          onClick={() => handleDeleteCategory(cat)}
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
                                onClick={() => handleDeleteDiscipline(disc, cat.id)}
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
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* 学科导入预览弹窗 */}
      <ImportPreviewDialog
        open={!!discPreviewData}
        onOpenChange={(open) => !open && setDiscPreviewData(null)}
        data={discPreviewData}
        onConfirm={handleDiscConfirm}
        columns={[
          { key: "category_name", label: "分类名称" },
          { key: "name", label: "学科名称" },
        ]}
      />

      {/* 删除分类确认弹窗 */}
      <DeleteConfirmDialog
        open={deleteCategoryOpen}
        onOpenChange={setDeleteCategoryOpen}
        title={`删除分类「${deleteCategoryTarget?.name ?? ""}」`}
        description="此操作不可撤销，分类及其下所有学科将被永久删除。"
        onConfirm={() =>
          api.post("/admin/web-settings/disciplines/categories/list/detail/delete", {
            category_id: deleteCategoryTarget!.id,
          })
        }
        onSuccess={fetchCategories}
      />

      {/* 删除学科确认弹窗 */}
      <DeleteConfirmDialog
        open={deleteDisciplineOpen}
        onOpenChange={setDeleteDisciplineOpen}
        title={`删除学科「${deleteDisciplineTarget?.disc.name ?? ""}」`}
        description="此操作不可撤销，学科信息将被永久删除。"
        onConfirm={() =>
          api.post("/admin/web-settings/disciplines/list/detail/delete", {
            discipline_id: deleteDisciplineTarget!.disc.id,
          })
        }
        onSuccess={() => {
          if (deleteDisciplineTarget) {
            fetchDisciplines(deleteDisciplineTarget.catId)
          }
        }}
      />
    </>
  )
}
