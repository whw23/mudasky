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

/** 联系方式配置 */
export interface ContactInfo {
  address: LocalizedField
  phone: string
  email: string
  wechat: string
  registered_address: LocalizedField
}

/** 品牌信息配置 */
export interface SiteInfo {
  brand_name: LocalizedField
  tagline: LocalizedField
  hotline: string
  hotline_contact: LocalizedField
  logo_url: string
  favicon_url: string
  wechat_qr_url: string
  company_name: string
  icp_filing: string
}

/** 首页统计条目 */
export interface HomepageStat {
  value: string
  label: LocalizedField
}

/** 关于我们页面内容 */
export interface AboutInfo {
  history: LocalizedField
  mission: LocalizedField
  vision: LocalizedField
  partnership: LocalizedField
}

/** 单个页面的 Banner 配置 */
export interface PageBannerConfig {
  image_ids: string[]
}

/** 所有页面的 Banner 配置 */
export type PageBanners = Record<string, PageBannerConfig>
