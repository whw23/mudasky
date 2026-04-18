"use client"

/**
 * 角色创建/编辑对话框组件。
 * 支持表单填写和基于树形 PermissionTree 的权限勾选。
 * 权限为字符串路径列表，直接保存为 JSON 数组。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogBody,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { Role } from "@/types"
import { PermissionTree, collectAllLeaves } from "./PermissionTree"

interface RoleDialogProps {
  role: Role | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 角色创建/编辑对话框 */
export function RoleDialog({
  role,
  open,
  onClose,
  onSave,
}: RoleDialogProps) {
  const t = useTranslations("AdminGroups")
  const isEdit = !!role

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  /**
   * 将角色的通配符权限展开为 PermissionTree 使用的 code 集合。
   * 从 permission_tree API 获取所有叶子路径，匹配通配符。
   */
  const expandToCodeSet = useCallback(
    async (rolePerms: string[]): Promise<Set<string>> => {
      const codes = new Set<string>()
      let leafCodes: string[] = []
      try {
        const { data } = await api.get<{ permission_tree: Record<string, unknown> }>("/admin/roles/meta")
        leafCodes = collectAllLeaves(data.permission_tree as Parameters<typeof collectAllLeaves>[0])
      } catch {
        return codes
      }

      for (const perm of rolePerms) {
        if (perm === "*") {
          for (const lc of leafCodes) codes.add(lc)
        } else if (perm.endsWith("/*")) {
          const prefix = perm.slice(0, -1)
          for (const lc of leafCodes) {
            if (lc.startsWith(prefix)) codes.add(lc)
          }
        } else {
          codes.add(perm)
        }
      }
      return codes
    },
    [],
  )

  /** 将已选中的 code 集合转换为权限路径列表。 */
  const codesToPermissions = (): string[] => {
    return [...selectedCodes]
  }

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    if (role) {
      setName(role.name)
      setDescription(role.description)
      expandToCodeSet(role.permissions).then(setSelectedCodes)
    } else {
      setName("")
      setDescription("")
      setSelectedCodes(new Set())
    }
  }, [open, role, expandToCodeSet])

  /** 保存角色 */
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        permissions: codesToPermissions(),
      }
      if (isEdit) {
        await api.post("/admin/roles/meta/list/detail/edit", { role_id: role.id, ...payload })
      } else {
        await api.post("/admin/roles/meta/list/create", payload)
      }
      toast.success(t(isEdit ? "updateSuccess" : "createSuccess"))
      onSave()
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {t(isEdit ? "editTitle" : "createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(isEdit ? "editDesc" : "createDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 overflow-y-auto max-h-[70vh]">
          {/* 名称 + 描述 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("description")}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
          </div>

          {/* 树形权限选择器 */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("permissions")}</Label>
            <PermissionTree
              selectedCodes={selectedCodes}
              onSelectionChange={setSelectedCodes}
            />
          </div>
        </DialogBody>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
