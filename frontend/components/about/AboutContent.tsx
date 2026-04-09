'use client'

/**
 * 关于页面动态内容区块。
 * 从系统配置获取公司历史、使命、愿景和合作内容。
 */

import { useTranslations } from 'next-intl'
import { Award, Globe } from 'lucide-react'
import { useConfig } from '@/contexts/ConfigContext'

/** 公司历史区块 */
export function HistorySection() {
  const t = useTranslations('About')
  const { aboutInfo } = useConfig()

  return (
    <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
      {aboutInfo.history || t('historyContent')}
    </p>
  )
}

/** 使命愿景区块 */
export function MissionVisionSection() {
  const t = useTranslations('About')
  const { aboutInfo } = useConfig()

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="rounded-lg border bg-white p-8">
        <Award className="h-10 w-10 text-primary" />
        <h3 className="mt-4 text-xl font-bold">{t('missionTitle')}</h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {aboutInfo.mission || t('missionContent')}
        </p>
      </div>
      <div className="rounded-lg border bg-white p-8">
        <Globe className="h-10 w-10 text-primary" />
        <h3 className="mt-4 text-xl font-bold">{t('visionTitle')}</h3>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {aboutInfo.vision || t('visionContent')}
        </p>
      </div>
    </div>
  )
}

/** 合作介绍区块 */
export function PartnershipSection() {
  const t = useTranslations('About')
  const { aboutInfo } = useConfig()

  return (
    <p className="leading-relaxed text-muted-foreground">
      {aboutInfo.partnership || t('partnershipContent')}
    </p>
  )
}

/** 关于页面统计区块 */
export function AboutStatsSection() {
  const { homepageStats } = useConfig()

  return (
    <section className="border-y bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-10 md:grid-cols-4 md:py-14">
        {homepageStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">
              {stat.value}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
