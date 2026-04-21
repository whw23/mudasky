'use client'

/**
 * 系统配置 Context。
 * 应用启动时获取配置并缓存，提供 useConfig hook。
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import api from '@/lib/api'
import { getLocalizedValue } from '@/lib/i18n-config'
import type { ContactInfo, SiteInfo, HomepageStat, AboutInfo, PageBanners } from '@/types/config'

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
  wechat_service_qr_url: '',
  wechat_official_qr_url: '',
  company_name: '浩然学行(苏州)文化传播有限公司',
  icp_filing: '苏ICP备2022046719号-1',
  hero_title: '',
  hero_subtitle: '',
  services_title: '',
  destinations_title: '',
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

/** 导航栏自定义项 */
interface NavCustomItem {
  slug: string
  name: string | Record<string, string>
  category_id: string
}

/** 导航栏配置 */
interface NavConfig {
  order: string[]
  custom_items: NavCustomItem[]
}

/** 默认导航配置（兜底） */
const DEFAULT_NAV_CONFIG: NavConfig = {
  order: ['home', 'universities', 'study-abroad', 'requirements', 'cases', 'visa', 'life', 'news', 'about'],
  custom_items: [],
}

interface ConfigContextType {
  /** 联系方式配置 */
  contactInfo: ContactInfo
  /** 品牌信息配置 */
  siteInfo: SiteInfo
  /** 首页统计数字 */
  homepageStats: HomepageStat[]
  /** 关于我们页面内容 */
  aboutInfo: AboutInfo
  /** 导航栏配置 */
  navConfig: NavConfig
  /** 页面 Banner 配置 */
  pageBanners: PageBanners
  /** 刷新配置 */
  refreshConfig: () => void
}

const ConfigContext = createContext<ConfigContextType>({
  contactInfo: DEFAULT_CONTACT_INFO,
  siteInfo: DEFAULT_SITE_INFO,
  homepageStats: DEFAULT_HOMEPAGE_STATS,
  aboutInfo: DEFAULT_ABOUT_INFO,
  navConfig: DEFAULT_NAV_CONFIG,
  pageBanners: {},
  refreshConfig: () => {},
})

/** 系统配置 Provider */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO)
  const [siteInfo, setSiteInfo] = useState<SiteInfo>(DEFAULT_SITE_INFO)
  const [homepageStats, setHomepageStats] = useState<HomepageStat[]>(DEFAULT_HOMEPAGE_STATS)
  const [aboutInfo, setAboutInfo] = useState<AboutInfo>(DEFAULT_ABOUT_INFO)
  const [navConfig, setNavConfig] = useState<NavConfig>(DEFAULT_NAV_CONFIG)
  const [pageBanners, setPageBanners] = useState<PageBanners>({})

  const fetchConfig = useCallback(() => {
    api.get('/public/config/all')
      .then((res) => {
        const data = res.data
        if (data.contact_info) setContactInfo({ ...DEFAULT_CONTACT_INFO, ...data.contact_info })
        if (data.site_info) setSiteInfo({ ...DEFAULT_SITE_INFO, ...data.site_info })
        if (Array.isArray(data.homepage_stats)) setHomepageStats(data.homepage_stats)
        if (data.about_info) setAboutInfo({ ...DEFAULT_ABOUT_INFO, ...data.about_info })
        if (data.nav_config) setNavConfig({ ...DEFAULT_NAV_CONFIG, ...data.nav_config })
        if (data.page_banners) setPageBanners(data.page_banners)
      })
      .catch((err) => console.warn('[ConfigProvider] 配置加载失败:', err.message))
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  return (
    <ConfigContext value={{ contactInfo, siteInfo, homepageStats, aboutInfo, navConfig, pageBanners, refreshConfig: fetchConfig }}>
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
  siteInfo: {
    brand_name: string
    tagline: string
    hotline: string
    hotline_contact: string
    logo_url: string
    favicon_url: string
    wechat_service_qr_url: string
    wechat_official_qr_url: string
    company_name: string
    icp_filing: string
    hero_title: string
    hero_subtitle: string
    services_title: string
    destinations_title: string
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
  navConfig: NavConfig
  pageBanners: PageBanners
}

/** 获取已解析为当前语言的配置（展示用） */
export function useLocalizedConfig(): LocalizedConfigType {
  const config = useConfig()
  const locale = useLocale()

  return {
    siteInfo: {
      ...config.siteInfo,
      brand_name: getLocalizedValue(config.siteInfo.brand_name, locale),
      tagline: getLocalizedValue(config.siteInfo.tagline, locale),
      hotline_contact: getLocalizedValue(config.siteInfo.hotline_contact, locale),
      hero_title: getLocalizedValue(config.siteInfo.hero_title, locale),
      hero_subtitle: getLocalizedValue(config.siteInfo.hero_subtitle, locale),
      services_title: getLocalizedValue(config.siteInfo.services_title, locale),
      destinations_title: getLocalizedValue(config.siteInfo.destinations_title, locale),
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
    navConfig: config.navConfig,
    pageBanners: config.pageBanners,
  }
}
