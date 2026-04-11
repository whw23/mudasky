'use client'

/**
 * 登录弹窗。
 * 支持两种登录方式（手机验证码、账号密码）及二步验证。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import { setKeepLogin } from '@/lib/api'
import { encryptPassword } from '@/lib/crypto'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SmsCodeButton } from './SmsCodeButton'
import { PasswordInput } from './PasswordInput'
import { PhoneInput } from './PhoneInput'
import { TwoFaForm } from './TwoFaForm'

/** 判断输入是否为手机号格式（以 + 开头或纯数字 5 位以上） */
function isPhoneNumber(value: string): boolean {
  return /^\+?\d{5,}$/.test(value)
}

/** 登录弹窗组件 */
export function LoginModal() {
  const { authModal, hideAuthModal, fetchUser } = useAuth()
  const t = useTranslations('Auth')

  /* 通用状态 */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keepLoginChecked, setKeepLoginChecked] = useState(true)

  /* 手机验证码登录 */
  const [smsPhone, setSmsPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')

  /* 账号密码登录 */
  const [account, setAccount] = useState('')
  const [accountPwd, setAccountPwd] = useState('')

  /* 当前登录 tab */
  const [activeTab, setActiveTab] = useState('sms')

  /* 二步验证 */
  const [twoFaStep, setTwoFaStep] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<Record<
    string,
    string
  > | null>(null)

  /** 重置表单 */
  function resetForm(): void {
    setError('')
    setSmsPhone('')
    setSmsCode('')
    setAccount('')
    setAccountPwd('')
    setTwoFaStep(false)
    setPendingPayload(null)
  }

  /** 处理弹窗关闭 */
  function handleOpenChange(open: boolean): void {
    if (!open) {
      hideAuthModal()
      resetForm()
    }
  }

  /** 处理保持登录切换 */
  function handleKeepLoginChange(checked: boolean): void {
    setKeepLoginChecked(checked)
    setKeepLogin(checked)
  }

  /** 统一登录请求 */
  async function doLogin(payload: Record<string, string>): Promise<void> {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', payload)
      if (res.data.step === '2fa_required') {
        setTwoFaStep(true)
        setPendingPayload(payload)
        return
      }
      await fetchUser()
      hideAuthModal()
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.message || t('loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  /** 手机验证码登录 */
  async function handleSmsLogin(e: FormEvent): Promise<void> {
    e.preventDefault()
    await doLogin({ phone: smsPhone, code: smsCode })
  }

  /** 账号密码登录（自动判断用户名或手机号） */
  async function handleAccountLogin(e: FormEvent): Promise<void> {
    e.preventDefault()
    const { encrypted_password, nonce } = await encryptPassword(accountPwd)
    if (isPhoneNumber(account)) {
      await doLogin({ phone: account, encrypted_password, nonce })
    } else {
      await doLogin({ username: account, encrypted_password, nonce })
    }
  }

  /** 二步验证提交（重新加密密码，因为原 nonce 已被消费） */
  async function handleTwoFaSubmit(data: Record<string, string | undefined>): Promise<void> {
    if (!pendingPayload) return
    const payload: Record<string, string> = { ...pendingPayload }
    for (const [k, v] of Object.entries(data)) {
      if (v) payload[k] = v
    }
    /* 重新获取公钥并加密密码，因为原 nonce 已被消费 */
    if (accountPwd) {
      const { encrypted_password, nonce } = await encryptPassword(accountPwd)
      payload.encrypted_password = encrypted_password
      payload.nonce = nonce
    }
    doLogin(payload)
  }

  /* 二步验证视图 */
  if (twoFaStep) {
    return (
      <Dialog open={authModal === 'login'} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('twoFaTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <TwoFaForm
              phone={pendingPayload?.phone || ''}
              loading={loading}
              error={error}
              onSubmit={handleTwoFaSubmit}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    )
  }

  /* 主登录视图 */
  return (
    <Dialog open={authModal === 'login'} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {activeTab === 'sms' ? t('loginOrRegister') : t('loginTitle')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <Tabs defaultValue="sms" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="sms">{t('tabSms')}</TabsTrigger>
              <TabsTrigger value="account">{t('tabAccount')}</TabsTrigger>
            </TabsList>

            {/* 手机验证码登录 */}
            <TabsContent value="sms">
              <form onSubmit={handleSmsLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('phone')}</Label>
                  <PhoneInput
                    value={smsPhone}
                    onChange={setSmsPhone}
                    placeholder={t('phonePlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-login-code" className="text-xs uppercase tracking-wide text-muted-foreground">{t('code')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sms-login-code"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      placeholder={t('codePlaceholder')}
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                    />
                    <SmsCodeButton phone={smsPhone} />
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('loginLoading') : t('loginOrRegister')}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  {t('autoRegisterHint')}
                </p>
              </form>
            </TabsContent>

            {/* 账号密码登录 */}
            <TabsContent value="account">
              <form onSubmit={handleAccountLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-account" className="text-xs uppercase tracking-wide text-muted-foreground">{t('account')}</Label>
                  <Input
                    id="login-account"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={t('accountPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-account-pwd" className="text-xs uppercase tracking-wide text-muted-foreground">{t('password')}</Label>
                  <PasswordInput
                    id="login-account-pwd"
                    value={accountPwd}
                    onChange={setAccountPwd}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('loginLoading') : t('loginButton')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* 保持登录 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="keep-login"
              checked={keepLoginChecked}
              onCheckedChange={handleKeepLoginChange}
            />
            <Label htmlFor="keep-login" className="text-sm font-normal">
              {t('keepLogin')}
            </Label>
          </div>

        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
