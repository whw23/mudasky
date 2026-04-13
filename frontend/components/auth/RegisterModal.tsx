'use client'

/**
 * 注册弹窗。
 * 手机号 + 验证码必填，用户名和密码可选。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import { encryptPassword } from '@/lib/crypto'
import { getApiError } from '@/lib/api-error'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { SmsCodeButton } from './SmsCodeButton'
import { PasswordInput } from './PasswordInput'
import { PhoneInput } from './PhoneInput'

/** 注册弹窗组件 */
export function RegisterModal() {
  const { authModal, hideAuthModal, fetchUser, showLoginModal } = useAuth()
  const t = useTranslations('Auth')
  const tErr = useTranslations('ApiErrors')

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /** 重置表单 */
  function resetForm(): void {
    setPhone('')
    setCode('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  /** 弹窗关闭 */
  function handleOpenChange(open: boolean): void {
    if (!open) {
      resetForm()
      hideAuthModal()
    }
  }

  /** 提交注册 */
  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError('')

    if (password && password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, string> = { phone, code }
      if (username) payload.username = username
      if (password) {
        const encrypted = await encryptPassword(password)
        payload.encrypted_password = encrypted.encrypted_password
        payload.nonce = encrypted.nonce
      }

      await api.post('/auth/register', payload)
      await fetchUser()
      resetForm()
      hideAuthModal()
    } catch (err) {
      setError(getApiError(err, tErr, t('registerFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={authModal === 'register'} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" >
        <DialogHeader>
          <DialogTitle>{t('registerTitle')}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 手机号 */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('phone')}</Label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder={t('phonePlaceholder')}
                required
              />
            </div>

            {/* 验证码 */}
            <div className="space-y-2">
              <Label htmlFor="reg-code" className="text-xs uppercase tracking-wide text-muted-foreground">{t('code')}</Label>
              <div className="flex gap-2">
                <Input
                  id="reg-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('codePlaceholder')}
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                />
                <SmsCodeButton phone={phone} />
              </div>
            </div>

            {/* 用户名（可选） */}
            <div className="space-y-2">
              <Label htmlFor="reg-username" className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('username')} <span className="text-muted-foreground">{t('optional')}</span>
              </Label>
              <Input
                id="reg-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('usernamePlaceholder')}
              />
            </div>

            {/* 密码（可选） */}
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('password')} <span className="text-muted-foreground">{t('optional')}</span>
              </Label>
              <PasswordInput
                id="reg-password"
                value={password}
                onChange={setPassword}
              />
            </div>

            {/* 确认密码 */}
            {password && (
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password" className="text-xs uppercase tracking-wide text-muted-foreground">{t('confirmPassword')}</Label>
                <PasswordInput
                  id="reg-confirm-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder={t('confirmPasswordPlaceholder')}
                />
              </div>
            )}

            {/* 错误提示 */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('registerLoading') : t('registerButton')}
            </Button>
          </form>

          <Separator />

          <p className="text-center text-sm text-muted-foreground">
            {t('hasAccount')}
            <button
              className="text-primary hover:underline"
              onClick={showLoginModal}
            >
              {t('goLogin')}
            </button>
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
