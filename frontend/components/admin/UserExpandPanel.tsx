"use client"

/**
 * 用户详情行内展开面板。
 * 在用户表格中展开显示，提供状态切换、角色分配、密码重置、删除等操作。
 */

import { useEffect, useState, useCallback, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import api from "@/lib/api"
import { encryptPassword } from "@/lib/crypto"
import { getApiError } from "@/lib/api-error"
import { PasswordInput } from "@/components/auth/PasswordInput"
import type { User, Role } from "@/types"

interface UserExpandPanelProps {
  userId: string
  onUpdate: () => void
}

/** 用户详情行内展开面板 */
export function UserExpandPanel({ userId, onUpdate }: UserExpandPanelProps) {
  const t = useTranslations("AdminUsers")
  const tErr = useTranslations("ApiErrors")

  const [user, setUser] = useState<User | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [storageQuota, setStorageQuota] = useState(0)
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  /** 加载用户详情 */
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>("/admin/users/list/detail", { params: { user_id: userId } })
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
      const { data } = await api.get<Role[]>("/admin/roles/meta/list")
      setRoles(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  useEffect(() => {
    fetchUser()
    fetchRoles()
  }, [fetchUser, fetchRoles])

  /** 通用操作包装 */
  async function runAction(action: () => Promise<void>, successMsg: string): Promise<void> {
    setSaving(true)
    try {
      await action()
      toast.success(successMsg)
      onUpdate()
    } catch (err) {
      toast.error(getApiError(err, tErr, t("operationError")))
    } finally {
      setSaving(false)
    }
  }

  /** 切换激活状态 */
  function handleToggleActive(): void {
    if (!user) return
    runAction(
      () => api.post("/admin/users/list/detail/edit", { user_id: userId, is_active: !user.is_active }),
      t("toggleActiveSuccess"),
    )
  }

  /** 保存角色 */
  function handleSaveRole(): void {
    runAction(
      () => api.post("/admin/users/list/detail/assign-role", { user_id: userId, role_id: selectedRoleId || null }),
      t("saveGroupsSuccess"),
    )
  }

  /** 保存存储配额 */
  function handleSaveQuota(): void {
    runAction(
      () => api.post("/admin/users/list/detail/edit", { user_id: userId, storage_quota: storageQuota }),
      t("saveQuotaSuccess"),
    )
  }

  /** 重置密码 */
  async function handleResetPassword(): Promise<void> {
    if (!password || password !== passwordConfirm) {
      toast.error(t("passwordMismatch"))
      return
    }
    const encrypted = await encryptPassword(password)
    runAction(
      () => api.post("/admin/users/list/detail/reset-password", {
        user_id: userId,
        encrypted_password: encrypted.encrypted_password,
        nonce: encrypted.nonce,
      }),
      t("resetPasswordSuccess"),
    )
  }

  /** 强制登出 */
  function handleForceLogout(): void {
    runAction(
      () => api.post("/admin/users/list/detail/force-logout", { user_id: userId }),
      t("forceLogoutSuccess"),
    )
  }

  /** 删除用户 */
  async function handleDeleteUser(): Promise<void> {
    setSaving(true)
    try {
      await api.post("/admin/users/list/detail/delete", { user_id: userId })
      toast.success(t("deleteUserSuccess"))
      setShowDeleteDialog(false)
      onUpdate()
    } catch (err) {
      toast.error(getApiError(err, tErr, t("operationError")))
    } finally {
      setSaving(false)
    }
  }

  /** 格式化日期 */
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString()
  }

  const isSuperuser = user?.role_name === "superuser"

  if (!user) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* 基本信息 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("basicInfo")}</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("col_username")}</span>
            <span>{user.username ?? "-"}</span>
            <span className="text-muted-foreground">{t("col_phone")}</span>
            <span>{user.phone ?? "-"}</span>
            <span className="text-muted-foreground">{t("col_status")}</span>
            <span>{t(user.is_active ? "status_active" : "status_inactive")}</span>
            <span className="text-muted-foreground">{t("col_createdAt")}</span>
            <span>{formatDate(user.created_at)}</span>
          </div>
          <Button
            variant={user.is_active ? "destructive" : "default"}
            size="sm"
            disabled={saving}
            onClick={handleToggleActive}
          >
            {t(user.is_active ? "deactivate" : "activate")}
          </Button>
        </section>

        {/* 角色分配 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("assignGroups")}</h3>
          <Select value={selectedRoleId} onValueChange={(v) => setSelectedRoleId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("noGroup")}>
                {(value: string | null) => {
                  if (!value) return t("noGroup")
                  const role = roles.find((r) => r.id === value)
                  return role?.name ?? t("noGroup")
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("noGroup")}</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={saving} onClick={handleSaveRole}>
            {t("saveGroups")}
          </Button>
        </section>

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

        {/* 重置密码 */}
        <section className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("resetPassword")}</h3>
          <div className="space-y-2">
            <div>
              <Label>{t("newPassword")}</Label>
              <PasswordInput
                id={`reset-pwd-${userId}`}
                value={password}
                onChange={setPassword}
              />
            </div>
            <div>
              <Label>{t("confirmPassword")}</Label>
              <PasswordInput
                id={`reset-pwd-confirm-${userId}`}
                value={passwordConfirm}
                onChange={setPasswordConfirm}
              />
            </div>
            <Button size="sm" disabled={saving} onClick={handleResetPassword}>
              {t("resetPassword")}
            </Button>
          </div>
        </section>

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

        {/* 删除用户 */}
        {!isSuperuser && (
          <section className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{t("deleteUser")}</h3>
            <p className="text-xs text-muted-foreground">{t("deleteUserHint")}</p>
            <Button
              variant="destructive"
              size="sm"
              disabled={saving}
              onClick={() => setShowDeleteDialog(true)}
            >
              {t("deleteUser")}
            </Button>
          </section>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteUserConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteUserConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {t("confirmDeleteUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
