'use client'

/**
 * 个人资料页面。
 * 所有用户信息和修改操作集中在一个卡片内。
 */

import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'
import { ProfileInfo } from '@/components/user/ProfileInfo'

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
    </div>
  )
}
