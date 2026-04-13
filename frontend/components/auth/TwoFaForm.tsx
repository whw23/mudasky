'use client'

/**
 * 二步验证表单。
 * 根据用户可用的验证方式，只展示对应的输入。
 */

import { useState, useEffect, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SmsCodeButton } from './SmsCodeButton'

interface TwoFaFormProps {
  phone: string
  hasTotp: boolean
  hasPhone: boolean
  loading: boolean
  error: string
  onSubmit: (data: { totp?: string; sms_code_2fa?: string }) => void
}

/** 二步验证表单 */
export function TwoFaForm({ phone, hasTotp, hasPhone, loading, error, onSubmit }: TwoFaFormProps) {
  const [twoFaType, setTwoFaType] = useState<'totp' | 'sms'>('totp')
  const [totpCode, setTotpCode] = useState('')
  const [smsCode2fa, setSmsCode2fa] = useState('')
  const t = useTranslations('Auth')

  /** 根据可用方式设置默认 tab */
  useEffect(() => {
    if (hasTotp) {
      setTwoFaType('totp')
    } else if (hasPhone) {
      setTwoFaType('sms')
    }
  }, [hasTotp, hasPhone])

  /** 提交二步验证 */
  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (twoFaType === 'totp') {
      onSubmit({ totp: totpCode })
    } else {
      onSubmit({ sms_code_2fa: smsCode2fa })
    }
  }

  const showBothTabs = hasTotp && hasPhone

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showBothTabs && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={twoFaType === 'totp' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTwoFaType('totp')}
          >
            {t('totpTab')}
          </Button>
          <Button
            type="button"
            variant={twoFaType === 'sms' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTwoFaType('sms')}
          >
            {t('smsTab')}
          </Button>
        </div>
      )}
      {twoFaType === 'totp' && hasTotp ? (
        <div className="space-y-2">
          <Label htmlFor="totp-code">{t('totpLabel')}</Label>
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
      ) : hasPhone ? (
        <div className="space-y-2">
          <Label htmlFor="sms-2fa-code">{t('smsLabel')}</Label>
          <div className="flex gap-2">
            <Input
              id="sms-2fa-code"
              value={smsCode2fa}
              onChange={(e) => setSmsCode2fa(e.target.value)}
              placeholder={t('codePlaceholder')}
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
            <SmsCodeButton phone={phone} disabled={!phone} />
          </div>
        </div>
      ) : null}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('verifying') : t('confirm')}
      </Button>
    </form>
  )
}
