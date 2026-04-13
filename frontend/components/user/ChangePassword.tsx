'use client'

/**
 * 修改密码卡片。
 * 通过手机号短信验证码验证身份后设置新密码。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import api from '@/lib/api'
import { encryptPassword } from '@/lib/crypto'
import { useAuth } from '@/hooks/use-auth'
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
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SmsCodeButton } from '@/components/auth/SmsCodeButton'
import { PhoneInput } from '@/components/auth/PhoneInput'

/** 修改密码表单 */
export function ChangePassword() {
  const t = useTranslations('Profile')
  const tErr = useTranslations('ApiErrors')
  const { user } = useAuth()

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  /** 重置表单 */
  function resetForm(): void {
    setPhone('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
  }

  /** 提交修改密码 */
  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const { encrypted_password, nonce } = await encryptPassword(newPassword)
      await api.post('/portal/profile/password', {
        phone,
        code,
        encrypted_password,
        nonce,
      })
      toast.success(t('passwordChanged'))
      resetForm()
    } catch (err) {
      toast.error(getApiError(err, tErr, t('changeFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('changePassword')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>{t('phone')}</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              placeholder={t('phonePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd-code">{t('smsCode')}</Label>
            <div className="flex gap-2">
              <Input
                id="pwd-code"
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
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('newPassword')}</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder={t('newPasswordPlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t('confirmPassword')}
            </Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t('confirmPasswordPlaceholder')}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('changePassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
