"use client"

/**
 * 首页 Banner（含搜索框）。
 * 从配置读取首页 Banner 背景图，渲染标题和搜索框。
 */

import { useConfig } from "@/contexts/ConfigContext"
import { useTranslations } from "next-intl"
import { Banner } from "@/components/layout/Banner"
import { HeroSearch } from "./HeroSearch"

/** 首页 Banner（含搜索框） */
export function HomeBanner() {
  const t = useTranslations("Home")
  const { pageBanners } = useConfig()
  const imageIds = pageBanners?.home?.image_ids || []

  return (
    <Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} imageIds={imageIds} large>
      <HeroSearch />
    </Banner>
  )
}
