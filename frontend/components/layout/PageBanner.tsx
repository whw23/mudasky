"use client"

/**
 * 从配置读取 Banner 图片的页面横幅。
 * 自动从 ConfigContext 中读取对应页面的 banner 图片 ID。
 * 支持从 navConfig.item_names 读取覆盖后的页面标题。
 */

import { useLocale } from "next-intl"
import { useConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import { Banner } from "./Banner"

interface PageBannerProps {
  /** 页面标识（对应 page_banners 配置的 key） */
  pageKey: string
  /** 默认标题（i18n 翻译值，当 item_names 无覆盖时使用） */
  title: string
  /** 默认副标题（当 item_names 无多语言值时使用） */
  subtitle?: string
}

/** 从 item_names 的多语言值中取非当前语言的值作为副标题 */
function getOtherLocaleValue(
  name: string | Record<string, string> | undefined,
  currentLocale: string,
): string | undefined {
  if (!name || typeof name === "string") return undefined
  const otherLocales = ["en", "zh", "ja", "de"].filter((l) => l !== currentLocale)
  for (const l of otherLocales) {
    if (name[l]?.trim()) return name[l]
  }
  return undefined
}

/** 从配置读取 Banner 图片的页面横幅 */
export function PageBanner({ pageKey, title, subtitle }: PageBannerProps) {
  const { pageBanners, navConfig } = useConfig()
  const locale = useLocale()

  // 如果 navConfig.item_names 中有覆盖，使用覆盖的标题
  const overrideName = navConfig?.item_names?.[pageKey]
  const displayTitle = overrideName
    ? getLocalizedValue(overrideName, locale)
    : title

  // 从 item_names 的多语言值中取非当前语言作为副标题
  const overrideSubtitle = getOtherLocaleValue(overrideName, locale)
  const displaySubtitle = overrideSubtitle ?? subtitle

  const imageIds = pageBanners?.[pageKey]?.image_ids || []
  return <Banner title={displayTitle} subtitle={displaySubtitle} imageIds={imageIds} />
}
