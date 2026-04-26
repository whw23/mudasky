'use client'

/**
 * 网页设置管理页面。
 * 通过预览容器展示公共网站各页面，配合编辑浮层和弹窗实现所见即所得编辑。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Upload, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { useConfig, useLocalizedConfig } from '@/contexts/ConfigContext'
import { Header } from '@/components/layout/Header'
import { CountryCodeEditor } from '@/components/admin/CountryCodeEditor'
import { Footer } from '@/components/layout/Footer'
import { PreviewContainer } from '@/components/admin/PreviewContainer'
import { PagePreview } from '@/components/admin/web-settings/PagePreview'
import { NavEditor } from '@/components/admin/web-settings/NavEditor'
import { ConfigEditDialog } from '@/components/admin/ConfigEditDialog'
import { BannerEditDialog } from '@/components/admin/web-settings/BannerEditDialog'
import type { SiteInfo, ContactItem, HomepageStat, AboutInfo, PageBanners } from '@/types/config'

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
  contactItems: ContactItem[]
  homepageStats: HomepageStat[]
  aboutInfo: AboutInfo
  pageBanners: PageBanners
}

/** 默认原始配置 */
const DEFAULT_RAW: RawConfig = {
  siteInfo: {
    brand_name: '', tagline: '', hotline: '', hotline_contact: '',
    logo_url: '', favicon_url: '', wechat_service_qr_url: '',
    wechat_official_qr_url: '', company_name: '', icp_filing: '',
  },
  contactItems: [],
  homepageStats: [],
  aboutInfo: {
    history_title: '', history: '',
  },
  pageBanners: {},
}

export default function WebSettingsPage() {
  const { refreshConfig } = useConfig()
  const { siteInfo: localizedSiteInfo } = useLocalizedConfig()
  const tHeader = useTranslations("Header")

  const [activeTab, setActiveTab] = useState<'preview' | 'advanced'>('preview')
  const [activePage, setActivePage] = useState('home')
  const [rawConfig, setRawConfig] = useState<RawConfig>(DEFAULT_RAW)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [bannerDialogState, setBannerDialogState] = useState<BannerDialogState | null>(null)
  const [loading, setLoading] = useState(true)
  const [faviconUploading, setFaviconUploading] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  /** 获取所有配置 */
  const fetchAllConfigs = useCallback(async (bustCache = false) => {
    try {
      const res = await api.get('/admin/web-settings/list', bustCache ? { headers: { 'Cache-Control': 'no-cache' } } : {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs = res.data as Array<{ key: string; value: any }>
      const findValue = (key: string) =>
        configs.find((c) => c.key === key)?.value

      setRawConfig({
        siteInfo: findValue('site_info') ?? DEFAULT_RAW.siteInfo,
        contactItems: findValue('contact_items') ?? DEFAULT_RAW.contactItems,
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
    await fetchAllConfigs(true)
    refreshConfig()
  }

  /** 处理 Header 编辑区域点击 */
  function handleHeaderEdit(section: string): void {
    switch (section) {
      case 'brand_name':
        setDialogState({
          open: true,
          title: '编辑品牌名称',
          fields: [
            { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
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

  /** Favicon 上传 */
  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFaviconUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/admin/web-settings/images/upload", formData)
      const updated = { ...rawConfig.siteInfo, favicon_url: data.url }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      await fetchAllConfigs(true)
      refreshConfig()
      toast.success("上传成功")
    } catch {
      toast.error("上传失败")
    } finally {
      setFaviconUploading(false)
      if (faviconInputRef.current) faviconInputRef.current.value = ""
    }
  }

  /** Favicon 清除 */
  async function handleFaviconClear() {
    try {
      const updated = { ...rawConfig.siteInfo, favicon_url: "" }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      await fetchAllConfigs(true)
      refreshConfig()
      toast.success("已清除")
    } catch {
      toast.error("清除失败")
    }
  }

  /** 处理 site_info 图片上传（Logo、二维码等） */
  async function handleSiteImageUpload(field: string, file: File): Promise<string | void> {
    try {
      const formData = new FormData()
      formData.append("file", file)
      const { data } = await api.post("/admin/web-settings/images/upload", formData)
      const updated = { ...rawConfig.siteInfo, [field]: data.url }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      fetchAllConfigs(true)
      refreshConfig()
      toast.success("上传成功")
      return data.url as string
    } catch {
      toast.error("上传失败")
    }
  }

  /** 处理 site_info 图片清除 */
  async function handleSiteImageClear(field: string): Promise<void> {
    try {
      const updated = { ...rawConfig.siteInfo, [field]: "" }
      await api.post("/admin/web-settings/list/edit", { key: "site_info", value: updated })
      await fetchAllConfigs(true)
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
      case 'phone': {
        const idx = rawConfig.contactItems.findIndex((i) => i.icon === 'phone')
        if (idx >= 0) {
          const item = rawConfig.contactItems[idx]
          setDialogState({
            open: true,
            title: '编辑电话',
            fields: [{ key: 'content', label: '电话', type: 'text' as const, localized: false }],
            configKey: 'contact_items',
            data: item,
            customSave: async (data) => {
              const updated = [...rawConfig.contactItems]
              updated[idx] = { ...item, ...data }
              await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
              toast.success('保存成功')
              await fetchAllConfigs(true)
              refreshConfig()
            },
          })
        }
        break
      }
      case 'email': {
        const idx = rawConfig.contactItems.findIndex((i) => i.icon === 'mail')
        if (idx >= 0) {
          const item = rawConfig.contactItems[idx]
          setDialogState({
            open: true,
            title: '编辑邮箱',
            fields: [{ key: 'content', label: '邮箱', type: 'text' as const, localized: false }],
            configKey: 'contact_items',
            data: item,
            customSave: async (data) => {
              const updated = [...rawConfig.contactItems]
              updated[idx] = { ...item, ...data }
              await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
              toast.success('保存成功')
              await fetchAllConfigs(true)
              refreshConfig()
            },
          })
        }
        break
      }
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

  /** 处理页面预览中的配置编辑（Header/统计/联系信息） */
  function handleEditConfig(section: string): void {
    switch (section) {
      case 'brand_name':
        setDialogState({
          open: true,
          title: '编辑品牌名称',
          fields: [{ key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
        })
        break
      case 'tagline':
        setDialogState({
          open: true,
          title: '编辑标语',
          fields: [{ key: 'tagline', label: '标语', type: 'text' as const, localized: true }],
          configKey: 'site_info',
          data: rawConfig.siteInfo,
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
      default:
        // contact_item_N 前缀处理联系信息条目
        if (section.startsWith('contact_item_')) {
          const idx = parseInt(section.replace('contact_item_', ''), 10)
          const item = rawConfig.contactItems[idx]
          if (item) {
            setDialogState({
              open: true,
              title: `编辑联系信息`,
              fields: [
                { key: 'label', label: '标签', type: 'text' as const, localized: true },
                { key: 'content', label: '内容', type: 'text' as const, localized: true },
              ],
              configKey: 'contact_items',
              data: item,
              customSave: async (data) => {
                const updated = [...rawConfig.contactItems]
                updated[idx] = { ...item, ...data }
                await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
                toast.success('保存成功')
                await fetchAllConfigs(true)
                refreshConfig()
              },
            })
          }
        }
        break
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  const faviconUrl = rawConfig.siteInfo.favicon_url

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 text-2xl font-bold">网页设置</h1>

      {/* 标签页 */}
      <div className="mb-4 flex gap-1 border-b">
        {([['preview', '页面预览'], ['advanced', '高级设置']] as const).map(([key, label]) => (
          <button key={key} type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(key)}
          >{label}</button>
        ))}
      </div>

      {/* 页面预览 tab */}
      {activeTab === 'preview' && (
        <div className="isolate flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-lg border bg-white shadow-sm [&_a]:pointer-events-none [&_.group]:pointer-events-auto">
          {/* 模拟浏览器标签栏 */}
          <div className="bg-[#dee1e6] px-2 pt-1.5 pb-0">
            <div className="group inline-flex items-center gap-2 rounded-t-md bg-white px-3 py-1.5 min-w-[160px] max-w-[220px] relative">
              <div className="relative shrink-0">
                <div
                  className={`flex size-4 cursor-pointer items-center justify-center rounded-sm transition-colors ${
                    faviconUrl ? "" : "border border-dashed border-muted-foreground/40 hover:border-primary/60"
                  } ${faviconUploading ? "opacity-50" : ""}`}
                  onClick={() => faviconInputRef.current?.click()}
                  title="点击更换网站图标"
                >
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="favicon" className="size-4 object-contain rounded-sm" />
                  ) : (
                    <Upload className="size-2.5 text-muted-foreground/60" />
                  )}
                </div>
                {faviconUrl && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleFaviconClear() }} title="清除图标"
                    className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Trash2 className="size-2" />
                  </button>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground truncate flex-1">
                {localizedSiteInfo.brand_name || '网站标题'}
              </span>
            </div>
          </div>
          <input ref={faviconInputRef} type="file" accept="image/*" className="hidden" onChange={handleFaviconUpload} />
          <Header
            editable
            hideNav
            onEdit={handleHeaderEdit}
            onImageUpload={handleSiteImageUpload}
            onImageClear={handleSiteImageClear}
          />
          <PreviewContainer className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 z-20 bg-white">
              <NavEditor activePage={activePage} onPageChange={setActivePage} />
            </div>
            <PagePreview activePage={activePage} onEditConfig={handleEditConfig} onBannerEdit={handleBannerEdit} />
          </PreviewContainer>
          <Footer editable onEdit={handleFooterEdit} onImageUpload={handleSiteImageUpload} onImageClear={handleSiteImageClear} />
        </div>
      )}

      {/* 高级设置 tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">手机号国家码</h2>
            <p className="text-sm text-muted-foreground">管理登录/注册页面可选的手机号国家码列表</p>
            <CountryCodeEditor />
          </section>
        </div>
      )}

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
          onUpdate={() => { fetchAllConfigs(true); refreshConfig() }}
        />
      )}

    </div>
  )
}
