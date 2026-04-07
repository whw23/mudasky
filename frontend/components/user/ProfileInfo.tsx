'use client'

/**
 * 用户基本信息卡片。
 * 显示用户名（可编辑）、手机号、用户类型、所属分组。
 */

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import api from '@/lib/api'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/** 用户基本信息展示与编辑 */
export function ProfileInfo() {
  const { user, fetchUser } = useAuth()
  const t = useTranslations('Profile')

  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  /** 进入编辑模式 */
  function startEdit(): void {
    setUsername(user?.username ?? '')
    setEditing(true)
  }

  /** 取消编辑 */
  function cancelEdit(): void {
    setEditing(false)
    setUsername('')
  }

  /** 保存用户名 */
  async function handleSave(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    try {
      await api.patch('/users/me', { username: username.trim() })
      await fetchUser()
      setEditing(false)
      toast.success(t('usernameSaved'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('basicInfo')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 用户名 */}
        <div className="space-y-1">
          <Label>{t('username')}</Label>
          {editing ? (
            <form onSubmit={handleSave} className="flex items-center gap-2">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('usernamePlaceholder')}
                required
                className="max-w-xs"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                disabled={loading}
              >
                <Check className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={cancelEdit}
                disabled={loading}
              >
                <X className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {user.username || t('notSet')}
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={startEdit}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* 手机号 */}
        <div className="space-y-1">
          <Label>{t('phone')}</Label>
          <p className="text-sm text-muted-foreground">
            {user.phone || t('notSet')}
          </p>
        </div>

        {/* 用户类型 */}
        <div className="space-y-1">
          <Label>{t('userType')}</Label>
          <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium">
            {user.user_type}
          </span>
        </div>

        {/* 分组 */}
        <div className="space-y-1">
          <Label>{t('groups')}</Label>
          <div className="flex flex-wrap gap-1">
            {user.group_ids.length > 0 ? (
              user.group_ids.map((gid) => (
                <span
                  key={gid}
                  className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium"
                >
                  {gid}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                {t('noGroups')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
