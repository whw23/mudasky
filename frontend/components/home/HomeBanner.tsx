"use client"

/**
 * 首页 Banner（含搜索框）。
 * 从配置读取首页 Banner 背景图，渲染标题和搜索框。
 * 支持编辑模式：editable 时显示 EditableOverlay。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { useTranslations } from "next-intl"
import { Banner } from "@/components/layout/Banner"
import { EditableOverlay } from "@/components/admin/EditableOverlay"
import { SearchBar } from "@/components/common/SearchBar"

interface HomeBannerProps {
  editable?: boolean
  onEditConfig?: (section: string) => void
  onBannerEdit?: (pageKey: string) => void
}

/** 首页 Banner（含搜索框） */
export function HomeBanner({ editable, onEditConfig, onBannerEdit }: HomeBannerProps) {
  const t = useTranslations("Home")
  const { siteInfo, pageBanners } = useLocalizedConfig()
  const imageIds = pageBanners?.home?.image_ids || []

  const title = siteInfo.brand_name || t("heroTitle")
  const subtitle = siteInfo.tagline || t("heroSubtitle")

  const banner = <Banner title={title} subtitle={subtitle} imageIds={imageIds} large>
    {!editable && <SearchBar />}
  </Banner>

  if (!editable) return banner

  return (
    <div className="relative">
      <EditableOverlay onClick={() => onBannerEdit?.("home")} label="编辑 Banner 背景">
        {banner}
      </EditableOverlay>
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
        <EditableOverlay onClick={() => onEditConfig?.("brand_name")} label="编辑品牌名称" inline>
          <span className="pointer-events-auto text-2xl md:text-5xl font-bold tracking-wide text-transparent select-none">
            【{title}】
          </span>
        </EditableOverlay>
        <EditableOverlay onClick={() => onEditConfig?.("tagline")} label="编辑标语" inline>
          <span className="pointer-events-auto text-xs md:text-sm tracking-[0.3em] text-transparent select-none">
            {subtitle}
          </span>
        </EditableOverlay>
      </div>
    </div>
  )
}
