'use client'

/**
 * 网页设置管理页面。
 * 通过预览容器展示公共网站各页面，配合编辑浮层和弹窗实现所见即所得编辑。
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useConfig } from '@/contexts/ConfigContext'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PagePreview } from '@/components/admin/web-settings/PagePreview'
import { NavEditor } from '@/components/admin/web-settings/NavEditor'
import { ConfigEditDialog } from '@/components/admin/ConfigEditDialog'
import { BannerEditDialog } from '@/components/admin/web-settings/BannerEditDialog'
import type { SiteInfo, ContactInfo, HomepageStat, AboutInfo, PageBanners } from '@/types/config'

/** 统计项编辑字段定义 */
const STAT_FIELDS = [
  { key: 'value', label: '数值', type: 'text' as const, localized: false },
  { key: 'label', label: '标签', type: 'text' as const, localized: true },
]

/** 弹窗状态类型 */
interface DialogState {
  open: boolean
  title: string
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'image'
    localized: boolean
    rows?: number
  }>
  configKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customSave?: (data: Record<string, any>) => Promise<void>
  defaultValues?: Record<string, string>
}

/** Banner 编辑弹窗状态 */
interface BannerDialogState {
  open: boolean
  pageKey: string
}

/** 原始配置数据类型 */
interface RawConfig {
  siteInfo: SiteInfo
  contactInfo: ContactInfo
  homepageStats: HomepageStat[]
  aboutInfo: AboutInfo
  pageBanners: PageBanners
}

/** 默认原始配置 */
const DEFAULT_RAW: RawConfig = {
  siteInfo: {
    brand_name: '', tagline: '', hotline: '', hotline_contact: '',
    logo_url: '', favicon_url: '', wechat_service_qr_url: '', wechat_official_qr_url: '', company_name: '', icp_filing: '',
  },
  contactInfo: {
    address: '', phone: '', email: '', wechat: '', registered_address: '',
  },
  homepageStats: [],
  aboutInfo: {
    history: '', mission: '', vision: '', partnership: '',
  },
  pageBanners: {},
}

export default function WebSettingsPage() {
  const { refreshConfig } = useConfig()
  const tHeader = useTranslations("Header")
  const tHome = useTranslations("Home")
  const tContact = useTranslations("Contact")
  const tAbout = useTranslations("About")
  const [activePage, setActivePage] = useState('home')
  const [rawConfig, setRawConfig] = useState<RawConfig>(DEFAULT_RAW)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [bannerDialogState, setBannerDialogState] = useState<BannerDialogState | null>(null)
  const [loading, setLoading] = useState(true)

  /** 获取所有配置 */
  const fetchAllConfigs = useCallback(async () => {
    try {
      const res = await api.get('/admin/web-settings/list')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs = res.data as Array<{ key: string; value: any }>
      const findValue = (key: string) =>
        configs.find((c) => c.key === key)?.value

      setRawConfig({
        siteInfo: findValue('site_info') ?? DEFAULT_RAW.siteInfo,
        contactInfo: findValue('contact_info') ?? DEFAULT_RAW.contactInfo,
        homepageStats: findValue('homepage_stats') ?? DEFAULT_RAW.homepageStats,
        aboutInfo: findValue('about_info') ?? DEFAULT_RAW.aboutInfo,
        pageBanners: findValue('page_banners') ?? DEFAULT_RAW.pageBanners,
      })
    } catch {
      toast.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllConfigs()
  }, [fetchAllConfigs])

  /** 通用保存处理 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSave(data: Record<string, any>): Promise<void> {
    if (dialogState?.customSave) {
      await dialogState.customSave(data)
      return
    }
    if (!dialogState) return
    await api.post("/admin/web-settings/list/edit", { key: dialogState.configKey, value: data })
    toast.success('保存成功')
    await fetchAllConfigs()
  }

  /** 处理 Header 编辑区域点击 */
  function handleHeaderEdit(section: string): void {
    switch (section) {
      case 'brand':
        setDialogState({
          open: true,
          title: '编辑品牌',
          fields: [
            { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
            { key: 'logo_url', label: 'Logo', type: 'image' as const, localized: false },
          ],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { brand_name: tHeader("brandName") },
        })
        break
      case 'tagline':
        setDialogState({
          open: true,
          title: '编辑标语',
          fields: [
            { key: 'tagline', label: '品牌标语', type: 'text' as const, localized: true },
          ],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { tagline: tHeader("tagline") },
        })
        break
      case 'hotline':
        setDialogState({
          open: true,
          title: '编辑热线',
          fields: [
            { key: 'hotline', label: '服务热线', type: 'text' as const, localized: false },
            { key: 'hotline_contact', label: '热线联系人', type: 'text' as const, localized: true },
          ],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
        })
        break
      default:
        break
    }
  }

  /** 处理 Footer 二维码上传 */
  async function handleFooterImageUpload(field: string, file: File): Promise<void> {
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/admin/web-settings/images/upload", formData)
      const updated = { ...rawConfig.siteInfo, [field]: data.url }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      await fetchAllConfigs()
      refreshConfig()
      toast.success("上传成功")
    } catch {
      toast.error("上传失败")
    }
  }

  /** 处理 Footer 二维码清除 */
  async function handleFooterImageClear(field: string): Promise<void> {
    try {
      const updated = { ...rawConfig.siteInfo, [field]: "" }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      await fetchAllConfigs()
      refreshConfig()
      toast.success("已清除")
    } catch {
      toast.error("清除失败")
    }
  }

  /** 处理 Footer 编辑区域点击 */
  function handleFooterEdit(section: string): void {
    switch (section) {
      case 'brand_name':
        setDialogState({
          open: true,
          title: '编辑品牌名称',
          fields: [{ key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { brand_name: tHeader("brandName") },
        })
        break
      case 'phone':
        setDialogState({
          open: true,
          title: '编辑电话',
          fields: [{ key: 'phone', label: '电话', type: 'text' as const, localized: false }],
          configKey: 'contact_info',
          data: rawConfig.contactInfo,
        })
        break
      case 'email':
        setDialogState({
          open: true,
          title: '编辑邮箱',
          fields: [{ key: 'email', label: '邮箱', type: 'text' as const, localized: false }],
          configKey: 'contact_info',
          data: rawConfig.contactInfo,
        })
        break
      case 'company':
        setDialogState({
          open: true,
          title: '编辑公司名称',
          fields: [{ key: 'company_name', label: '公司名称', type: 'text' as const, localized: false }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
        })
        break
      case 'icp':
        setDialogState({
          open: true,
          title: '编辑 ICP 备案',
          fields: [{ key: 'icp_filing', label: 'ICP备案号', type: 'text' as const, localized: false }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
        })
        break
      default:
        break
    }
  }

  /** 打开 Banner 编辑弹窗 */
  function handleBannerEdit(pageKey: string): void {
    setBannerDialogState({
      open: true,
      pageKey,
    })
  }

  /** 处理页面预览中的配置编辑 */
  function handleEditConfig(section: string): void {
    switch (section) {
      case 'hero_title':
        setDialogState({
          open: true,
          title: '编辑 Banner 标题',
          fields: [{ key: 'hero_title', label: '标题', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { hero_title: tHome("heroTitle") },
        })
        break
      case 'hero_subtitle':
        setDialogState({
          open: true,
          title: '编辑 Banner 副标题',
          fields: [{ key: 'hero_subtitle', label: '副标题', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { hero_subtitle: tHome("heroSubtitle") },
        })
        break
      case 'stats':
        setDialogState({
          open: true,
          title: '编辑统计数据',
          fields: STAT_FIELDS,
          configKey: 'homepage_stats',
          data: rawConfig.homepageStats[0] ?? { value: '', label: '' },
        })
        break
      case 'services_title':
        setDialogState({
          open: true,
          title: '编辑服务标题',
          fields: [{ key: 'services_title', label: '服务标题', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { services_title: tHome("servicesTitle") },
        })
        break
      case 'destinations_title':
        setDialogState({
          open: true,
          title: '编辑热门留学国家标题',
          fields: [{ key: 'destinations_title', label: '板块标题', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
          defaultValues: { destinations_title: tHome("destinationsTitle") },
        })
        break
      case 'about_history':
        setDialogState({
          open: true,
          title: '编辑公司历史',
          fields: [{ key: 'history', label: '公司历史', type: 'textarea' as const, localized: true, rows: 5 }],
          configKey: 'about_info',
          data: rawConfig.aboutInfo,
          defaultValues: { history: tAbout("historyContent") },
        })
        break
      case 'about_mission':
        setDialogState({
          open: true,
          title: '编辑使命',
          fields: [{ key: 'mission', label: '使命', type: 'textarea' as const, localized: true, rows: 5 }],
          configKey: 'about_info',
          data: rawConfig.aboutInfo,
          defaultValues: { mission: tAbout("missionContent") },
        })
        break
      case 'about_vision':
        setDialogState({
          open: true,
          title: '编辑愿景',
          fields: [{ key: 'vision', label: '愿景', type: 'textarea' as const, localized: true, rows: 5 }],
          configKey: 'about_info',
          data: rawConfig.aboutInfo,
          defaultValues: { vision: tAbout("visionContent") },
        })
        break
      case 'about_partnership':
        setDialogState({
          open: true,
          title: '编辑合作介绍',
          fields: [{ key: 'partnership', label: '合作介绍', type: 'textarea' as const, localized: true, rows: 5 }],
          configKey: 'about_info',
          data: rawConfig.aboutInfo,
          defaultValues: { partnership: tAbout("partnershipContent") },
        })
        break
      default:
        // contact_* prefix handles individual contact fields
        if (section.startsWith('contact_')) {
          const field = section.replace('contact_', '')
          const fieldDefs: Record<string, { label: string; localized: boolean; defaultKey?: string }> = {
            address: { label: '办公地址', localized: true, defaultKey: 'address' },
            phone: { label: '咨询热线', localized: false, defaultKey: 'phone' },
            email: { label: '电子邮箱', localized: false, defaultKey: 'email' },
            wechat: { label: '微信咨询', localized: false, defaultKey: 'wechat' },
            registered_address: { label: '注册地址', localized: true, defaultKey: 'registeredAddress' },
          }
          const def = fieldDefs[field]
          if (def) {
            setDialogState({
              open: true,
              title: `编辑${def.label}`,
              fields: [{ key: field, label: def.label, type: 'text' as const, localized: def.localized }],
              configKey: 'contact_info',
              data: rawConfig.contactInfo,
              defaultValues: def.defaultKey ? { [field]: tContact(def.defaultKey) } : undefined,
            })
          }
        }
        break
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold">网页设置</h1>

      {/* 预览容器 — 禁用链接跳转，编辑按钮可点击 */}
      <div className="isolate overflow-hidden rounded-lg border bg-white shadow-sm [&_a]:pointer-events-none [&_.group]:pointer-events-auto">
        <Header
          editable
          hideNav
          onEdit={handleHeaderEdit}
        />
        <NavEditor activePage={activePage} onPageChange={setActivePage} />
        <div className="max-h-[60vh] overflow-y-auto">
          <PagePreview activePage={activePage} onEditConfig={handleEditConfig} onBannerEdit={handleBannerEdit} />
        </div>
        <Footer editable onEdit={handleFooterEdit} onImageUpload={handleFooterImageUpload} onImageClear={handleFooterImageClear} />
      </div>

      {/* 配置编辑弹窗 */}
      {dialogState && (
        <ConfigEditDialog
          open={dialogState.open}
          onOpenChange={(open) => { if (!open) setDialogState(null) }}
          title={dialogState.title}
          fields={dialogState.fields}
          data={dialogState.data}
          onSave={handleSave}
          defaultValues={dialogState.defaultValues}
        />
      )}

      {/* Banner 编辑弹窗 */}
      {bannerDialogState && (
        <BannerEditDialog
          open={bannerDialogState.open}
          onOpenChange={(open) => { if (!open) setBannerDialogState(null) }}
          pageKey={bannerDialogState.pageKey}
          imageIds={rawConfig.pageBanners[bannerDialogState.pageKey]?.image_ids || []}
          onUpdate={fetchAllConfigs}
        />
      )}
    </div>
  )
}
