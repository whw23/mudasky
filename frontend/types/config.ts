/**
 * 系统配置相关类型定义。
 */

import type { LocalizedField } from "@/lib/i18n-config"

/** 国家码条目 */
export interface CountryCode {
  code: string
  country: string
  label: string
  digits: number
  enabled: boolean
}

/** 联系信息条目 */
export interface ContactItem {
  icon: string
  label: LocalizedField
  content: LocalizedField
  image_id: string | null
  hover_zoom: boolean
}

/** 品牌信息配置（仅全局品牌/联系字段，页面级内容已迁移到 Block） */
export interface SiteInfo {
  brand_name: LocalizedField
  tagline: LocalizedField
  hotline: string
  hotline_contact: LocalizedField
  logo_url: string
  favicon_url: string
  wechat_service_qr_url: string
  wechat_official_qr_url: string
  company_name: string
  icp_filing: string
}

/** 首页统计条目 */
export interface HomepageStat {
  value: string
  label: LocalizedField
}

/** 关于我们页面内容（mission/vision/partnership 已迁移到 Block） */
export interface AboutInfo {
  history_title: LocalizedField
  history: LocalizedField
}

/** 单个页面的 Banner 配置 */
export interface PageBannerConfig {
  image_ids: string[]
}

/** 所有页面的 Banner 配置 */
export type PageBanners = Record<string, PageBannerConfig>
