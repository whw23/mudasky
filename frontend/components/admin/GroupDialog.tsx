"use client"

/**
 * 权限组创建/编辑对话框组件。
 * 支持表单填写和权限勾选。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { Permission, PermissionGroup } from "@/types"

interface GroupDialogProps {
  group: PermissionGroup | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 权限组创建/编辑对话框 */
export function GroupDialog({ group, open, onClose, onSave }: GroupDialogProps) {
  const t = useTranslations("AdminGroups")
  const isEdit = !!group

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Permission[]>([])
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

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    fetchPermissions()
    if (group) {
      setName(group.name)
      setDescription(group.description)
      setSelectedIds(new Set(group.permissions.map((p) => p.id)))
    } else {
      setName("")
      setDescription("")
      setSelectedIds(new Set())
    }
  }, [open, group, fetchPermissions])

  /** 切换权限选中状态 */
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
  const isSystem = group?.is_system ?? false

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "editTitle" : "createTitle")}</DialogTitle>
          <DialogDescription>{t(isEdit ? "editDesc" : "createDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 名称 */}
          <div className="space-y-1">
            <Label>{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={isSystem}
              placeholder={t("namePlaceholder")}
            />
          </div>

          {/* 描述 */}
          <div className="space-y-1">
            <Label>{t("description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          {/* 权限列表 */}
          <div className="space-y-2">
            <Label>{t("permissions")}</Label>
            {isAutoAll && (
              <p className="text-xs text-muted-foreground">{t("autoIncludeAllHint")}</p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {permissions.map((perm) => (
                <label key={perm.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={isAutoAll || selectedIds.has(perm.id)}
                    disabled={isAutoAll}
                    onCheckedChange={() => togglePermission(perm.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-mono text-xs">{perm.code}</span>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
