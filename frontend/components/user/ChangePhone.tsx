'use client'

/**
 * 修改手机号卡片。
 * 包含新手机号输入和短信验证码。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SmsCodeButton } from '@/components/auth/SmsCodeButton'
import { PhoneInput } from '@/components/auth/PhoneInput'

/** 修改手机号表单 */
export function ChangePhone() {
  const { fetchUser } = useAuth()
  const t = useTranslations('Profile')

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  /** 重置表单 */
  function resetForm(): void {
    setPhone('')
    setCode('')
  }

  /** 提交修改手机号 */
  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put('/users/me/phone', { new_phone: phone, code })
      toast.success(t('phoneChanged'))
      resetForm()
      await fetchUser()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('changeFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('changePhone')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>{t('newPhone')}</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              placeholder={t('phonePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-code">{t('smsCode')}</Label>
            <div className="flex gap-2">
              <Input
                id="phone-code"
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
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('changePhone')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
