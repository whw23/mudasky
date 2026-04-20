"use client"

/**
 * 首页 Banner（含搜索框）。
 * 从配置读取首页 Banner 背景图，渲染标题和搜索框。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { useTranslations } from "next-intl"
import { Banner } from "@/components/layout/Banner"
import { HeroSearch } from "./HeroSearch"

/** 首页 Banner（含搜索框） */
export function HomeBanner() {
  const t = useTranslations("Home")
  const { siteInfo, pageBanners } = useLocalizedConfig()
  const imageIds = pageBanners?.home?.image_ids || []

  return (
    <Banner
      title={siteInfo.hero_title || t("heroTitle")}
      subtitle={siteInfo.hero_subtitle || t("heroSubtitle")}
      imageIds={imageIds}
      large
    >
      <HeroSearch />
    </Banner>
  )
}
