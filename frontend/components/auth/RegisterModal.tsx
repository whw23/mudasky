'use client'

/**
 * 注册弹窗。
 * 手机号 + 验证码必填，用户名和密码可选。
 */

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import {
  Dialog,
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

/** 注册弹窗组件 */
export function RegisterModal() {
  const { authModal, hideAuthModal, fetchUser, showLoginModal } = useAuth()

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
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, string> = { phone, code }
      if (username) payload.username = username
      if (password) payload.password = password

      await api.post('/auth/register', payload)
      await fetchUser()
      resetForm()
      hideAuthModal()
    } catch (err: any) {
      setError(err.response?.data?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={authModal === 'register'} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>注册</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 手机号 */}
          <div className="space-y-2">
            <Label htmlFor="reg-phone">手机号</Label>
            <Input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              required
            />
          </div>

          {/* 验证码 */}
          <div className="space-y-2">
            <Label htmlFor="reg-code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="reg-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                maxLength={6}
                required
              />
              <SmsCodeButton phone={phone} />
            </div>
          </div>

          {/* 用户名（可选） */}
          <div className="space-y-2">
            <Label htmlFor="reg-username">
              用户名 <span className="text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>

          {/* 密码（可选） */}
          <div className="space-y-2">
            <Label htmlFor="reg-password">
              密码 <span className="text-muted-foreground">（可选）</span>
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
              <Label htmlFor="reg-confirm-password">确认密码</Label>
              <PasswordInput
                id="reg-confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="请再次输入密码"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </Button>
        </form>

        <Separator />

        <p className="text-center text-sm text-muted-foreground">
          已有账号？
          <button
            className="text-primary hover:underline"
            onClick={showLoginModal}
          >
            去登录
          </button>
        </p>
      </DialogContent>
    </Dialog>
  )
}
