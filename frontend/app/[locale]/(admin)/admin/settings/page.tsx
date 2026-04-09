'use client'

/**
 * 系统设置管理页面。
 */

import { useTranslations } from 'next-intl'
import { CountryCodeEditor } from '@/components/admin/CountryCodeEditor'
import { ContactInfoEditor } from '@/components/admin/ContactInfoEditor'
import { SiteInfoEditor } from '@/components/admin/SiteInfoEditor'
import { HomepageStatsEditor } from '@/components/admin/HomepageStatsEditor'
import { AboutInfoEditor } from '@/components/admin/AboutInfoEditor'

export default function AdminSettingsPage() {
  const t = useTranslations('AdminSettings')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <SiteInfoEditor />
      <HomepageStatsEditor />
      <AboutInfoEditor />
      <ContactInfoEditor />
      <CountryCodeEditor />
    </div>
  )
}
