'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export default function NotFound() {
  const router = useRouter()
  const t = useTranslations('NotFound')

  useEffect(() => {
    const timer = setTimeout(() => {
      router.back()
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-6xl font-bold text-primary">{t('title')}</h1>
      <p className="text-xl text-muted-foreground">{t('message')}</p>
      <p className="text-sm text-muted-foreground">{t('autoReturn')}</p>
    </div>
  )
}
