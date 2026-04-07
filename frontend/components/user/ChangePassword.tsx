'use client'

/**
 * 修改密码卡片。
 * 包含旧密码、新密码、确认密码三个输入框。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import api from '@/lib/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/auth/PasswordInput'

/** 修改密码表单 */
export function ChangePassword() {
  const t = useTranslations('Profile')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  /** 重置表单 */
  function resetForm(): void {
    setOldPassword('')
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
      await api.put('/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      toast.success(t('passwordChanged'))
      resetForm()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('changeFailed'))
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
            <Label htmlFor="old-password">{t('oldPassword')}</Label>
            <PasswordInput
              id="old-password"
              value={oldPassword}
              onChange={setOldPassword}
              placeholder={t('oldPasswordPlaceholder')}
              required
            />
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
