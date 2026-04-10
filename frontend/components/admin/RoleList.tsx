"use client"

/**
 * 角色列表组件。
 * 卡片网格展示，支持创建、编辑和删除。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardAction,
} from "@/components/ui/card"
import { RoleDialog } from "@/components/admin/RoleDialog"
import api from "@/lib/api"
import type { Role } from "@/types"

/** 角色卡片网格 */
function RoleGrid({
  roles,
  onEdit,
  onDelete,
}: {
  roles: Role[]
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
}) {
  const t = useTranslations("AdminGroups")

  if (roles.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {t("noData")}
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => {
        /* superuser（权限为 *）不可修改和删除 */
        const isSuperuser = role.permissions.some((p) => p.code === "*")
        return (
        <Card key={role.id}>
          <CardHeader>
            <CardTitle>{role.name}</CardTitle>
            <CardDescription>{role.description}</CardDescription>
            {!isSuperuser && (
            <CardAction>
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
            </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                {t("permissionCount", {
                  count: role.permissions.length,
                })}
              </span>
              <span>
                {t("userCount", { count: role.user_count })}
              </span>
            </div>
          </CardContent>
        </Card>
        )
      })}
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

  /** 获取角色列表 */
  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Role[]>("/roles")
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
      await api.delete(`/roles/${role.id}`)
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
      ) : (
        <RoleGrid
          roles={roles}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <RoleDialog
        role={editingRole}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaved}
      />
    </div>
  )
}
