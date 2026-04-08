'use client'

/**
 * 系统设置管理页面。
 */

import { useTranslations } from 'next-intl'
import { CountryCodeEditor } from '@/components/admin/CountryCodeEditor'

export default function AdminSettingsPage() {
  const t = useTranslations('AdminSettings')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <CountryCodeEditor />
    </div>
  )
}
