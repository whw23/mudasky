"use client"

/**
 * 权限组创建/编辑/查看对话框组件。
 * 支持表单填写和按分类的树形权限勾选。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { Permission, PermissionCategory, PermissionGroup } from "@/types"

interface GroupDialogProps {
  group: PermissionGroup | null
  open: boolean
  viewOnly?: boolean
  onClose: () => void
  onSave: () => void
}

/** 权限组创建/编辑/查看对话框 */
export function GroupDialog({
  group,
  open,
  viewOnly = false,
  onClose,
  onSave,
}: GroupDialogProps) {
  const t = useTranslations("AdminGroups")
  const tc = useTranslations("PermissionCategories")
  const isEdit = !!group

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [categories, setCategories] = useState<PermissionCategory[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  /** 获取所有权限列表 */
  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await api.get<Permission[]>("/permissions")
      setPermissions(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  /** 获取权限分类列表 */
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get<PermissionCategory[]>(
        "/permissions/categories"
      )
      setCategories(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    fetchPermissions()
    fetchCategories()
    if (group) {
      setName(group.name)
      setDescription(group.description)
      setSelectedIds(new Set(group.permissions.map((p) => p.id)))
    } else {
      setName("")
      setDescription("")
      setSelectedIds(new Set())
    }
  }, [open, group, fetchPermissions, fetchCategories])

  /** 根据 code 找到对应的 permission id */
  const codeToId = useCallback(
    (code: string): string | undefined =>
      permissions.find((p) => p.code === code)?.id,
    [permissions]
  )

  /** 切换单个权限选中状态 */
  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  /** 切换某分类下所有权限 */
  const toggleCategory = (cat: PermissionCategory) => {
    const childIds = cat.permissions
      .map(codeToId)
      .filter((id): id is string => !!id)
    const allChecked = childIds.every((id) => selectedIds.has(id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of childIds) {
        if (allChecked) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
  }

  /** 保存权限组 */
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    setSaving(true)
    try {
      const permissionIds = Array.from(selectedIds)
      if (isEdit) {
        await api.patch(`/groups/${group.id}`, {
          name,
          description,
          permission_ids: permissionIds,
        })
      } else {
        await api.post("/groups", {
          name,
          description,
          permission_ids: permissionIds,
        })
      }
      toast.success(t(isEdit ? "updateSuccess" : "createSuccess"))
      onSave()
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  const isAutoAll = group?.auto_include_all ?? false
  const isReadonly = viewOnly || (isEdit && (group?.is_system ?? false))

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {viewOnly
              ? t("viewPermissions")
              : t(isEdit ? "editTitle" : "createTitle")}
          </DialogTitle>
          <DialogDescription>
            {viewOnly
              ? group?.name ?? ""
              : t(isEdit ? "editDesc" : "createDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 名称 */}
          {!viewOnly && (
            <div className="space-y-1">
              <Label>{t("name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={isReadonly}
                placeholder={t("namePlaceholder")}
              />
            </div>
          )}

          {/* 描述 */}
          {!viewOnly && (
            <div className="space-y-1">
              <Label>{t("description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
          )}

          {/* 权限树 */}
          <div className="space-y-2">
            <Label>{t("permissions")}</Label>
            {isAutoAll ? (
              <p className="text-sm text-muted-foreground">
                {t("allPermissionsIncluded")}
              </p>
            ) : (
              <PermissionTree
                categories={categories}
                permissions={permissions}
                selectedIds={selectedIds}
                disabled={isReadonly}
                codeToId={codeToId}
                onTogglePermission={togglePermission}
                onToggleCategory={toggleCategory}
                tc={tc}
              />
            )}
          </div>

          {/* 操作按钮 */}
          {!viewOnly && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button disabled={saving} onClick={handleSave}>
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 树形权限选择器 */
function PermissionTree({
  categories,
  permissions,
  selectedIds,
  disabled,
  codeToId,
  onTogglePermission,
  onToggleCategory,
  tc,
}: {
  categories: PermissionCategory[]
  permissions: Permission[]
  selectedIds: Set<string>
  disabled: boolean
  codeToId: (code: string) => string | undefined
  onTogglePermission: (id: string) => void
  onToggleCategory: (cat: PermissionCategory) => void
  tc: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const childIds = cat.permissions
          .map(codeToId)
          .filter((id): id is string => !!id)
        const checkedCount = childIds.filter((id) =>
          selectedIds.has(id)
        ).length
        const allChecked =
          childIds.length > 0 && checkedCount === childIds.length
        const someChecked = checkedCount > 0 && !allChecked

        return (
          <div key={cat.key}>
            {/* 父节点 */}
            <label className="flex items-center gap-2 font-medium">
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked}
                disabled={disabled}
                onCheckedChange={() => onToggleCategory(cat)}
              />
              {tc(cat.key)}
            </label>
            {/* 子节点 */}
            <div className="ml-6 mt-1 space-y-1">
              {cat.permissions.map((permCode) => {
                const perm = permissions.find(
                  (p) => p.code === permCode
                )
                if (!perm) return null
                return (
                  <label
                    key={perm.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedIds.has(perm.id)}
                      disabled={disabled}
                      onCheckedChange={() =>
                        onTogglePermission(perm.id)
                      }
                    />
                    <div>
                      <span className="font-mono text-xs">
                        {perm.code}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {perm.description}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
