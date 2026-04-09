"use client"

/**
 * 权限组列表组件。
 * 分系统角色和自定义角色两个 tab 展示，支持创建、编辑和删除。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card, CardHeader, CardTitle, CardDescription,
  CardContent, CardAction,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GroupDialog } from "@/components/admin/GroupDialog"
import api from "@/lib/api"
import type { PermissionGroup } from "@/types"

/** 权限组卡片网格 */
function GroupGrid({
  groups,
  isSystem,
  onEdit,
  onDelete,
}: {
  groups: PermissionGroup[]
  isSystem: boolean
  onEdit: (group: PermissionGroup) => void
  onDelete: (group: PermissionGroup) => void
}) {
  const t = useTranslations("AdminGroups")

  if (groups.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        {t("noData")}
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{group.name}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
            <CardAction>
              <div className="flex gap-1">
                {isSystem ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(group)}
                  >
                    {t("viewPermissions")}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(group)}
                    >
                      {t("edit")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(group)}
                    >
                      {t("delete")}
                    </Button>
                  </>
                )}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>
                {t("permissionCount", {
                  count: group.permissions.length,
                })}
              </span>
              <span>
                {t("userCount", { count: group.user_count })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** 权限组列表 */
export function GroupList() {
  const t = useTranslations("AdminGroups")

  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<
    PermissionGroup | null
  >(null)
  const [viewOnly, setViewOnly] = useState(false)

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
    setViewOnly(false)
    setDialogOpen(true)
  }

  /** 打开编辑/查看对话框 */
  const handleEdit = (group: PermissionGroup, readonly: boolean) => {
    setEditingGroup(group)
    setViewOnly(readonly)
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

  const systemGroups = groups.filter((g) => g.is_system)
  const customGroups = groups.filter((g) => !g.is_system)

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("loading")}
        </p>
      ) : (
        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system">
              {t("systemRoles")}
            </TabsTrigger>
            <TabsTrigger value="custom">
              {t("customRoles")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <GroupGrid
              groups={systemGroups}
              isSystem
              onEdit={(g) => handleEdit(g, true)}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="custom">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleCreate}>
                  {t("createGroup")}
                </Button>
              </div>
              <GroupGrid
                groups={customGroups}
                isSystem={false}
                onEdit={(g) => handleEdit(g, false)}
                onDelete={handleDelete}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <GroupDialog
        group={editingGroup}
        open={dialogOpen}
        viewOnly={viewOnly}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaved}
      />
    </div>
  )
}
