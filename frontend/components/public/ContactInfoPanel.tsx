'use client'

/**
 * 联系信息面板。
 * 从系统配置获取联系方式，若配置为空则回退到 i18n 翻译。
 */

import { useTranslations } from 'next-intl'
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react'
import { useLocalizedConfig } from '@/contexts/ConfigContext'

/** 联系信息面板 */
export function ContactInfoPanel() {
  const t = useTranslations('Contact')
  const { contactInfo } = useLocalizedConfig()

  const infoItems = [
    {
      icon: MapPin,
      label: t('addressLabel'),
      value: contactInfo.address || t('address'),
    },
    {
      icon: Phone,
      label: t('phoneLabel'),
      value: contactInfo.phone || t('phone'),
    },
    {
      icon: Mail,
      label: t('emailLabel'),
      value: contactInfo.email || t('email'),
    },
    {
      icon: MessageCircle,
      label: t('wechatLabel'),
      value: contactInfo.wechat || t('wechat'),
    },
    {
      icon: Clock,
      label: t('hoursLabel'),
      value: contactInfo.office_hours || t('hours'),
    },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold">{t('infoTitle')}</h2>
      <div className="mx-auto mt-3 h-0.5 w-12 bg-primary lg:mx-0" />
      <p className="mt-4 leading-relaxed text-muted-foreground">
        {t('infoDesc')}
      </p>
      <div className="mt-8 space-y-5">
        {infoItems.map((item) => (
          <div key={item.label} className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.value}
              </p>
            </div>
          </div>
        ))}
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
