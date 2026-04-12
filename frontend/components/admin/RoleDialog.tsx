"use client"

/**
 * 角色创建/编辑对话框组件。
 * 支持表单填写和基于三栏 PermissionTree 的权限勾选。
 * 使用 permission code（如 admin/users/list）作为选中状态，保存时转换为 permission ID。
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
import type { Permission, Role } from "@/types"
import { PermissionTree } from "./PermissionTree"
import { PANEL_CONFIG } from "@/lib/permission-config"

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
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  /** 获取所有权限列表 */
  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await api.get<Permission[]>("/admin/roles/permissions")
      setPermissions(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  /**
   * 将角色的通配符权限展开为 permission code 集合（使用 / 分隔符）。
   * 如 `admin.*` → 所有以 `admin/` 开头的叶子权限码。
   */
  const expandToCodeSet = useCallback(
    (rolePerms: Permission[], allPerms: Permission[]): Set<string> => {
      const codes = new Set<string>()
      /* 过滤出叶子权限（非通配符） */
      const leafPerms = allPerms.filter(
        (p) => !p.code.endsWith(".*") && p.code !== "*",
      )

      for (const rp of rolePerms) {
        if (rp.code === "*") {
          for (const lp of leafPerms) codes.add(lp.code.replaceAll(".", "/"))
        } else if (rp.code.endsWith(".*")) {
          const prefix = rp.code.slice(0, -2).replaceAll(".", "/") + "/"
          for (const lp of leafPerms) {
            const lpCode = lp.code.replaceAll(".", "/")
            if (lpCode.startsWith(prefix)) codes.add(lpCode)
          }
        } else {
          codes.add(rp.code.replaceAll(".", "/"))
        }
      }

      /* 根据已选 API 码，自动推导面板/页面可见性码 */
      for (const panel of PANEL_CONFIG) {
        let panelHasAny = false
        for (const page of panel.pages) {
          const prefix = page.apiPrefix + "/"
          const hasApiUnderPage = [...codes].some((c) => c.startsWith(prefix) || c === page.apiPrefix)
          if (hasApiUnderPage) {
            codes.add(`@${page.apiPrefix}`)
            panelHasAny = true
          }
        }
        if (panelHasAny) codes.add(`@${panel.prefix}`)
      }

      return codes
    },
    [],
  )

  /**
   * 将已选中的 permission code 集合转换为 permission ID 列表。
   * code 使用 / 分隔符，DB 中使用 . 分隔符，需转换后查找。
   * 跳过 @ 开头的可见性码（面板/页面可见性，不对应 DB 权限）。
   */
  const codesToPermissionIds = (): string[] => {
    const ids: string[] = []
    for (const code of selectedCodes) {
      if (code.startsWith("@")) continue
      const dotCode = code.replaceAll("/", ".")
      const perm = permissions.find((p) => p.code === dotCode)
      if (perm) ids.push(perm.id)
    }
    return ids
  }

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    fetchPermissions()
    if (role) {
      setName(role.name)
      setDescription(role.description)
    } else {
      setName("")
      setDescription("")
      setSelectedCodes(new Set())
    }
  }, [open, role, fetchPermissions])

  /** 权限列表加载后，展开角色的通配符权限为 code 集合 */
  useEffect(() => {
    if (!open || !role || permissions.length === 0) return
    setSelectedCodes(expandToCodeSet(role.permissions, permissions))
  }, [open, role, permissions, expandToCodeSet])

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
        permission_ids: codesToPermissionIds(),
      }
      if (isEdit) {
        await api.post(`/admin/roles/edit/${role.id}`, payload)
      } else {
        await api.post("/admin/roles/create", payload)
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

          {/* 三栏权限选择器 */}
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
