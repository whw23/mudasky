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
