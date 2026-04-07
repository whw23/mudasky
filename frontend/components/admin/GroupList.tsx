"use client"

/**
 * 权限组列表组件。
 * 以卡片布局展示权限组，支持创建、编辑和删除。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card"
import { GroupDialog } from "@/components/admin/GroupDialog"
import api from "@/lib/api"
import type { PermissionGroup } from "@/types"

/** 权限组列表 */
export function GroupList() {
  const t = useTranslations("AdminGroups")

  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null)

  /** 获取权限组列表 */
  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<PermissionGroup[]>("/groups")
      setGroups(data)
    } catch {
      toast.error(t("fetchError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  /** 打开创建对话框 */
  const handleCreate = () => {
    setEditingGroup(null)
    setDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (group: PermissionGroup) => {
    setEditingGroup(group)
    setDialogOpen(true)
  }

  /** 删除权限组 */
  const handleDelete = async (group: PermissionGroup) => {
    if (!confirm(t("deleteConfirm", { name: group.name }))) return
    try {
      await api.delete(`/groups/${group.id}`)
      toast.success(t("deleteSuccess"))
      fetchGroups()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 对话框保存后刷新列表 */
  const handleSaved = () => {
    setDialogOpen(false)
    fetchGroups()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>{t("createGroup")}</Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">{t("loading")}</p>
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.name}
                  {group.is_system && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {t("systemBadge")}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{group.description}</CardDescription>
                <CardAction>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(group)}>
                      {t("edit")}
                    </Button>
                    {!group.is_system && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(group)}>
                        {t("delete")}
                      </Button>
                    )}
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{t("permissionCount", { count: group.permissions.length })}</span>
                  <span>{t("userCount", { count: group.user_count })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupDialog
        group={editingGroup}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaved}
      />
    </div>
  )
}
