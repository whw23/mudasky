"use client"

/**
 * 用户详情抽屉组件。
 * 展示用户信息，提供状态切换、分组分配、密码重置等操作。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import { encryptPassword } from "@/lib/crypto"
import type { User, Role } from "@/types"

interface UserDrawerProps {
  userId: string | null
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

/** 用户详情与操作抽屉 */
export function UserDrawer({ userId, open, onClose, onUpdate }: UserDrawerProps) {
  const t = useTranslations("AdminUsers")

  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [storageQuota, setStorageQuota] = useState<number>(0)
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  /** 加载用户详情 */
  const fetchUser = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await api.get<User>(`/admin/users/detail/${userId}`)
      setUser(data)
      setSelectedRoleId(data.role_id || "")
      setStorageQuota(data.storage_quota)
    } catch {
      toast.error(t("fetchError"))
    }
  }, [userId, t])

  /** 加载角色列表 */
  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await api.get<Role[]>("/admin/roles/list")
      setRoles(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    if (open && userId) {
      fetchUser()
      fetchRoles()
      setPassword("")
      setPasswordConfirm("")
    }
  }, [open, userId, fetchUser, fetchRoles])

  /** 通用操作包装 */
  const runAction = async (action: () => Promise<void>, successMsg: string) => {
    setSaving(true)
    try {
      await action()
      toast.success(successMsg)
      onUpdate()
    } catch {
      toast.error(t("operationError"))
    } finally {
      setSaving(false)
    }
  }

  /** 切换激活状态 */
  const handleToggleActive = () => {
    if (!user) return
    runAction(
      () => api.post(`/admin/users/edit/${userId}`, { is_active: !user.is_active }),
      t("toggleActiveSuccess"),
    )
  }

  /** 保存角色 */
  const handleSaveRole = () => {
    runAction(
      () => api.post(`/admin/users/assign-role/${userId}`, { role_id: selectedRoleId || null }),
      t("saveGroupsSuccess"),
    )
  }

  /** 保存存储配额 */
  const handleSaveQuota = () => {
    runAction(
      () => api.post(`/admin/users/edit/${userId}`, { storage_quota: storageQuota }),
      t("saveQuotaSuccess"),
    )
  }

  /** 重置密码 */
  const handleResetPassword = async () => {
    if (!password || password !== passwordConfirm) {
      toast.error(t("passwordMismatch"))
      return
    }
    const encrypted = await encryptPassword(password)
    runAction(
      () => api.post(`/admin/users/reset-password/${userId}`, {
        encrypted_password: encrypted.encrypted_password,
        nonce: encrypted.nonce,
      }),
      t("resetPasswordSuccess"),
    )
  }

  /** 强制登出 */
  const handleForceLogout = () => {
    if (!confirm(t("forceLogoutConfirm"))) return
    runAction(
      () => api.post(`/admin/users/force-logout/${userId}`),
      t("forceLogoutSuccess"),
    )
  }

  /** 格式化日期 */
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("userDetail")}</DialogTitle>
          <DialogDescription>{t("userDetailDesc")}</DialogDescription>
        </DialogHeader>

        {user && (
          <DialogBody className="space-y-5 overflow-y-auto max-h-[60vh]">
            {/* 基本信息 */}
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("basicInfo")}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">{t("col_username")}</span>
                <span>{user.username ?? "-"}</span>
                <span className="text-muted-foreground">{t("col_phone")}</span>
                <span>{user.phone ?? "-"}</span>
                <span className="text-muted-foreground">{t("col_status")}</span>
                <span>{t(user.is_active ? "status_active" : "status_inactive")}</span>
                <span className="text-muted-foreground">{t("col_createdAt")}</span>
                <span>{formatDate(user.created_at)}</span>
              </div>
            </section>

            <Separator />

            {/* 切换激活状态 */}
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("toggleActive")}</h3>
              <Button
                variant={user.is_active ? "destructive" : "default"}
                size="sm"
                disabled={saving}
                onClick={handleToggleActive}
              >
                {t(user.is_active ? "deactivate" : "activate")}
              </Button>
            </section>

            <Separator />

            {/* 角色分配 */}
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("assignGroups")}</h3>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">{t("noGroup")}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={saving} onClick={handleSaveRole}>
                {t("saveGroups")}
              </Button>
            </section>

            <Separator />

            {/* 存储配额 */}
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("storageQuota")}</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={storageQuota}
                  onChange={(e) => setStorageQuota(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">MB</span>
                <Button size="sm" disabled={saving} onClick={handleSaveQuota}>
                  {t("save")}
                </Button>
              </div>
            </section>

            <Separator />

            {/* 重置密码 */}
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("resetPassword")}</h3>
              <div className="space-y-2">
                <div>
                  <Label>{t("newPassword")}</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("confirmPassword")}</Label>
                  <Input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                </div>
                <Button size="sm" disabled={saving} onClick={handleResetPassword}>
                  {t("resetPassword")}
                </Button>
              </div>
            </section>

            <Separator />

            {/* 强制登出 */}
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("forceLogout")}</h3>
              <Button
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={handleForceLogout}
              >
                {t("forceLogout")}
              </Button>
            </section>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
