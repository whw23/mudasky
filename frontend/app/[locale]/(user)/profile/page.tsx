'use client'

/**
 * 个人资料页面。
 * 展示用户基本信息、修改密码、修改手机号、两步验证设置。
 */

import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'
import { ProfileInfo } from '@/components/user/ProfileInfo'
import { ChangePassword } from '@/components/user/ChangePassword'
import { ChangePhone } from '@/components/user/ChangePhone'
import { TwoFactorSettings } from '@/components/user/TwoFactorSettings'

/** 个人资料页面 */
export default function ProfilePage() {
  const t = useTranslations('Profile')
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('loginRequired')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('profile')}</h1>
      <ProfileInfo />
      <ChangePassword />
      <ChangePhone />
      <TwoFactorSettings />
    </div>
  )
}
