"use client"

/**
 * 角色创建/编辑对话框组件。
 * 支持表单填写和基于三栏 PermissionTree 的权限勾选。
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
import { PermissionTree } from "./PermissionTree"
import { PANEL_CONFIG } from "@/lib/permission-config"
import { fetchOpenApiSpec, parseRoutes, filterRoutesByPrefix } from "@/lib/openapi"

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
   * 如 `admin/users/*` → 所有以 `admin/users/` 开头的路由码。
   */
  const expandToCodeSet = useCallback(
    async (rolePerms: string[]): Promise<Set<string>> => {
      const codes = new Set<string>()
      let allRoutes: { path: string }[] = []
      try {
        const spec = await fetchOpenApiSpec()
        allRoutes = parseRoutes(spec)
      } catch {
        return codes
      }

      const leafCodes = allRoutes.map((r) =>
        r.path.startsWith("/") ? r.path.slice(1) : r.path,
      )

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

      /* 根据已选 API 码，自动推导面板/页面可见性码 */
      for (const panel of PANEL_CONFIG) {
        let panelHasAny = false
        for (const page of panel.pages) {
          const prefix = page.apiPrefix + "/"
          const hasApiUnderPage = [...codes].some(
            (c) => c.startsWith(prefix) || c === page.apiPrefix,
          )
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
   * 将已选中的 code 集合转换为权限路径列表。
   * 跳过 @ 开头的可见性码（面板/页面可见性，不存入数据库）。
   */
  const codesToPermissions = (): string[] => {
    const perms: string[] = []
    for (const code of selectedCodes) {
      if (code.startsWith("@")) continue
      perms.push(code)
    }
    return perms
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
