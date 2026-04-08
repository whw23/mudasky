'use client'

/**
 * 用户个人资料卡片。
 * 所有字段在同一个卡片内，点击"修改"展开内联编辑表单。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Check, X, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { PhoneInput } from '@/components/auth/PhoneInput'
import { SmsCodeButton } from '@/components/auth/SmsCodeButton'

/** 当前正在编辑的字段 */
type EditingField = null | 'username' | 'password' | 'phone' | '2fa'

/** 用户个人资料 */
export function ProfileInfo() {
  const { user, fetchUser } = useAuth()
  const t = useTranslations('Profile')
  const [editing, setEditing] = useState<EditingField>(null)
  const [loading, setLoading] = useState(false)

  /* 用户名编辑 */
  const [username, setUsername] = useState('')

  /* 修改密码 */
  const [pwdPhone, setPwdPhone] = useState('')
  const [pwdCode, setPwdCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  /* 修改手机号 */
  const [newPhone, setNewPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')

  /* 2FA */
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  if (!user) return null

  /** 开始编辑 */
  function startEdit(field: EditingField): void {
    setEditing(field)
    if (field === 'username') setUsername(user?.username ?? '')
  }

  /** 取消编辑 */
  function cancelEdit(): void {
    setEditing(null)
    setUsername('')
    setPwdPhone('')
    setPwdCode('')
    setNewPassword('')
    setConfirmPassword('')
    setNewPhone('')
    setPhoneCode('')
    if (qrUrl) URL.revokeObjectURL(qrUrl)
    setQrUrl(null)
    setTotpCode('')
  }

  /** 保存用户名 */
  async function saveUsername(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.patch('/users/me', { username: username.trim() })
      await fetchUser()
      cancelEdit()
      toast.success(t('usernameSaved'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 保存密码 */
  async function savePassword(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      await api.put('/users/me/password', {
        phone: pwdPhone,
        code: pwdCode,
        new_password: newPassword,
      })
      cancelEdit()
      toast.success(t('passwordChanged'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('changeFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 保存手机号 */
  async function savePhone(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/users/me/phone', { new_phone: newPhone, code: phoneCode })
      await fetchUser()
      cancelEdit()
      toast.success(t('phoneChanged'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('changeFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 启用 2FA — 获取二维码 */
  async function handleEnable2fa(): Promise<void> {
    setLoading(true)
    try {
      const res = await api.post('/users/me/2fa/enable', null, {
        responseType: 'blob',
      })
      setQrUrl(URL.createObjectURL(new Blob([res.data])))
      setEditing('2fa')
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('enableFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 确认 2FA TOTP */
  async function confirm2fa(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users/me/2fa/confirm', { totp_code: totpCode })
      await fetchUser()
      cancelEdit()
      toast.success(t('twoFaEnabled'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('confirmFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 禁用 2FA */
  async function handleDisable2fa(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users/me/2fa/disable', { password: disablePassword })
      await fetchUser()
      setShowDisableDialog(false)
      setDisablePassword('')
      toast.success(t('twoFaDisabled'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('disableFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 信息行组件 */
  function InfoRow({
    label,
    value,
    field,
    children,
  }: {
    label: string
    value: React.ReactNode
    field?: EditingField
    children?: React.ReactNode
  }) {
    const isEditing = editing === field
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          {field && !isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => startEdit(field)}
            >
              <Pencil className="mr-1 size-3" />
              {t('edit')}
            </Button>
          )}
          {field && isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={cancelEdit}
            >
              <X className="mr-1 size-3" />
              {t('cancel')}
            </Button>
          )}
        </div>
        {isEditing ? children : (
          <p className="text-sm text-muted-foreground">{value}</p>
        )}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 用户名 */}
          <InfoRow label={t('username')} value={user.username || t('notSet')} field="username">
            <form onSubmit={saveUsername} className="flex items-center gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('usernamePlaceholder')}
                required
                className="max-w-xs"
              />
              <Button type="submit" size="icon" variant="ghost" disabled={loading}>
                <Check className="size-4" />
              </Button>
            </form>
          </InfoRow>

          <Separator />

          {/* 手机号 */}
          <InfoRow label={t('phone')} value={user.phone || t('notSet')} field="phone">
            <form onSubmit={savePhone} className="space-y-3 max-w-md">
              <PhoneInput
                value={newPhone}
                onChange={setNewPhone}
                placeholder={t('phonePlaceholder')}
                required
              />
              <div className="flex gap-2">
                <Input
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  placeholder={t('codePlaceholder')}
                  maxLength={6}
                  required
                />
                <SmsCodeButton phone={newPhone} />
              </div>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? t('saving') : t('save')}
              </Button>
            </form>
          </InfoRow>

          <Separator />

          {/* 密码 */}
          <InfoRow label={t('changePassword')} value={t('passwordSet')} field="password">
            <form onSubmit={savePassword} className="space-y-3 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs">{t('phone')}</Label>
                <PhoneInput
                  value={pwdPhone}
                  onChange={setPwdPhone}
                  placeholder={t('phonePlaceholder')}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('smsCode')}</Label>
                <div className="flex gap-2">
                  <Input
                    value={pwdCode}
                    onChange={(e) => setPwdCode(e.target.value)}
                    placeholder={t('codePlaceholder')}
                    maxLength={6}
                    required
                  />
                  <SmsCodeButton phone={pwdPhone} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('newPassword')}</Label>
                <PasswordInput
                  id="new-pwd"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder={t('newPasswordPlaceholder')}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('confirmPassword')}</Label>
                <PasswordInput
                  id="confirm-pwd"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder={t('confirmPasswordPlaceholder')}
                  required
                />
              </div>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? t('saving') : t('save')}
              </Button>
            </form>
          </InfoRow>

          <Separator />

          {/* 二步验证 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('twoFactorAuth')}</Label>
              {!user.two_factor_enabled && editing !== '2fa' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={handleEnable2fa}
                  disabled={loading}
                >
                  {t('enableTwoFa')}
                </Button>
              )}
              {editing === '2fa' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={cancelEdit}
                >
                  <X className="mr-1 size-3" />
                  {t('cancel')}
                </Button>
              )}
            </div>
            {editing === '2fa' && qrUrl ? (
              <div className="space-y-3 max-w-sm">
                <p className="text-xs text-muted-foreground">{t('scanQrCode')}</p>
                <img src={qrUrl} alt="2FA QR Code" className="mx-auto size-48 rounded border" />
                <form onSubmit={confirm2fa} className="space-y-2">
                  <Input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder={t('totpPlaceholder')}
                    maxLength={6}
                    required
                  />
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? t('saving') : t('confirmEnable')}
                  </Button>
                </form>
              </div>
            ) : user.two_factor_enabled ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-green-600" />
                <span className="text-sm text-green-600">{t('twoFaStatusEnabled')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  {t('disableTwoFa')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ShieldOff className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('twoFaStatusDisabled')}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* 用户类型（只读） */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">{t('userType')}</Label>
            <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium">
              {user.user_type}
            </span>
          </div>

          {/* 权限组（只读） */}
          {user.group_ids.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm font-medium">{t('groups')}</Label>
                <div className="flex flex-wrap gap-1">
                  {user.group_ids.map((gid) => (
                    <span
                      key={gid}
                      className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium"
                    >
                      {gid}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 禁用 2FA 确认弹窗 */}
      <Dialog
        open={showDisableDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDisableDialog(false)
            setDisablePassword('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('disableTwoFa')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisable2fa} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('disableConfirmHint')}</p>
            <div className="space-y-2">
              <Label htmlFor="disable-pwd">{t('password')}</Label>
              <PasswordInput
                id="disable-pwd"
                value={disablePassword}
                onChange={setDisablePassword}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDisableDialog(false); setDisablePassword('') }}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? t('saving') : t('confirmDisable')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
