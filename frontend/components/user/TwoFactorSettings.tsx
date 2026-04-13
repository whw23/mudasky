'use client'

/**
 * 两步验证设置卡片。
 * 支持启用（扫码 + TOTP 确认）和禁用（密码验证）两步验证。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import { encryptPassword } from '@/lib/crypto'
import { getApiError } from '@/lib/api-error'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PasswordInput } from '@/components/auth/PasswordInput'

/** 两步验证管理 */
export function TwoFactorSettings() {
  const { user, fetchUser } = useAuth()
  const t = useTranslations('Profile')
  const tErr = useTranslations('ApiErrors')

  /* 启用流程状态 */
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [enabling, setEnabling] = useState(false)
  const [confirming, setConfirming] = useState(false)

  /* 禁用流程状态 */
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disabling, setDisabling] = useState(false)

  if (!user) return null

  /** 请求启用 2FA，获取二维码 */
  async function handleEnable(): Promise<void> {
    setEnabling(true)
    try {
      const res = await api.post('/portal/profile/2fa-enable-totp', null, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      setQrUrl(url)
    } catch (err) {
      toast.error(getApiError(err, tErr, t('enableFailed')))
    } finally {
      setEnabling(false)
    }
  }

  /** 确认 TOTP 码完成启用 */
  async function handleConfirm(e: FormEvent): Promise<void> {
    e.preventDefault()
    setConfirming(true)
    try {
      await api.post('/portal/profile/2fa-confirm-totp', { totp_code: totpCode })
      toast.success(t('twoFaEnabled'))
      /* 清理二维码 URL */
      if (qrUrl) URL.revokeObjectURL(qrUrl)
      setQrUrl(null)
      setTotpCode('')
      await fetchUser()
    } catch (err) {
      toast.error(getApiError(err, tErr, t('confirmFailed')))
    } finally {
      setConfirming(false)
    }
  }

  /** 取消启用流程 */
  function cancelEnable(): void {
    if (qrUrl) URL.revokeObjectURL(qrUrl)
    setQrUrl(null)
    setTotpCode('')
  }

  /** 提交禁用 2FA */
  async function handleDisable(e: FormEvent): Promise<void> {
    e.preventDefault()
    setDisabling(true)
    try {
      const encrypted = await encryptPassword(disablePassword)
      await api.post('/portal/profile/2fa-disable', {
        encrypted_password: encrypted.encrypted_password,
        nonce: encrypted.nonce,
      })
      toast.success(t('twoFaDisabled'))
      setShowDisableDialog(false)
      setDisablePassword('')
      await fetchUser()
    } catch (err) {
      toast.error(getApiError(err, tErr, t('disableFailed')))
    } finally {
      setDisabling(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('twoFactorAuth')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.two_factor_enabled ? (
          /* 已启用状态 */
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-green-600" />
            <span className="text-sm font-medium">
              {t('twoFaStatusEnabled')}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDisableDialog(true)}
            >
              {t('disableTwoFa')}
            </Button>
          </div>
        ) : qrUrl ? (
          /* 扫码确认阶段 */
          <div className="space-y-4 max-w-sm">
            <p className="text-sm text-muted-foreground">
              {t('scanQrCode')}
            </p>
            <img
              src={qrUrl}
              alt="2FA QR Code"
              className="mx-auto size-48 rounded border"
            />
            <form onSubmit={handleConfirm} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="totp-code">{t('totpCode')}</Label>
                <Input
                  id="totp-code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder={t('totpPlaceholder')}
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={confirming}>
                  {confirming ? t('saving') : t('confirmEnable')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEnable}
                >
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* 未启用状态 */
          <div className="flex items-center gap-3">
            <ShieldOff className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('twoFaStatusDisabled')}
            </span>
            <Button size="sm" onClick={handleEnable} disabled={enabling}>
              {enabling ? t('saving') : t('enableTwoFa')}
            </Button>
          </div>
        )}
      </CardContent>

      {/* 禁用确认弹窗 */}
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
          <form onSubmit={handleDisable} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('disableConfirmHint')}
            </p>
            <div className="space-y-2">
              <Label htmlFor="disable-2fa-pwd">{t('password')}</Label>
              <PasswordInput
                id="disable-2fa-pwd"
                value={disablePassword}
                onChange={setDisablePassword}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false)
                  setDisablePassword('')
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={disabling}
              >
                {disabling ? t('saving') : t('confirmDisable')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
