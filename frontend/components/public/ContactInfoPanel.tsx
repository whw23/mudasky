'use client'

/**
 * 联系信息面板。
 * 从 ConfigContext 读取 contactItems 数组动态渲染。
 */

import { useTranslations } from 'next-intl'
import { MapPin, icons } from 'lucide-react'
import { useLocalizedConfig } from '@/contexts/ConfigContext'
import { resolveIcon } from '@/lib/icon-utils'

/** 联系信息面板 */
export function ContactInfoPanel() {
  const t = useTranslations('Contact')
  const { contactItems } = useLocalizedConfig()

  return (
    <div>
      <h2 className="text-2xl font-bold">{t('infoTitle')}</h2>
      <div className="mx-auto mt-3 h-0.5 w-12 bg-primary lg:mx-0" />
      <p className="mt-4 leading-relaxed text-muted-foreground">
        {t('infoDesc')}
      </p>
      <div className="mt-8 space-y-5">
        {contactItems.map((item, index) => {
          const Icon = resolveIcon(item.icon, icons.Info)!
          return (
            <div key={index} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.content}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 地图占位 */}
      <div className="mt-8 flex h-48 items-center justify-center rounded-lg border-2 border-dashed bg-gray-50">
        <div className="text-center text-muted-foreground">
          <MapPin className="mx-auto h-8 w-8" />
          <p className="mt-2 text-sm">{t('mapPlaceholder')}</p>
        </div>
      </div>
    </div>
  )
}
