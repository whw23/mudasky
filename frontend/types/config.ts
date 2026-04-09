/**
 * 系统配置相关类型定义。
 */

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
  address: string
  phone: string
  email: string
  wechat: string
  office_hours: string
}

/** 品牌信息配置 */
export interface SiteInfo {
  brand_name: string
  brand_name_en: string
  tagline: string
  hotline: string
  hotline_contact: string
  logo_url: string
  favicon_url: string
  wechat_qr_url: string
  icp_filing: string
}

/** 首页统计条目 */
export interface HomepageStat {
  value: string
  label: string
}

/** 关于我们页面内容 */
export interface AboutInfo {
  history: string
  mission: string
  vision: string
  partnership: string
}
