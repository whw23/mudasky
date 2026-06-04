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
  /** 英文副标题 */
  subtitle?: string
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

  const imageIds = pageBanners?.[pageKey]?.image_ids || []
  return <Banner title={displayTitle} subtitle={subtitle} imageIds={imageIds} />
}
