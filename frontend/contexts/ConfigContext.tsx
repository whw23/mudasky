'use client'

/**
 * 系统配置 Context。
 * 应用启动时获取配置并缓存，提供 useConfig hook。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/api'
import type { CountryCode, ContactInfo, SiteInfo, HomepageStat, AboutInfo } from '@/types/config'

/** 默认国家码（兜底） */
const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { code: '+86', country: '\u{1F1E8}\u{1F1F3}', label: '中国', digits: 11, enabled: true },
]

/** 默认联系方式（兜底） */
const DEFAULT_CONTACT_INFO: ContactInfo = {
  address: '',
  phone: '',
  email: '',
  wechat: '',
  office_hours: '',
}

/** 默认品牌信息（兜底） */
const DEFAULT_SITE_INFO: SiteInfo = {
  brand_name: '慕大国际教育',
  brand_name_en: 'MUTU International Education',
  tagline: '慕大国际教育 \u00B7 专注国际教育 专注出国服务',
  hotline: '189-1268-6656',
  hotline_contact: '吴老师',
  logo_url: '',
  favicon_url: '',
  wechat_qr_url: '',
  icp_filing: '',
}

/** 默认首页统计（兜底） */
const DEFAULT_HOMEPAGE_STATS: HomepageStat[] = [
  { value: '15+', label: '年办学经验' },
  { value: '500+', label: '成功案例' },
  { value: '50+', label: '合作院校' },
  { value: '98%', label: '签证通过率' },
]

/** 默认关于我们（兜底） */
const DEFAULT_ABOUT_INFO: AboutInfo = {
  history: '',
  mission: '',
  vision: '',
  partnership: '',
}

interface ConfigContextType {
  /** 启用的手机号国家码列表 */
  countryCodes: CountryCode[]
  /** 联系方式配置 */
  contactInfo: ContactInfo
  /** 品牌信息配置 */
  siteInfo: SiteInfo
  /** 首页统计数字 */
  homepageStats: HomepageStat[]
  /** 关于我们页面内容 */
  aboutInfo: AboutInfo
}

const ConfigContext = createContext<ConfigContextType>({
  countryCodes: DEFAULT_COUNTRY_CODES,
  contactInfo: DEFAULT_CONTACT_INFO,
  siteInfo: DEFAULT_SITE_INFO,
  homepageStats: DEFAULT_HOMEPAGE_STATS,
  aboutInfo: DEFAULT_ABOUT_INFO,
})

/** 系统配置 Provider */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>(DEFAULT_COUNTRY_CODES)
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO)
  const [siteInfo, setSiteInfo] = useState<SiteInfo>(DEFAULT_SITE_INFO)
  const [homepageStats, setHomepageStats] = useState<HomepageStat[]>(DEFAULT_HOMEPAGE_STATS)
  const [aboutInfo, setAboutInfo] = useState<AboutInfo>(DEFAULT_ABOUT_INFO)

  useEffect(() => {
    api.get('/config/phone_country_codes')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          const enabled = res.data.value.filter((c: CountryCode) => c.enabled)
          setCountryCodes(enabled.length > 0 ? enabled : DEFAULT_COUNTRY_CODES)
        }
      })
      .catch(() => {
        // 请求失败时使用默认值，不阻塞渲染
      })

    api.get('/config/contact_info')
      .then((res) => {
        if (res.data.value) {
          setContactInfo(res.data.value)
        }
      })
      .catch(() => {})

    api.get('/config/site_info')
      .then((res) => {
        if (res.data.value) {
          setSiteInfo(res.data.value)
        }
      })
      .catch(() => {})

    api.get('/config/homepage_stats')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          setHomepageStats(res.data.value)
        }
      })
      .catch(() => {})

    api.get('/config/about_info')
      .then((res) => {
        if (res.data.value) {
          setAboutInfo(res.data.value)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <ConfigContext value={{ countryCodes, contactInfo, siteInfo, homepageStats, aboutInfo }}>
      {children}
    </ConfigContext>
  )
}

/** 获取系统配置 */
export function useConfig(): ConfigContextType {
  return useContext(ConfigContext)
}
