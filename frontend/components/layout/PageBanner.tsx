"use client"

/**
 * 从配置读取 Banner 图片的页面横幅。
 * 自动从 ConfigContext 中读取对应页面的 banner 图片 ID。
 */

import { useConfig } from "@/contexts/ConfigContext"
import { Banner } from "./Banner"

interface PageBannerProps {
  /** 页面标识（对应 page_banners 配置的 key） */
  pageKey: string
  /** 中文标题 */
  title: string
  /** 英文副标题 */
  subtitle?: string
}

/** 从配置读取 Banner 图片的页面横幅 */
export function PageBanner({ pageKey, title, subtitle }: PageBannerProps) {
  const { pageBanners } = useConfig()
  const imageIds = pageBanners?.[pageKey]?.image_ids || []
  return <Banner title={title} subtitle={subtitle} imageIds={imageIds} />
}
