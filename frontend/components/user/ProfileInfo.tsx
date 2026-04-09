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

/** 信息行组件 */
function InfoRow({
  label,
  value,
  field,
  editing,
  onEdit,
  onCancel,
  editLabel,
  cancelLabel,
  children,
}: {
  label: string
  value: React.ReactNode
  field?: EditingField
  editing: EditingField
  onEdit: (field: EditingField) => void
  onCancel: () => void
  editLabel: string
  cancelLabel: string
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
            onClick={() => onEdit(field)}
          >
            <Pencil className="mr-1 size-3" />
            {editLabel}
          </Button>
        )}
        {field && isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={onCancel}
          >
            <X className="mr-1 size-3" />
            {cancelLabel}
          </Button>
        )}
      </div>
      {isEditing ? children : (
        <p className="text-sm text-muted-foreground">{value}</p>
      )}
    </div>
  )
}

/** 用户个人资料 */
export function ProfileInfo() {
  const { user, fetchUser } = useAuth()
  const t = useTranslations('Profile')
  const [editing, setEditing] = useState<EditingField>(null)
  const [loading, setLoading] = useState(false)

  /* 用户名编辑 */
  const [username, setUsername] = useState('')

  /* 修改密码 */
  const [pwdCode, setPwdCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  /* 修改手机号 */
  const [newPhone, setNewPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')

  /* 2FA */
  const [twoFaMode, setTwoFaMode] = useState<'totp' | 'sms' | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [sms2faCode, setSms2faCode] = useState('')
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disableCode, setDisableCode] = useState('')

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
    setPwdCode('')
    setNewPassword('')
    setConfirmPassword('')
    setNewPhone('')
    setPhoneCode('')
    setTwoFaMode(null)
    if (qrUrl) URL.revokeObjectURL(qrUrl)
    setQrUrl(null)
    setTotpCode('')
    setSms2faCode('')
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
        phone: user!.phone,
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

  /** 选择 TOTP 方式启用 2FA */
  async function handleEnableTotp(): Promise<void> {
    setLoading(true)
    try {
      const res = await api.post('/users/me/2fa/enable-totp', null, {
        responseType: 'blob',
      })
      setQrUrl(URL.createObjectURL(new Blob([res.data])))
      setTwoFaMode('totp')
      setEditing('2fa')
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('enableFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 选择 SMS 方式启用 2FA */
  function handleEnableSms(): void {
    setTwoFaMode('sms')
    setEditing('2fa')
  }

  /** 确认 TOTP 启用 */
  async function confirmTotp(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users/me/2fa/confirm-totp', { totp_code: totpCode })
      await fetchUser()
      cancelEdit()
      toast.success(t('twoFaEnabled'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('confirmFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 确认 SMS 启用 */
  async function confirmSms(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/users/me/2fa/enable-sms', { phone: user!.phone, code: sms2faCode })
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
      await api.post('/users/me/2fa/disable', { phone: user!.phone, code: disableCode })
      await fetchUser()
      setShowDisableDialog(false)
      setDisableCode('')
      toast.success(t('twoFaDisabled'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('disableFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 用户名 */}
          <InfoRow label={t('username')} value={user.username || t('notSet')} field="username" editing={editing} onEdit={startEdit} onCancel={cancelEdit} editLabel={t('edit')} cancelLabel={t('cancel')}>
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
          <InfoRow label={t('phone')} value={user.phone || t('notSet')} field="phone" editing={editing} onEdit={startEdit} onCancel={cancelEdit} editLabel={t('edit')} cancelLabel={t('cancel')}>
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
          <InfoRow label={t('changePassword')} value={t('passwordSet')} field={user.phone ? 'password' : undefined} editing={editing} onEdit={startEdit} onCancel={cancelEdit} editLabel={t('edit')} cancelLabel={t('cancel')}>
            <form onSubmit={savePassword} className="space-y-3 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs">{t('smsCode')}</Label>
                <p className="text-xs text-muted-foreground">{t('smsCodeSentTo', { phone: user.phone })}</p>
                <div className="flex gap-2">
                  <Input
                    value={pwdCode}
                    onChange={(e) => setPwdCode(e.target.value)}
                    placeholder={t('codePlaceholder')}
                    maxLength={6}
                    required
                  />
                  <SmsCodeButton phone={user.phone!} />
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
            {user.two_factor_enabled ? (
              /* 已启用 — 显示当前方式和禁用按钮 */
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-green-600" />
                <span className="text-sm text-green-600">
                  {t('twoFaStatusEnabled')}（{user.two_factor_method === 'totp' ? t('methodTotp') : t('methodSms')}）
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  {t('disableTwoFa')}
                </Button>
              </div>
            ) : editing === '2fa' ? (
              /* 启用流程 */
              <div className="space-y-3 max-w-md">
                {twoFaMode === null && (
                  /* 选择方式 */
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleEnableTotp} disabled={loading}>
                      {t('methodTotp')}
                    </Button>
                    {user.phone && (
                      <Button size="sm" variant="outline" onClick={handleEnableSms}>
                        {t('methodSms')}
                      </Button>
                    )}
                  </div>
                )}
                {twoFaMode === 'totp' && qrUrl && (
                  /* TOTP 扫码确认 */
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">{t('scanQrCode')}</p>
                    <img src={qrUrl} alt="2FA QR Code" className="mx-auto size-48 rounded border" />
                    <form onSubmit={confirmTotp} className="space-y-2">
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
                )}
                {twoFaMode === 'sms' && (
                  /* 短信验证确认 */
                  <form onSubmit={confirmSms} className="space-y-3">
                    <p className="text-xs text-muted-foreground">{t('smsCodeSentTo', { phone: user.phone })}</p>
                    <div className="flex gap-2">
                      <Input
                        value={sms2faCode}
                        onChange={(e) => setSms2faCode(e.target.value)}
                        placeholder={t('codePlaceholder')}
                        maxLength={6}
                        required
                      />
                      <SmsCodeButton phone={user.phone!} />
                    </div>
                    <Button type="submit" size="sm" disabled={loading}>
                      {loading ? t('saving') : t('confirmEnable')}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              /* 未启用 — 显示启用按钮 */
              <div className="flex items-center gap-2">
                <ShieldOff className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('twoFaStatusDisabled')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditing('2fa')}
                >
                  {t('enableTwoFa')}
                </Button>
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
          {user.group_name && (
            <>
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm font-medium">{t('groups')}</Label>
                <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium">
                  {user.group_name}
                </span>
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
            setDisableCode('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('disableTwoFa')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisable2fa} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('smsCodeSentTo', { phone: user.phone })}</p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder={t('codePlaceholder')}
                  maxLength={6}
                  required
                />
                <SmsCodeButton phone={user.phone!} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDisableDialog(false); setDisableCode('') }}
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
