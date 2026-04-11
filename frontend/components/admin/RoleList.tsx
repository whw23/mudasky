"use client"

/**
 * 角色列表组件。
 * 表格展示，支持拖拽排序、创建、编辑和删除。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { RoleDialog } from "@/components/admin/RoleDialog"
import api from "@/lib/api"
import type { Role } from "@/types"

/** 表格列定义：grid-template-columns */
const GRID_COLS = "grid-cols-[40px_1fr_1fr_80px_80px_80px_120px]"

/** 可排序的表格行 */
function SortableRow({
  role,
  onEdit,
  onDelete,
  t,
}: {
  role: Role
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  t: ReturnType<typeof useTranslations>
}) {
  const isSuperuser = role.permissions.some((p) => p.code === "*")

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid ${GRID_COLS} items-center border-b transition-colors hover:bg-muted/30`}
    >
      <div
        className="px-4 py-3 text-muted-foreground cursor-grab"
        {...attributes}
        {...listeners}
      >
        ⠿
      </div>
      <div className="px-4 py-3 font-semibold">{role.name}</div>
      <div className="px-4 py-3 text-muted-foreground">
        {role.description}
      </div>
      <div className="px-4 py-3">
        {role.is_builtin ? (
          <span className="rounded-full px-2 py-0.5 text-xs bg-secondary text-muted-foreground">
            {t("builtin")}
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            {t("custom")}
          </span>
        )}
      </div>
      <div className="px-4 py-3 text-muted-foreground">
        {role.permissions.length}
      </div>
      <div className="px-4 py-3 text-muted-foreground">
        {role.user_count}
      </div>
      <div className="px-4 py-3">
        {isSuperuser ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(role)}
            >
              {t("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(role)}
            >
              {t("delete")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** 角色列表 */
export function RoleList() {
  const t = useTranslations("AdminGroups")

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /** 获取角色列表 */
  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Role[]>("/admin/role/list")
      setRoles(data)
    } catch {
      toast.error(t("fetchError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  /** 拖拽排序结束 */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = roles.findIndex((r) => r.id === active.id)
    const newIndex = roles.findIndex((r) => r.id === over.id)
    const reordered = arrayMove(roles, oldIndex, newIndex)

    setRoles(reordered)

    try {
      await api.post("/admin/role/reorder", {
        items: reordered.map((r, i) => ({
          id: r.id,
          sort_order: i,
        })),
      })
    } catch {
      toast.error(t("reorderError"))
      fetchRoles()
    }
  }

  /** 打开创建对话框 */
  const handleCreate = () => {
    setEditingRole(null)
    setDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setDialogOpen(true)
  }

  /** 删除角色 */
  const handleDelete = async (role: Role) => {
    if (!confirm(t("deleteConfirm", { name: role.name }))) return
    try {
      await api.post(`/admin/role/delete/${role.id}`)
      toast.success(t("deleteSuccess"))
      fetchRoles()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 对话框保存后刷新列表 */
  const handleSaved = () => {
    setDialogOpen(false)
    fetchRoles()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreate}>
            {t("createGroup")}
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">
            {t("loading")}
          </p>
        ) : roles.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {t("noData")}
          </p>
        ) : (
          <SortableContext
            items={roles.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="overflow-x-auto rounded-lg border text-sm">
              {/* 表头 */}
              <div className={`grid ${GRID_COLS} border-b bg-muted/50`}>
                <div className="px-4 py-3 font-medium">
                  {t("col_drag")}
                </div>
                <div className="px-4 py-3 font-medium">
                  {t("col_name")}
                </div>
                <div className="px-4 py-3 font-medium">
                  {t("col_description")}
                </div>
                <div className="px-4 py-3 font-medium">
                  {t("col_type")}
                </div>
                <div className="px-4 py-3 font-medium">
                  {t("col_permissions")}
                </div>
                <div className="px-4 py-3 font-medium">
                  {t("col_users")}
                </div>
                <div className="px-4 py-3 font-medium">
                  {t("col_actions")}
                </div>
              </div>
              {/* 数据行 */}
              {roles.map((role) => (
                <SortableRow
                  key={role.id}
                  role={role}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        )}

        <RoleDialog
          role={editingRole}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSaved}
        />
      </div>
    </DndContext>
  )
}
