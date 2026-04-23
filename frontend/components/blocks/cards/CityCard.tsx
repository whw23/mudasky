"use client"

/**
 * 城市卡片。
 * 显示图片 + 城市 + 国家 + 描述。
 */

import { getLocalizedValue } from "@/lib/i18n-config"

interface CityCardProps {
  card: Record<string, any>
  locale: string
}

/** 城市卡片 */
export function CityCard({ card, locale }: CityCardProps) {
  const city = getLocalizedValue(card.city, locale)
  const country = getLocalizedValue(card.country, locale)
  const desc = getLocalizedValue(card.desc, locale)

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* 城市图片 */}
      {card.image_id && (
        <div className="relative aspect-video bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/public/images/detail?id=${card.image_id}`}
            alt={city}
            className="size-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <h4 className="font-semibold">{city}</h4>
        {country && (
          <p className="mt-0.5 text-xs text-muted-foreground">{country}</p>
        )}
        {desc && <p className="mt-2 text-sm text-muted-foreground">{desc}</p>}
      </div>
    </div>
  )
}
