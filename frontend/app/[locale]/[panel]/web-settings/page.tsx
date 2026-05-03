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
import { ItemEditDialog, type FieldDefinition as ItemFieldDef } from '@/components/admin/ItemEditDialog'
import { BannerEditDialog } from '@/components/admin/web-settings/BannerEditDialog'
import type { SiteInfo, ContactItem, HomepageStat, AboutInfo, PageBanners } from '@/types/config'

/** 统计项编辑字段定义 */
const STAT_FIELDS = [
  { key: 'value', label: '数值', type: 'text' as const, localized: false },
  { key: 'label', label: '标签', type: 'text' as const, localized: true },
]

/** 联系条目编辑字段定义 */
const CONTACT_ITEM_FIELDS: ItemFieldDef[] = [
  { key: 'icon', label: '图标', type: 'icon', localized: false },
  { key: 'label', label: '标签', type: 'text', localized: true, required: true },
  { key: 'content', label: '内容', type: 'text', localized: true, required: true },
  { key: 'image_id', label: '图片', type: 'image', localized: false, description: '如二维码图片' },
  {
    key: 'hover_zoom', label: '悬浮放大', type: 'switch', localized: false,
    description: '鼠标 hover 时放大显示图片',
    showWhen: (data) => !!data.image_id,
  },
]

/** 介绍区块编辑字段定义 */
const INTRO_FIELDS: ItemFieldDef[] = [
  { key: "content", label: "内容", type: "textarea", localized: true, required: true },
]

/** 行动号召区块编辑字段定义 */
const CTA_FIELDS: ItemFieldDef[] = [
  { key: "title", label: "标题", type: "text", localized: true, required: true },
  { key: "desc", label: "描述", type: "textarea", localized: true },
]

/** card_grid 各 cardType 的字段定义 */
const CARD_GRID_FIELDS: Record<string, ItemFieldDef[]> = {
  guide: [
    { key: "icon", label: "图标", type: "icon", localized: false },
    { key: "title", label: "标题", type: "text", localized: true, required: true },
    { key: "desc", label: "描述", type: "textarea", localized: true },
  ],
  timeline: [
    { key: "title", label: "标题", type: "text", localized: true, required: true },
    { key: "time", label: "时间", type: "text", localized: true },
    { key: "desc", label: "描述", type: "text", localized: true },
  ],
  city: [
    { key: "image_id", label: "图片", type: "image", localized: false },
    { key: "city", label: "城市", type: "text", localized: true, required: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true },
  ],
  program: [
    { key: "name", label: "项目名称", type: "text", localized: true, required: true },
    { key: "country", label: "国家", type: "text", localized: true },
    { key: "desc", label: "描述", type: "textarea", localized: true },
    { key: "features", label: "特点列表", type: "textarea", localized: true, description: "每行一个特点" },
  ],
  checklist: [
    { key: "icon", label: "图标", type: "icon", localized: false },
    { key: "label", label: "标签", type: "text", localized: true, required: true },
    { key: "items", label: "条目列表", type: "textarea", localized: true, description: "每行一个条目" },
  ],
}

/** card_grid cardType 中文名 */
const CARD_TYPE_LABELS: Record<string, string> = {
  guide: "指南卡片", timeline: "时间线", city: "城市指南",
  program: "专业卡片", checklist: "检查清单",
}

/** ItemEditDialog 弹窗状态 */
interface ItemDialogState {
  open: boolean
  title: string
  subtitle?: string
  fields: ItemFieldDef[]
  data: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  sourceHint?: string
}

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
  const { refreshConfig, pageBlocks } = useConfig()
  const { siteInfo: localizedSiteInfo } = useLocalizedConfig()
  const tHeader = useTranslations("Header")

  const [activeTab, setActiveTab] = useState<'preview' | 'advanced'>('preview')
  const [activePage, setActivePage] = useState('home')
  const [rawConfig, setRawConfig] = useState<RawConfig>(DEFAULT_RAW)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [itemDialogState, setItemDialogState] = useState<ItemDialogState | null>(null)
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
    if (dialogState.configKey === "site_info") {
      await syncSiteInfoToContactItems(data)
    }
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
      await syncQrIfNeeded(field, data.url)
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
      await syncQrIfNeeded(field, "")
      await fetchAllConfigs(true)
      refreshConfig()
      toast.success("已清除")
    } catch {
      toast.error("清除失败")
    }
  }

  /** site_info 字段 → contact_items 图标的映射（图片同步） */
  const QR_SYNC_MAP: Record<string, string> = {
    wechat_service_qr_url: "message-circle",
    wechat_official_qr_url: "qr-code",
  }

  /** contact_items 图标 → site_info 字段的映射（内容/图片同步） */
  const CONTACT_SITE_SYNC: Record<string, { content?: string; image?: string }> = {
    phone: { content: "hotline" },
    "message-circle": { image: "wechat_service_qr_url" },
    "qr-code": { image: "wechat_official_qr_url" },
  }

  /** site_info 保存后同步到 contact_items */
  async function syncSiteInfoToContactItems(newSiteInfo: Record<string, any>): Promise<void> {
    let updated = [...rawConfig.contactItems]
    let changed = false
    // 热线同步
    if (newSiteInfo.hotline !== rawConfig.siteInfo.hotline) {
      updated = updated.map((ci: any) => {
        if (ci.icon !== "phone") return ci
        const content = typeof ci.content === "object" ? { ...ci.content } : { zh: ci.content ?? "" }
        content.zh = newSiteInfo.hotline ?? ""
        return { ...ci, content }
      })
      changed = true
    }
    // 二维码同步
    for (const [urlField, iconName] of Object.entries(QR_SYNC_MAP)) {
      if (newSiteInfo[urlField] !== (rawConfig.siteInfo as any)[urlField]) {
        const imageId = newSiteInfo[urlField]?.includes("id=") ? newSiteInfo[urlField].split("id=")[1] : null
        updated = updated.map((ci: any) => ci.icon === iconName ? { ...ci, image_id: imageId } : ci)
        changed = true
      }
    }
    if (changed) {
      await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
    }
  }

  /** site_info 图片字段变更时同步到 contact_items */
  async function syncQrIfNeeded(field: string, qrUrl: string): Promise<void> {
    const iconName = QR_SYNC_MAP[field]
    if (!iconName) return
    const imageId = qrUrl?.includes("id=") ? qrUrl.split("id=")[1] : null
    const updated = rawConfig.contactItems.map((ci: any) =>
      ci.icon === iconName ? { ...ci, image_id: imageId } : ci,
    )
    await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
  }

  /** 全局 contact_item 保存后同步到 site_info */
  async function syncContactItemToSiteInfo(
    icon: string,
    newData: Record<string, unknown>,
    oldData: Record<string, unknown>,
  ): Promise<void> {
    const sync = CONTACT_SITE_SYNC[icon]
    if (!sync) return
    const updates: Record<string, unknown> = {}
    if (sync.content) {
      const newContent = typeof newData.content === "object" ? (newData.content as any)?.zh : newData.content
      const oldContent = typeof oldData.content === "object" ? (oldData.content as any)?.zh : oldData.content
      if (newContent !== oldContent) updates[sync.content] = newContent ?? ""
    }
    if (sync.image && newData.image_id !== oldData.image_id) {
      updates[sync.image] = newData.image_id ? `/api/public/images/detail?id=${newData.image_id}` : ""
    }
    if (Object.keys(updates).length > 0) {
      await api.post("/admin/web-settings/list/edit", {
        key: "site_info",
        value: { ...rawConfig.siteInfo, ...updates },
      })
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
            fields: [{ key: 'content', label: '电话号码', type: 'text' as const, localized: true }],
            configKey: 'contact_items',
            data: item,
            customSave: async (data) => {
              const updated = [...rawConfig.contactItems]
              updated[idx] = { ...item, ...data }
              await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
              await syncContactItemToSiteInfo(item.icon, { ...item, ...data }, item)
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
            fields: [{ key: 'content', label: '邮箱地址', type: 'text' as const, localized: true }],
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
  async function handleEditConfig(section: string): Promise<void> {
    // 介绍区块编辑
    if (section.startsWith('intro_edit_')) {
      const blockId = section.replace('intro_edit_', '')
      const currentBlocks = pageBlocks[activePage] ?? []
      const block = currentBlocks.find((b) => b.id === blockId)
      if (block) {
        setItemDialogState({
          open: true,
          title: '编辑介绍',
          subtitle: '编辑配置项，中文字段为必填。',
          fields: INTRO_FIELDS,
          data: block.data ?? {},
          onSave: async (data) => {
            const updatedBlock = { ...block, data: { ...block.data, ...data } }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            await api.post("/admin/web-settings/list/edit", {
              key: "page_blocks", value: { ...pageBlocks, [activePage]: updatedBlocks }
            })
            toast.success('保存成功')
            await fetchAllConfigs(true)
            refreshConfig()
          },
        })
      }
      return
    }

    // 行动号召区块编辑
    if (section.startsWith('cta_edit_')) {
      const blockId = section.replace('cta_edit_', '')
      const currentBlocks = pageBlocks[activePage] ?? []
      const block = currentBlocks.find((b) => b.id === blockId)
      if (block) {
        setItemDialogState({
          open: true,
          title: '编辑行动号召',
          subtitle: '编辑配置项，中文字段为必填。',
          fields: CTA_FIELDS,
          data: block.data ?? {},
          onSave: async (data) => {
            const updatedBlock = { ...block, data: { ...block.data, ...data } }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            await api.post("/admin/web-settings/list/edit", {
              key: "page_blocks", value: { ...pageBlocks, [activePage]: updatedBlocks }
            })
            toast.success('保存成功')
            await fetchAllConfigs(true)
            refreshConfig()
          },
        })
      }
      return
    }

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
        if (section.startsWith('contact_item_global_')) {
          // 编辑全局条目（共享数据）
          const globalId = section.replace('contact_item_global_', '')
          const idx = rawConfig.contactItems.findIndex((i: any) => i.id === globalId)
          const item = rawConfig.contactItems[idx]
          if (item) {
            setItemDialogState({
              open: true,
              title: '编辑联系信息',
              subtitle: '编辑配置项，中文字段为必填。',
              fields: CONTACT_ITEM_FIELDS,
              data: item,
              sourceHint: '此条目为共享数据，修改将影响 Footer、关于我们等页面。',
              onSave: async (data) => {
                const updated = [...rawConfig.contactItems]
                updated[idx] = { ...item, ...data }
                await api.post("/admin/web-settings/list/edit", { key: "contact_items", value: updated })
                await syncContactItemToSiteInfo(item.icon, data, item)
                toast.success('保存成功')
                await fetchAllConfigs(true)
                refreshConfig()
              },
            })
          }
        } else if (section.startsWith('contact_item_custom_')) {
          // 编辑自定义条目
          const rest = section.replace('contact_item_custom_', '')
          const sepIdx = rest.lastIndexOf('_')
          const blockId = rest.substring(0, sepIdx)
          const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block?.data?.items?.[itemIndex]?.type === 'custom') {
            const customItem = block.data.items[itemIndex]
            setItemDialogState({
              open: true,
              title: '编辑自定义条目',
              subtitle: '编辑配置项，中文字段为必填。',
              fields: CONTACT_ITEM_FIELDS,
              data: customItem,
              onSave: async (data) => {
                const updatedItems = [...block.data.items]
                updatedItems[itemIndex] = { ...customItem, ...data }
                const updatedBlock = { ...block, data: { items: updatedItems } }
                const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
                const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
                await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
                toast.success('保存成功')
                await fetchAllConfigs(true)
                refreshConfig()
              },
            })
          }
        } else if (section.startsWith('contact_item_delete_')) {
          // 删除条目
          const rest = section.replace('contact_item_delete_', '')
          const sepIdx = rest.lastIndexOf('_')
          const blockId = rest.substring(0, sepIdx)
          const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block) {
            const currentItems: any[] = block.data?.items ?? rawConfig.contactItems.map((g: any) => ({ type: "global", id: g.id }))
            const updatedItems = currentItems.filter((_: any, i: number) => i !== itemIndex)
            const updatedBlock = { ...block, data: { items: updatedItems } }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
            await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
            toast.success('已移除条目')
            await fetchAllConfigs(true)
            refreshConfig()
          }
        } else if (section.startsWith('contact_item_reorder_')) {
          // 拖动排序
          const parts = section.replace('contact_item_reorder_', '').split('_')
          const blockId = parts.slice(0, -2).join('_')
          const fromIdx = parseInt(parts[parts.length - 2], 10)
          const toIdx = parseInt(parts[parts.length - 1], 10)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block) {
            const currentItems: any[] = block.data?.items ?? rawConfig.contactItems.map((g: any) => ({ type: "global", id: g.id }))
            const reordered = [...currentItems]
            const [moved] = reordered.splice(fromIdx, 1)
            reordered.splice(toIdx, 0, moved)
            const updatedBlock = { ...block, data: { items: reordered } }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
            await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
            await fetchAllConfigs(true)
            refreshConfig()
          }
        } else if (section.startsWith('contact_item_add_global_')) {
          // 添加全局引用
          const rest = section.replace('contact_item_add_global_', '')
          const sepIdx = rest.indexOf('_')
          const blockId = rest.substring(0, sepIdx)
          const globalId = rest.substring(sepIdx + 1)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block) {
            const currentItems: any[] = block.data?.items ?? rawConfig.contactItems.map((g: any) => ({ type: "global", id: g.id }))
            const updatedItems = [...currentItems, { type: "global", id: globalId }]
            const updatedBlock = { ...block, data: { items: updatedItems } }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
            await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
            toast.success('已添加条目')
            await fetchAllConfigs(true)
            refreshConfig()
          }
        } else if (section.startsWith('contact_item_add_custom_')) {
          // 添加自定义条目
          const blockId = section.replace('contact_item_add_custom_', '')
          setItemDialogState({
            open: true,
            title: '添加自定义条目',
            subtitle: '填写新条目信息，中文字段为必填。',
            fields: CONTACT_ITEM_FIELDS,
            data: { icon: 'info', label: '', content: '', image_id: null, hover_zoom: false },
            onSave: async (data) => {
              const currentBlocks = pageBlocks[activePage] ?? []
              const block = currentBlocks.find((b) => b.id === blockId)
              if (!block) return
              const currentItems: any[] = block.data?.items ?? rawConfig.contactItems.map((g: any) => ({ type: "global", id: g.id }))
              const newItem = { type: "custom" as const, icon: data.icon || 'info', ...data }
              const updatedItems = [...currentItems, newItem]
              const updatedBlock = { ...block, data: { items: updatedItems } }
              const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
              const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
              await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
              toast.success('已添加自定义条目')
              await fetchAllConfigs(true)
              refreshConfig()
            },
          })
        } else if (section.startsWith('card_grid_item_')) {
          // 编辑 card_grid 卡片
          const rest = section.replace('card_grid_item_', '')
          const sepIdx = rest.lastIndexOf('_')
          const blockId = rest.substring(0, sepIdx)
          const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block && block.type === 'card_grid') {
            const cardType = block.options?.cardType || 'guide'
            const fields = CARD_GRID_FIELDS[cardType] || CARD_GRID_FIELDS.guide
            const cards: any[] = Array.isArray(block.data) ? block.data : []
            const card = cards[itemIndex] || {}
            // 转换嵌套数组字段为 textarea (features/items)
            const dataForDialog = { ...card }
            if (cardType === 'program' && Array.isArray(card.features)) {
              dataForDialog.features = card.features.map((f: any) => (typeof f === 'object' ? f.zh : f) || '').join('\n')
            }
            if (cardType === 'checklist' && Array.isArray(card.items)) {
              dataForDialog.items = card.items.map((it: any) => (typeof it === 'object' ? it.zh : it) || '').join('\n')
            }
            setItemDialogState({
              open: true,
              title: `编辑${CARD_TYPE_LABELS[cardType]} ${itemIndex + 1}`,
              subtitle: '编辑卡片内容，中文字段为必填。',
              fields,
              data: dataForDialog,
              onSave: async (data) => {
                // 转换 textarea 为嵌套数组
                const savedData = { ...data }
                if (cardType === 'program' && typeof data.features === 'string') {
                  savedData.features = data.features
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => ({ zh: line }))
                }
                if (cardType === 'checklist' && typeof data.items === 'string') {
                  savedData.items = data.items
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => ({ zh: line }))
                }
                const updatedCards = [...cards]
                updatedCards[itemIndex] = { ...cards[itemIndex], ...savedData }
                const updatedBlock = { ...block, data: updatedCards }
                const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
                const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
                await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
                toast.success('保存成功')
                await fetchAllConfigs(true)
                refreshConfig()
              },
            })
          }
        } else if (section.startsWith('card_grid_delete_')) {
          // 删除 card_grid 卡片
          const rest = section.replace('card_grid_delete_', '')
          const sepIdx = rest.lastIndexOf('_')
          const blockId = rest.substring(0, sepIdx)
          const itemIndex = parseInt(rest.substring(sepIdx + 1), 10)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block) {
            const cards: any[] = Array.isArray(block.data) ? block.data : []
            const updatedCards = cards.filter((_, i) => i !== itemIndex)
            const updatedBlock = { ...block, data: updatedCards }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
            await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
            toast.success('已删除卡片')
            await fetchAllConfigs(true)
            refreshConfig()
          }
        } else if (section.startsWith('card_grid_reorder_')) {
          // card_grid 拖动排序
          const parts = section.replace('card_grid_reorder_', '').split('_')
          const blockId = parts.slice(0, -2).join('_')
          const fromIdx = parseInt(parts[parts.length - 2], 10)
          const toIdx = parseInt(parts[parts.length - 1], 10)
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block) {
            const cards: any[] = Array.isArray(block.data) ? block.data : []
            const reordered = [...cards]
            const [moved] = reordered.splice(fromIdx, 1)
            reordered.splice(toIdx, 0, moved)
            const updatedBlock = { ...block, data: reordered }
            const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
            const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
            await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
            await fetchAllConfigs(true)
            refreshConfig()
          }
        } else if (section.startsWith('card_grid_add_')) {
          // 添加 card_grid 卡片
          const blockId = section.replace('card_grid_add_', '')
          const currentBlocks = pageBlocks[activePage] ?? []
          const block = currentBlocks.find((b) => b.id === blockId)
          if (block && block.type === 'card_grid') {
            const cardType = block.options?.cardType || 'guide'
            const fields = CARD_GRID_FIELDS[cardType] || CARD_GRID_FIELDS.guide
            const emptyCard: any = {}
            for (const f of fields) {
              if (f.key === 'features' || f.key === 'items') emptyCard[f.key] = ''
              else if (f.type === 'icon') emptyCard[f.key] = 'circle'
              else emptyCard[f.key] = ''
            }
            setItemDialogState({
              open: true,
              title: `添加${CARD_TYPE_LABELS[cardType]}`,
              subtitle: '填写卡片内容，中文字段为必填。',
              fields,
              data: emptyCard,
              onSave: async (data) => {
                const savedData = { ...data }
                if (cardType === 'program' && typeof data.features === 'string') {
                  savedData.features = data.features
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => ({ zh: line }))
                }
                if (cardType === 'checklist' && typeof data.items === 'string') {
                  savedData.items = data.items
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => ({ zh: line }))
                }
                const cards: any[] = Array.isArray(block.data) ? block.data : []
                const updatedCards = [...cards, savedData]
                const updatedBlock = { ...block, data: updatedCards }
                const updatedBlocks = currentBlocks.map((b) => b.id === blockId ? updatedBlock : b)
                const allPageBlocks = { ...pageBlocks, [activePage]: updatedBlocks }
                await api.post("/admin/web-settings/list/edit", { key: "page_blocks", value: allPageBlocks })
                toast.success('已添加卡片')
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
    <div>
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
        <div className="isolate overflow-clip rounded-lg border bg-white shadow-sm">
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
          <div className="sticky top-0 z-20 bg-white shadow-sm">
            <NavEditor activePage={activePage} onPageChange={setActivePage} />
          </div>
          <PreviewContainer>
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

      {/* 条目编辑弹窗（联系信息等） */}
      {itemDialogState && (
        <ItemEditDialog
          open={itemDialogState.open}
          onOpenChange={(open) => { if (!open) setItemDialogState(null) }}
          title={itemDialogState.title}
          subtitle={itemDialogState.subtitle}
          fields={itemDialogState.fields}
          data={itemDialogState.data}
          onSave={itemDialogState.onSave}
          sourceHint={itemDialogState.sourceHint}
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
