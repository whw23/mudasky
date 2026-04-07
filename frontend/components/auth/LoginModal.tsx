'use client'

/**
 * 登录弹窗。
 * 支持三种登录方式（手机验证码、用户名密码、手机号密码）及二步验证。
 */

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import { setKeepLogin } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { SmsCodeButton } from './SmsCodeButton'
import { PasswordInput } from './PasswordInput'
import { TwoFaForm } from './TwoFaForm'

/** 登录弹窗组件 */
export function LoginModal() {
  const { authModal, hideAuthModal, fetchUser, showRegisterModal } = useAuth()

  /* 通用状态 */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keepLoginChecked, setKeepLoginChecked] = useState(true)

  /* 手机验证码登录 */
  const [smsPhone, setSmsPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')

  /* 用户名密码登录 */
  const [username, setUsername] = useState('')
  const [usernamePwd, setUsernamePwd] = useState('')

  /* 手机号密码登录 */
  const [phoneLogin, setPhoneLogin] = useState('')
  const [phonePwd, setPhonePwd] = useState('')

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
    setUsername('')
    setUsernamePwd('')
    setPhoneLogin('')
    setPhonePwd('')
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
      setError(err.response?.data?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  /** 手机验证码登录 */
  async function handleSmsLogin(e: FormEvent): Promise<void> {
    e.preventDefault()
    await doLogin({ phone: smsPhone, code: smsCode })
  }

  /** 用户名密码登录 */
  async function handleUsernameLogin(e: FormEvent): Promise<void> {
    e.preventDefault()
    await doLogin({ username, password: usernamePwd })
  }

  /** 手机号密码登录 */
  async function handlePhonePasswordLogin(e: FormEvent): Promise<void> {
    e.preventDefault()
    await doLogin({ phone: phoneLogin, password: phonePwd })
  }

  /** 二步验证提交 */
  function handleTwoFaSubmit(data: Record<string, string | undefined>): void {
    if (!pendingPayload) return
    const payload: Record<string, string> = { ...pendingPayload }
    for (const [k, v] of Object.entries(data)) {
      if (v) payload[k] = v
    }
    doLogin(payload)
  }

  /* 二步验证视图 */
  if (twoFaStep) {
    return (
      <Dialog open={authModal === 'login'} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>二步验证</DialogTitle>
          </DialogHeader>
          <TwoFaForm
            phone={pendingPayload?.phone || ''}
            loading={loading}
            error={error}
            onSubmit={handleTwoFaSubmit}
          />
        </DialogContent>
      </Dialog>
    )
  }

  /* 主登录视图 */
  return (
    <Dialog open={authModal === 'login'} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>登录</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sms" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="sms">手机验证码</TabsTrigger>
            <TabsTrigger value="username">用户名密码</TabsTrigger>
            <TabsTrigger value="phone-pwd">手机号密码</TabsTrigger>
          </TabsList>

          {/* 手机验证码登录 */}
          <TabsContent value="sms">
            <form onSubmit={handleSmsLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="sms-phone">手机号</Label>
                <Input
                  id="sms-phone"
                  type="tel"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  placeholder="请输入手机号"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-login-code">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="sms-login-code"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    placeholder="请输入验证码"
                    maxLength={6}
                    required
                  />
                  <SmsCodeButton phone={smsPhone} />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </TabsContent>

          {/* 用户名密码登录 */}
          <TabsContent value="username">
            <form onSubmit={handleUsernameLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">用户名</Label>
                <Input
                  id="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-username-pwd">密码</Label>
                <PasswordInput
                  id="login-username-pwd"
                  value={usernamePwd}
                  onChange={setUsernamePwd}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </TabsContent>

          {/* 手机号密码登录 */}
          <TabsContent value="phone-pwd">
            <form
              onSubmit={handlePhonePasswordLogin}
              className="space-y-4 pt-4"
            >
              <div className="space-y-2">
                <Label htmlFor="login-phone">手机号</Label>
                <Input
                  id="login-phone"
                  type="tel"
                  value={phoneLogin}
                  onChange={(e) => setPhoneLogin(e.target.value)}
                  placeholder="请输入手机号"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-phone-pwd">密码</Label>
                <PasswordInput
                  id="login-phone-pwd"
                  value={phonePwd}
                  onChange={setPhonePwd}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
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
            保持登录
          </Label>
        </div>

        <Separator />

        {/* 注册链接 */}
        <p className="text-center text-sm text-muted-foreground">
          没有账号？
          <button
            className="text-primary hover:underline"
            onClick={showRegisterModal}
          >
            去注册
          </button>
        </p>
      </DialogContent>
    </Dialog>
  )
}
