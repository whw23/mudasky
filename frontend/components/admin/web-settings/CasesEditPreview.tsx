"use client"

/**
 * 案例列表编辑预览组件。
 * 在网页设置中直接管理成功案例，支持增删改。
 */

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { CaseEditDialog } from "./CaseEditDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

interface CaseItem {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  is_featured: boolean
  avatar_image_id: string | null
}

/** 案例列表编辑预览 */
export function CasesEditPreview() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)

  /* 编辑弹窗状态 */
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<CaseItem | null>(null)

  /* 删除弹窗状态 */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CaseItem | null>(null)

  /** 加载案例数据 */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/admin/web-settings/cases/list", {
        params: { page: 1, page_size: 100 },
      })
      setCases(res.data.items ?? [])
    } catch {
      setCases([])
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
  function handleEdit(item: CaseItem): void {
    setEditItem(item)
    setEditOpen(true)
  }

  /** 打开删除弹窗 */
  function handleDelete(item: CaseItem): void {
    setDeleteTarget(item)
    setDeleteOpen(true)
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-5xl">
        {/* 顶部操作栏 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold">案例管理</h3>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="mr-1 size-4" />
            添加案例
          </Button>
        </div>

        {/* 案例列表 */}
        {loading ? (
          <p className="text-center text-muted-foreground">加载中...</p>
        ) : cases.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">暂无案例</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-lg border bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  {c.avatar_image_id ? (
                    <img
                      src={`/api/public/images/detail?id=${c.avatar_image_id}`}
                      alt={c.student_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="truncate font-medium">{c.student_name}</h4>
                    <p className="text-xs text-muted-foreground">{c.year}</p>
                  </div>
                </div>
                <div className="mt-3 rounded bg-gray-50 px-3 py-2">
                  <p className="text-sm font-medium text-primary truncate">
                    {c.university}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.program}
                  </p>
                </div>
                {/* 操作按钮 */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(c)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <CaseEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        caseItem={editItem}
        onSuccess={fetchData}
      />

      {/* 删除确认弹窗 */}
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
        onSuccess={fetchData}
      />
    </div>
  )
}
