'use client'

/**
 * 发送验证码按钮。
 * 点击后发送短信，60 秒倒计时。
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

interface SmsCodeButtonProps {
  phone: string
  disabled?: boolean
}

/** 短信验证码发送按钮 */
export function SmsCodeButton({ phone, disabled }: SmsCodeButtonProps) {
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)
  const t = useTranslations('Auth')

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  /** 发送验证码 */
  const handleSend = useCallback(async () => {
    if (!phone || sending || countdown > 0) return
    setSending(true)
    try {
      const res = await api.post('/auth/sms-code', { phone })
      if (res.data.code) {
        console.log(`[DEV] 验证码: ${res.data.code}`)
      }
      setCountdown(60)
    } catch (err: any) {
      const msg = err.response?.data?.message || t('sendFailed')
      alert(msg)
    } finally {
      setSending(false)
    }
  }, [phone, sending, countdown, t])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || sending || countdown > 0 || !phone}
      onClick={handleSend}
      className="w-28 shrink-0"
    >
      {countdown > 0 ? `${countdown}s` : sending ? t('sending') : t('sendCode')}
    </Button>
  )
}
