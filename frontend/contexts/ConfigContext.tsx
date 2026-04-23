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
  // 首页
  home_intro_title: '',
  home_intro_content: '',
  home_cta_title: '',
  home_cta_desc: '',
  // 关于页
  about_cards: [],
  about_cta_title: '',
  about_cta_desc: '',
  about_office_images: [],
  // 院校页
  universities_intro_title: '',
  universities_intro_desc: '',
  universities_cta_title: '',
  universities_cta_desc: '',
  // 案例页
  cases_intro_title: '',
  cases_intro_desc: '',
  cases_cta_title: '',
  cases_cta_desc: '',
  // 出国留学
  study_abroad_intro_title: '',
  study_abroad_intro_desc: '',
  study_abroad_cta_title: '',
  study_abroad_cta_desc: '',
  study_abroad_programs: [],
  // 签证
  visa_cta_title: '',
  visa_cta_desc: '',
  visa_process_steps: [],
  visa_required_docs: [],
  visa_timeline: [],
  visa_tips: [],
  // 申请条件
  requirements_cta_title: '',
  requirements_cta_desc: '',
  requirements_countries: [],
  requirements_languages: [],
  requirements_docs: [],
  requirements_steps: [],
  // 留学生活
  life_intro_title: '',
  life_intro_desc: '',
  life_cta_title: '',
  life_cta_desc: '',
  life_guide_cards: [],
  life_city_cards: [],
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
  history_title: '',
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

  const fetchConfig = useCallback((bustCache = false) => {
    api.get('/public/config/all', bustCache ? { headers: { 'Cache-Control': 'no-cache' } } : {})
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
    <ConfigContext value={{ contactInfo, siteInfo, homepageStats, aboutInfo, navConfig, pageBanners, refreshConfig: () => fetchConfig(true) }}>
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
    // 首页
    home_intro_title: string
    home_intro_content: string
    home_cta_title: string
    home_cta_desc: string
    // 关于页
    about_cta_title: string
    about_cta_desc: string
    about_office_images: { image_id: string; caption: string }[]
    // 院校页
    universities_intro_title: string
    universities_intro_desc: string
    universities_cta_title: string
    universities_cta_desc: string
    // 案例页
    cases_intro_title: string
    cases_intro_desc: string
    cases_cta_title: string
    cases_cta_desc: string
    // 出国留学
    study_abroad_intro_title: string
    study_abroad_intro_desc: string
    study_abroad_cta_title: string
    study_abroad_cta_desc: string
    study_abroad_programs: { name: string; country: string; desc: string; features: string[] }[]
    // 签证
    visa_cta_title: string
    visa_cta_desc: string
    visa_process_steps: { title: string; desc: string }[]
    visa_required_docs: { text: string }[]
    visa_timeline: { title: string; time: string; desc: string }[]
    visa_tips: { text: string }[]
    // 申请条件
    requirements_cta_title: string
    requirements_cta_desc: string
    requirements_countries: { country: string; items: string[] }[]
    requirements_languages: { language: string; items: string[] }[]
    requirements_docs: { text: string }[]
    requirements_steps: { title: string; desc: string }[]
    // 留学生活
    life_intro_title: string
    life_intro_desc: string
    life_cta_title: string
    life_cta_desc: string
    life_guide_cards: { icon: string; title: string; desc: string }[]
    life_city_cards: { city: string; country: string; desc: string; image_id: string }[]
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
    history_title: string
    history: string
    mission: string
    vision: string
    partnership: string
  }
  navConfig: NavConfig
  pageBanners: PageBanners
}

/**
 * 递归解析数组项中的多语言字段。
 * 将 LocalizedField 解析为当前语言字符串，支持嵌套数组。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveArrayItems<T extends Record<string, any>>(items: T[], locale: string): any[] {
  return items.map(item => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resolved: any = { ...item }
    for (const [key, value] of Object.entries(resolved)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'zh' in value) {
        resolved[key] = getLocalizedValue(value as Record<string, string>, locale)
      }
      if (Array.isArray(value)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolved[key] = value.map((v: any) =>
          typeof v === 'object' && v !== null && !Array.isArray(v) && 'zh' in v
            ? getLocalizedValue(v as Record<string, string>, locale)
            : v
        )
      }
    }
    return resolved
  })
}

/** 获取已解析为当前语言的配置（展示用） */
export function useLocalizedConfig(): LocalizedConfigType {
  const config = useConfig()
  const locale = useLocale()
  const { siteInfo } = config

  return {
    siteInfo: {
      ...siteInfo,
      brand_name: getLocalizedValue(siteInfo.brand_name, locale),
      tagline: getLocalizedValue(siteInfo.tagline, locale),
      hotline_contact: getLocalizedValue(siteInfo.hotline_contact, locale),
      // 首页
      home_intro_title: getLocalizedValue(siteInfo.home_intro_title, locale),
      home_intro_content: getLocalizedValue(siteInfo.home_intro_content, locale),
      home_cta_title: getLocalizedValue(siteInfo.home_cta_title, locale),
      home_cta_desc: getLocalizedValue(siteInfo.home_cta_desc, locale),
      // 关于页
      about_cta_title: getLocalizedValue(siteInfo.about_cta_title, locale),
      about_cta_desc: getLocalizedValue(siteInfo.about_cta_desc, locale),
      about_office_images: resolveArrayItems(siteInfo.about_office_images || [], locale),
      // 院校页
      universities_intro_title: getLocalizedValue(siteInfo.universities_intro_title, locale),
      universities_intro_desc: getLocalizedValue(siteInfo.universities_intro_desc, locale),
      universities_cta_title: getLocalizedValue(siteInfo.universities_cta_title, locale),
      universities_cta_desc: getLocalizedValue(siteInfo.universities_cta_desc, locale),
      // 案例页
      cases_intro_title: getLocalizedValue(siteInfo.cases_intro_title, locale),
      cases_intro_desc: getLocalizedValue(siteInfo.cases_intro_desc, locale),
      cases_cta_title: getLocalizedValue(siteInfo.cases_cta_title, locale),
      cases_cta_desc: getLocalizedValue(siteInfo.cases_cta_desc, locale),
      // 出国留学
      study_abroad_intro_title: getLocalizedValue(siteInfo.study_abroad_intro_title, locale),
      study_abroad_intro_desc: getLocalizedValue(siteInfo.study_abroad_intro_desc, locale),
      study_abroad_cta_title: getLocalizedValue(siteInfo.study_abroad_cta_title, locale),
      study_abroad_cta_desc: getLocalizedValue(siteInfo.study_abroad_cta_desc, locale),
      study_abroad_programs: resolveArrayItems(siteInfo.study_abroad_programs || [], locale),
      // 签证
      visa_cta_title: getLocalizedValue(siteInfo.visa_cta_title, locale),
      visa_cta_desc: getLocalizedValue(siteInfo.visa_cta_desc, locale),
      visa_process_steps: resolveArrayItems(siteInfo.visa_process_steps || [], locale),
      visa_required_docs: resolveArrayItems(siteInfo.visa_required_docs || [], locale),
      visa_timeline: resolveArrayItems(siteInfo.visa_timeline || [], locale),
      visa_tips: resolveArrayItems(siteInfo.visa_tips || [], locale),
      // 申请条件
      requirements_cta_title: getLocalizedValue(siteInfo.requirements_cta_title, locale),
      requirements_cta_desc: getLocalizedValue(siteInfo.requirements_cta_desc, locale),
      requirements_countries: resolveArrayItems(siteInfo.requirements_countries || [], locale),
      requirements_languages: resolveArrayItems(siteInfo.requirements_languages || [], locale),
      requirements_docs: resolveArrayItems(siteInfo.requirements_docs || [], locale),
      requirements_steps: resolveArrayItems(siteInfo.requirements_steps || [], locale),
      // 留学生活
      life_intro_title: getLocalizedValue(siteInfo.life_intro_title, locale),
      life_intro_desc: getLocalizedValue(siteInfo.life_intro_desc, locale),
      life_cta_title: getLocalizedValue(siteInfo.life_cta_title, locale),
      life_cta_desc: getLocalizedValue(siteInfo.life_cta_desc, locale),
      life_guide_cards: resolveArrayItems(siteInfo.life_guide_cards || [], locale),
      life_city_cards: resolveArrayItems(siteInfo.life_city_cards || [], locale),
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
      history_title: getLocalizedValue(config.aboutInfo.history_title, locale),
      history: getLocalizedValue(config.aboutInfo.history, locale),
      mission: getLocalizedValue(config.aboutInfo.mission, locale),
      vision: getLocalizedValue(config.aboutInfo.vision, locale),
      partnership: getLocalizedValue(config.aboutInfo.partnership, locale),
    },
    navConfig: config.navConfig,
    pageBanners: config.pageBanners,
  }
}
