'use client'

/**
 * 系统设置管理页面。
 * 可视化预览编辑模式：通过 Header/Footer/StatsSection/AboutContent 的真实渲染
 * 配合 EditableOverlay + ConfigEditDialog 实现所见即所得编辑。
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { StatsSection } from '@/components/home/StatsSection'
import {
  HistorySection,
  MissionVisionSection,
  PartnershipSection,
} from '@/components/about/AboutContent'
import { CountryCodeEditor } from '@/components/admin/CountryCodeEditor'
import { ConfigEditDialog } from '@/components/admin/ConfigEditDialog'
import type { SiteInfo, ContactInfo, HomepageStat, AboutInfo } from '@/types/config'

/** 品牌信息字段定义 */
const SITE_INFO_FIELDS = [
  { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
  { key: 'tagline', label: '品牌标语', type: 'text' as const, localized: true },
  { key: 'hotline', label: '服务热线', type: 'text' as const, localized: false },
  { key: 'hotline_contact', label: '热线联系人', type: 'text' as const, localized: true },
  { key: 'logo_url', label: 'Logo', type: 'image' as const, localized: false },
  { key: 'favicon_url', label: 'Favicon', type: 'image' as const, localized: false },
]

/** 联系方式字段定义 */
const CONTACT_FIELDS = [
  { key: 'address', label: '地址', type: 'text' as const, localized: true },
  { key: 'phone', label: '电话', type: 'text' as const, localized: false },
  { key: 'email', label: '邮箱', type: 'text' as const, localized: false },
  { key: 'wechat', label: '微信号', type: 'text' as const, localized: false },
  { key: 'office_hours', label: '办公时间', type: 'text' as const, localized: true },
  { key: 'wechat_qr_url', label: '微信二维码', type: 'image' as const, localized: false },
  { key: 'icp_filing', label: 'ICP备案号', type: 'text' as const, localized: false },
]

/** 统计项编辑字段定义 */
const STAT_FIELDS = [
  { key: 'value', label: '数值', type: 'text' as const, localized: false },
  { key: 'label', label: '标签', type: 'text' as const, localized: true },
]

/** 弹窗状态类型 */
interface DialogState {
  open: boolean
  title: string
  fields: Array<{ key: string; label: string; type: 'text' | 'textarea' | 'image'; localized: boolean; rows?: number }>
  configKey: string
  data: Record<string, any>
  /** 自定义保存逻辑（用于数组类型的统计项） */
  customSave?: (data: Record<string, any>) => Promise<void>
}

/** 原始配置数据类型 */
interface RawConfig {
  siteInfo: SiteInfo
  contactInfo: ContactInfo
  homepageStats: HomepageStat[]
  aboutInfo: AboutInfo
}

/** 默认原始配置 */
const DEFAULT_RAW: RawConfig = {
  siteInfo: {
    brand_name: '', tagline: '', hotline: '', hotline_contact: '',
    logo_url: '', favicon_url: '', wechat_qr_url: '', icp_filing: '',
  },
  contactInfo: {
    address: '', phone: '', email: '', wechat: '', office_hours: '',
  },
  homepageStats: [],
  aboutInfo: {
    history: '', mission: '', vision: '', partnership: '',
  },
}

export default function SettingsPage() {
  const [rawConfig, setRawConfig] = useState<RawConfig>(DEFAULT_RAW)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [loading, setLoading] = useState(true)

  /** 获取所有配置 */
  const fetchAllConfigs = useCallback(async () => {
    try {
      const res = await api.get('/admin/config')
      const configs = res.data as Array<{ key: string; value: any }>
      const findValue = (key: string) =>
        configs.find((c) => c.key === key)?.value

      setRawConfig({
        siteInfo: findValue('site_info') ?? DEFAULT_RAW.siteInfo,
        contactInfo: findValue('contact_info') ?? DEFAULT_RAW.contactInfo,
        homepageStats: findValue('homepage_stats') ?? DEFAULT_RAW.homepageStats,
        aboutInfo: findValue('about_info') ?? DEFAULT_RAW.aboutInfo,
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
  async function handleSave(data: Record<string, any>): Promise<void> {
    if (dialogState?.customSave) {
      await dialogState.customSave(data)
      return
    }
    if (!dialogState) return
    await api.put(`/admin/config/${dialogState.configKey}`, { value: data })
    toast.success('保存成功')
    await fetchAllConfigs()
  }

  /** 打开品牌信息编辑弹窗 */
  function openSiteInfoDialog(): void {
    setDialogState({
      open: true,
      title: '编辑网站信息',
      fields: SITE_INFO_FIELDS,
      configKey: 'site_info',
      data: rawConfig.siteInfo,
    })
  }

  /** 打开联系方式编辑弹窗 */
  function openContactDialog(): void {
    setDialogState({
      open: true,
      title: '编辑联系方式',
      fields: CONTACT_FIELDS,
      configKey: 'contact_info',
      data: { ...rawConfig.contactInfo, ...rawConfig.siteInfo },
    })
  }

  /** 打开统计项编辑弹窗 */
  function openStatDialog(index: number): void {
    const stat = rawConfig.homepageStats[index]
    if (!stat) return
    setDialogState({
      open: true,
      title: '编辑统计项',
      fields: STAT_FIELDS,
      configKey: 'homepage_stats',
      data: { value: stat.value, label: stat.label },
      customSave: async (data) => {
        const updated = [...rawConfig.homepageStats]
        updated[index] = { value: data.value, label: data.label }
        await api.put('/admin/config/homepage_stats', { value: updated })
        toast.success('保存成功')
        await fetchAllConfigs()
      },
    })
  }

  /** 添加统计项 */
  async function handleAddStat(): Promise<void> {
    const updated = [...rawConfig.homepageStats, { value: '', label: '' }]
    try {
      await api.put('/admin/config/homepage_stats', { value: updated })
      toast.success('已添加统计项')
      await fetchAllConfigs()
    } catch {
      toast.error('添加失败')
    }
  }

  /** 删除统计项 */
  async function handleDeleteStat(index: number): Promise<void> {
    const updated = rawConfig.homepageStats.filter((_, i) => i !== index)
    try {
      await api.put('/admin/config/homepage_stats', { value: updated })
      toast.success('已删除统计项')
      await fetchAllConfigs()
    } catch {
      toast.error('删除失败')
    }
  }

  /** 打开关于我们编辑弹窗（指定字段） */
  function openAboutDialog(field: keyof AboutInfo, title: string): void {
    setDialogState({
      open: true,
      title,
      fields: [
        { key: field, label: title, type: 'textarea' as const, localized: true, rows: 5 },
      ],
      configKey: 'about_info',
      data: rawConfig.aboutInfo,
    })
  }

  /** 处理 Footer 编辑区域点击 */
  function handleFooterEdit(section: string): void {
    if (section === 'contact') openContactDialog()
    else if (section === 'wechat_qr') openSiteInfoDialog()
    else if (section === 'icp') openSiteInfoDialog()
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">系统设置</h1>

      {/* 页头预览 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">页头</h2>
        <div className="rounded-lg border overflow-hidden">
          <Header editable onEdit={openSiteInfoDialog} />
        </div>
      </section>

      {/* 首页统计预览 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">首页统计</h2>
        <div className="rounded-lg border overflow-hidden">
          <StatsSection
            editable
            onEdit={openStatDialog}
            onAdd={handleAddStat}
            onDelete={handleDeleteStat}
          />
        </div>
      </section>

      {/* 关于我们预览 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">关于我们</h2>
        <div className="rounded-lg border p-6 space-y-6">
          <HistorySection
            editable
            onEdit={() => openAboutDialog('history', '编辑公司历史')}
          />
          <MissionVisionSection
            editable
            onEdit={() => openAboutDialog('mission', '编辑使命与愿景')}
          />
          <PartnershipSection
            editable
            onEdit={() => openAboutDialog('partnership', '编辑合作介绍')}
          />
        </div>
      </section>

      {/* 页脚预览 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">页脚</h2>
        <div className="rounded-lg border overflow-hidden">
          <Footer editable onEdit={handleFooterEdit} />
        </div>
      </section>

      {/* 国家码编辑器（保持原有表格） */}
      <CountryCodeEditor />

      {/* 配置编辑弹窗 */}
      {dialogState && (
        <ConfigEditDialog
          open={dialogState.open}
          onOpenChange={(open) => { if (!open) setDialogState(null) }}
          title={dialogState.title}
          fields={dialogState.fields}
          data={dialogState.data}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
