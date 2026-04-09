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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { usePermissions } from "@/hooks/use-permissions"
import api from "@/lib/api"
import { encryptPassword } from "@/lib/crypto"
import type { User, PermissionGroup } from "@/types"

interface UserDrawerProps {
  userId: string | null
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

/** 用户详情与操作抽屉 */
export function UserDrawer({ userId, open, onClose, onUpdate }: UserDrawerProps) {
  const t = useTranslations("AdminUsers")
  const { hasPermission, hasAnyPermission } = usePermissions()

  const [user, setUser] = useState<User | null>(null)
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [storageQuota, setStorageQuota] = useState<number>(0)
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [newUserType, setNewUserType] = useState("")
  const [saving, setSaving] = useState(false)

  const canManageMember = hasPermission("member:manage")
  const canManageStaff = hasPermission("staff:manage")
  const canChangeType = canManageMember && canManageStaff

  /** 加载用户详情 */
  const fetchUser = useCallback(async () => {
    if (!userId) return
    try {
      const { data } = await api.get<User>(`/admin/users/${userId}`)
      setUser(data)
      setSelectedGroupId(data.group_id || "")
      setStorageQuota(data.storage_quota)
      setNewUserType(data.user_type)
    } catch {
      toast.error(t("fetchError"))
    }
  }, [userId, t])

  /** 加载权限组列表 */
  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get<PermissionGroup[]>("/groups")
      setGroups(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    if (open && userId) {
      fetchUser()
      fetchGroups()
      setPassword("")
      setPasswordConfirm("")
    }
  }, [open, userId, fetchUser, fetchGroups])

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
      () => api.patch(`/admin/users/${userId}`, { is_active: !user.is_active }),
      t("toggleActiveSuccess"),
    )
  }

  /** 保存分组 */
  const handleSaveGroup = () => {
    runAction(
      () => api.put(`/admin/users/${userId}/groups`, { group_id: selectedGroupId || null }),
      t("saveGroupsSuccess"),
    )
  }

  /** 保存存储配额 */
  const handleSaveQuota = () => {
    runAction(
      () => api.patch(`/admin/users/${userId}`, { storage_quota: storageQuota }),
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
      () => api.put(`/admin/users/${userId}/password`, {
        encrypted_password: encrypted.encrypted_password,
        nonce: encrypted.nonce,
      }),
      t("resetPasswordSuccess"),
    )
  }

  /** 修改用户类型 */
  const handleChangeType = () => {
    if (!newUserType || newUserType === user?.user_type) return
    runAction(
      () => api.patch(`/admin/users/${userId}/type`, { user_type: newUserType }),
      t("changeTypeSuccess"),
    )
  }

  /** 强制登出 */
  const handleForceLogout = () => {
    if (!confirm(t("forceLogoutConfirm"))) return
    runAction(
      () => api.delete(`/admin/users/${userId}/tokens`),
      t("forceLogoutSuccess"),
    )
  }

  /** 格式化日期 */
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("userDetail")}</DialogTitle>
          <DialogDescription>{t("userDetailDesc")}</DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-5">
            {/* 基本信息 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("basicInfo")}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">{t("col_username")}</span>
                <span>{user.username ?? "-"}</span>
                <span className="text-muted-foreground">{t("col_phone")}</span>
                <span>{user.phone ?? "-"}</span>
                <span className="text-muted-foreground">{t("col_type")}</span>
                <span>{t(`type_${user.user_type}`)}</span>
                <span className="text-muted-foreground">{t("col_status")}</span>
                <span>{t(user.is_active ? "status_active" : "status_inactive")}</span>
                <span className="text-muted-foreground">{t("col_createdAt")}</span>
                <span>{formatDate(user.created_at)}</span>
              </div>
            </section>

            <Separator />

            {/* 切换激活状态 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("toggleActive")}</h3>
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

            {/* 分组分配 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("assignGroups")}</h3>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("noGroup")}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <Button size="sm" disabled={saving} onClick={handleSaveGroup}>
                {t("saveGroups")}
              </Button>
            </section>

            <Separator />

            {/* 存储配额 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("storageQuota")}</h3>
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
              <h3 className="text-sm font-medium">{t("resetPassword")}</h3>
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

            {/* 修改用户类型 */}
            {canChangeType && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">{t("changeType")}</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={newUserType}
                      onChange={(e) => setNewUserType(e.target.value)}
                      className="rounded-md border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="guest">{t("type_guest")}</option>
                      <option value="member">{t("type_member")}</option>
                      <option value="staff">{t("type_staff")}</option>
                    </select>
                    <Button size="sm" disabled={saving} onClick={handleChangeType}>
                      {t("save")}
                    </Button>
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* 强制登出 */}
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t("forceLogout")}</h3>
              <Button
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={handleForceLogout}
              >
                {t("forceLogout")}
              </Button>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
