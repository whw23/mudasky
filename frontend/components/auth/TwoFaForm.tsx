'use client'

/**
 * 二步验证表单。
 * 支持 TOTP 验证器和短信验证码两种方式。
 */

import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SmsCodeButton } from './SmsCodeButton'

interface TwoFaFormProps {
  phone: string
  loading: boolean
  error: string
  onSubmit: (data: { totp?: string; sms_code_2fa?: string }) => void
}

/** 二步验证表单 */
export function TwoFaForm({ phone, loading, error, onSubmit }: TwoFaFormProps) {
  const [twoFaType, setTwoFaType] = useState<'totp' | 'sms'>('totp')
  const [totpCode, setTotpCode] = useState('')
  const [smsCode2fa, setSmsCode2fa] = useState('')

  /** 提交二步验证 */
  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    if (twoFaType === 'totp') {
      onSubmit({ totp: totpCode })
    } else {
      onSubmit({ sms_code_2fa: smsCode2fa })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={twoFaType === 'totp' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTwoFaType('totp')}
        >
          验证器
        </Button>
        <Button
          type="button"
          variant={twoFaType === 'sms' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTwoFaType('sms')}
        >
          短信验证
        </Button>
      </div>
      {twoFaType === 'totp' ? (
        <div className="space-y-2">
          <Label htmlFor="totp-code">验证器验证码</Label>
          <Input
            id="totp-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="请输入 6 位验证码"
            maxLength={6}
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="sms-2fa-code">短信验证码</Label>
          <div className="flex gap-2">
            <Input
              id="sms-2fa-code"
              value={smsCode2fa}
              onChange={(e) => setSmsCode2fa(e.target.value)}
              placeholder="请输入验证码"
              maxLength={6}
              required
            />
            <SmsCodeButton phone={phone} disabled={!phone} />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '验证中...' : '确认'}
      </Button>
    </form>
  )
}
