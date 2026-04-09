'use client'

/**
 * 品牌信息编辑器组件。
 * 管理员可编辑品牌名称、标语、热线等信息，并上传 Logo/Favicon/微信二维码。
 */

import { useEffect, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Upload, X } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { SiteInfo } from '@/types/config'

/** 空白品牌信息 */
const EMPTY_SITE_INFO: SiteInfo = {
  brand_name: '',
  brand_name_en: '',
  tagline: '',
  hotline: '',
  hotline_contact: '',
  logo_url: '',
  favicon_url: '',
  wechat_qr_url: '',
  icp_filing: '',
}

/** 图片上传字段配置 */
const IMAGE_FIELDS: Array<{ key: keyof SiteInfo; label: string }> = [
  { key: 'logo_url', label: 'Logo' },
  { key: 'favicon_url', label: 'Favicon' },
  { key: 'wechat_qr_url', label: '微信二维码' },
]

/** 品牌信息编辑器 */
export function SiteInfoEditor() {
  const t = useTranslations('AdminSettings')
  const [data, setData] = useState<SiteInfo>(EMPTY_SITE_INFO)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setLoading(true)
    api.get('/admin/config')
      .then((res) => {
        const config = res.data.find((c: any) => c.key === 'site_info')
        if (config?.value) {
          setData(config.value)
        }
      })
      .catch(() => toast.error(t('fetchError')))
      .finally(() => setLoading(false))
  }, [t])

  /** 更新字段 */
  function updateField(field: keyof SiteInfo, value: string): void {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  /** 上传图片并设置 URL */
  async function handleUpload(field: keyof SiteInfo, file: File): Promise<void> {
    setUploading(field)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', 'other')
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data.download_url || res.data.url || ''
      if (url) {
        setData((prev) => ({ ...prev, [field]: url }))
      }
    } catch {
      toast.error(t('saveError'))
    } finally {
      setUploading(null)
    }
  }

  /** 保存 */
  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await api.put('/admin/config/site_info', { value: data })
      toast.success(t('saveSuccess'))
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('siteInfo')}</CardTitle>
        <CardDescription>{t('siteInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">{t('brandName')}</label>
            <Input
              value={data.brand_name}
              onChange={(e) => updateField('brand_name', e.target.value)}
              placeholder="慕大国际教育"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('brandNameEn')}</label>
            <Input
              value={data.brand_name_en}
              onChange={(e) => updateField('brand_name_en', e.target.value)}
              placeholder="MUTU International Education"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t('tagline')}</label>
            <Input
              value={data.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="慕大国际教育 · 专注国际教育 专注出国服务"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('hotline')}</label>
            <Input
              value={data.hotline}
              onChange={(e) => updateField('hotline', e.target.value)}
              placeholder="189-1268-6656"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('hotlineContact')}</label>
            <Input
              value={data.hotline_contact}
              onChange={(e) => updateField('hotline_contact', e.target.value)}
              placeholder="吴老师"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t('icpFiling')}</label>
            <Input
              value={data.icp_filing}
              onChange={(e) => updateField('icp_filing', e.target.value)}
              placeholder="苏ICP备xxxxxxxx号"
              className="mt-1"
            />
          </div>
        </div>

        {/* 图片上传区域 */}
        <div className="grid gap-4 sm:grid-cols-3">
          {IMAGE_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium">{label}</label>
              <div className="mt-1 space-y-2">
                {data[key] ? (
                  <div className="relative inline-block">
                    <img
                      src={data[key]}
                      alt={label}
                      className="h-20 w-20 rounded border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => updateField(key, '')}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[key]?.click()}
                    disabled={uploading === key}
                    className="flex h-20 w-20 items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    {uploading === key ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <Upload className="size-5" />
                    )}
                  </button>
                )}
                <input
                  ref={(el) => { fileRefs.current[key] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(key, file)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
