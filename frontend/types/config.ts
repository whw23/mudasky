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
  wechat_service_qr_url: string
  wechat_official_qr_url: string
  company_name: string
  icp_filing: string

  // --- 首页 ---
  home_intro_title: LocalizedField
  home_intro_content: LocalizedField
  home_cta_title: LocalizedField
  home_cta_desc: LocalizedField

  // --- 关于页 ---
  about_cta_title: LocalizedField
  about_cta_desc: LocalizedField
  about_office_images: { image_id: string; caption: LocalizedField }[]

  // --- 院校页 ---
  universities_intro_title: LocalizedField
  universities_intro_desc: LocalizedField
  universities_cta_title: LocalizedField
  universities_cta_desc: LocalizedField

  // --- 案例页 ---
  cases_intro_title: LocalizedField
  cases_intro_desc: LocalizedField
  cases_cta_title: LocalizedField
  cases_cta_desc: LocalizedField

  // --- 出国留学 ---
  study_abroad_intro_title: LocalizedField
  study_abroad_intro_desc: LocalizedField
  study_abroad_cta_title: LocalizedField
  study_abroad_cta_desc: LocalizedField
  study_abroad_programs: { name: LocalizedField; country: LocalizedField; desc: LocalizedField; features: LocalizedField[] }[]

  // --- 签证 ---
  visa_cta_title: LocalizedField
  visa_cta_desc: LocalizedField
  visa_process_steps: { title: LocalizedField; desc: LocalizedField }[]
  visa_required_docs: { text: LocalizedField }[]
  visa_timeline: { title: LocalizedField; time: LocalizedField; desc: LocalizedField }[]
  visa_tips: { text: LocalizedField }[]

  // --- 申请条件 ---
  requirements_cta_title: LocalizedField
  requirements_cta_desc: LocalizedField
  requirements_countries: { country: LocalizedField; items: LocalizedField[] }[]
  requirements_languages: { language: LocalizedField; items: LocalizedField[] }[]
  requirements_docs: { text: LocalizedField }[]
  requirements_steps: { title: LocalizedField; desc: LocalizedField }[]

  // --- 留学生活 ---
  life_intro_title: LocalizedField
  life_intro_desc: LocalizedField
  life_cta_title: LocalizedField
  life_cta_desc: LocalizedField
  life_guide_cards: { icon: string; title: LocalizedField; desc: LocalizedField }[]
  life_city_cards: { city: LocalizedField; country: LocalizedField; desc: LocalizedField; image_id: string }[]
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
