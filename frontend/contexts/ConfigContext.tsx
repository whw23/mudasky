'use client'

/**
 * 系统配置 Context。
 * 应用启动时获取配置并缓存，提供 useConfig hook。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import api from '@/lib/api'
import { getLocalizedValue } from '@/lib/i18n-config'
import type { CountryCode, ContactInfo, SiteInfo, HomepageStat, AboutInfo } from '@/types/config'

/** 面板页面配置项 */
interface PanelPage {
  key: string
  icon: string
  permissions?: string[]
}

/** 面板配置 */
interface PanelConfig {
  admin: PanelPage[]
  portal: PanelPage[]
}

/** 默认面板配置（兜底） */
const DEFAULT_PANEL_CONFIG: PanelConfig = {
  admin: [],
  portal: [],
}

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
  registered_address: '',
}

/** 默认品牌信息（兜底） */
const DEFAULT_SITE_INFO: SiteInfo = {
  brand_name: '慕大国际教育',
  tagline: '专注国际教育 · 专注出国服务',
  hotline: '189-1268-6656',
  hotline_contact: '苏老师',
  logo_url: '',
  favicon_url: '',
  wechat_qr_url: '',
  company_name: '浩然学行(苏州)文化传播有限公司',
  icp_filing: '苏ICP备2022046719号-1',
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
  /** 面板页面配置 */
  panelConfig: PanelConfig
}

const ConfigContext = createContext<ConfigContextType>({
  countryCodes: DEFAULT_COUNTRY_CODES,
  contactInfo: DEFAULT_CONTACT_INFO,
  siteInfo: DEFAULT_SITE_INFO,
  homepageStats: DEFAULT_HOMEPAGE_STATS,
  aboutInfo: DEFAULT_ABOUT_INFO,
  panelConfig: DEFAULT_PANEL_CONFIG,
})

/** 系统配置 Provider */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>(DEFAULT_COUNTRY_CODES)
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO)
  const [siteInfo, setSiteInfo] = useState<SiteInfo>(DEFAULT_SITE_INFO)
  const [homepageStats, setHomepageStats] = useState<HomepageStat[]>(DEFAULT_HOMEPAGE_STATS)
  const [aboutInfo, setAboutInfo] = useState<AboutInfo>(DEFAULT_ABOUT_INFO)
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(DEFAULT_PANEL_CONFIG)

  useEffect(() => {
    api.get('/public/config/phone_country_codes')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          const enabled = res.data.value.filter((c: CountryCode) => c.enabled)
          setCountryCodes(enabled.length > 0 ? enabled : DEFAULT_COUNTRY_CODES)
        }
      })
      .catch((err) => {
        // 请求失败时使用默认值，不阻塞渲染
        console.warn('[ConfigProvider] phone_country_codes 加载失败:', err.message)
      })

    api.get('/public/config/contact_info')
      .then((res) => {
        if (res.data.value) {
          setContactInfo({ ...DEFAULT_CONTACT_INFO, ...res.data.value })
        }
      })
      .catch((err) => console.warn('[ConfigProvider] contact_info 加载失败:', err.message))

    api.get('/public/config/site_info')
      .then((res) => {
        if (res.data.value) {
          setSiteInfo({ ...DEFAULT_SITE_INFO, ...res.data.value })
        }
      })
      .catch((err) => console.warn('[ConfigProvider] site_info 加载失败:', err.message))

    api.get('/public/config/homepage_stats')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          setHomepageStats(res.data.value)
        }
      })
      .catch((err) => console.warn('[ConfigProvider] homepage_stats 加载失败:', err.message))

    api.get('/public/config/about_info')
      .then((res) => {
        if (res.data.value) {
          setAboutInfo({ ...DEFAULT_ABOUT_INFO, ...res.data.value })
        }
      })
      .catch((err) => console.warn('[ConfigProvider] about_info 加载失败:', err.message))

    api.get('/public/panel-config').then(res => setPanelConfig({ ...DEFAULT_PANEL_CONFIG, ...res.data.value })).catch(() => {})
  }, [])

  return (
    <ConfigContext value={{ countryCodes, contactInfo, siteInfo, homepageStats, aboutInfo, panelConfig }}>
      {children}
    </ConfigContext>
  )
}

/** 获取系统配置（原始数据，编辑用） */
export function useConfig(): ConfigContextType {
  return useContext(ConfigContext)
}

/** 已解析语言的配置类型（展示用） */
interface LocalizedConfigType {
  countryCodes: CountryCode[]
  panelConfig: PanelConfig
  siteInfo: {
    brand_name: string
    tagline: string
    hotline: string
    hotline_contact: string
    logo_url: string
    favicon_url: string
    wechat_qr_url: string
    company_name: string
    icp_filing: string
  }
  contactInfo: {
    address: string
    phone: string
    email: string
    wechat: string
    registered_address: string
  }
  homepageStats: { value: string; label: string }[]
  aboutInfo: {
    history: string
    mission: string
    vision: string
    partnership: string
  }
}

/** 获取已解析为当前语言的配置（展示用） */
export function useLocalizedConfig(): LocalizedConfigType {
  const config = useConfig()
  const locale = useLocale()

  return {
    countryCodes: config.countryCodes,
    panelConfig: config.panelConfig,
    siteInfo: {
      ...config.siteInfo,
      brand_name: getLocalizedValue(config.siteInfo.brand_name, locale),
      tagline: getLocalizedValue(config.siteInfo.tagline, locale),
      hotline_contact: getLocalizedValue(config.siteInfo.hotline_contact, locale),
    },
    contactInfo: {
      ...config.contactInfo,
      address: getLocalizedValue(config.contactInfo.address, locale),
      registered_address: getLocalizedValue(config.contactInfo.registered_address, locale),
    },
    homepageStats: config.homepageStats.map((s) => ({
      ...s,
      label: getLocalizedValue(s.label, locale),
    })),
    aboutInfo: {
      history: getLocalizedValue(config.aboutInfo.history, locale),
      mission: getLocalizedValue(config.aboutInfo.mission, locale),
      vision: getLocalizedValue(config.aboutInfo.vision, locale),
      partnership: getLocalizedValue(config.aboutInfo.partnership, locale),
    },
  }
}
