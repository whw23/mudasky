'use client'

/**
 * 联系方式编辑器组件。
 * 管理员可编辑系统联系方式配置。
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { ContactInfo } from '@/types/config'

/** 空白联系方式 */
const EMPTY_CONTACT: ContactInfo = {
  address: '',
  phone: '',
  email: '',
  wechat: '',
  office_hours: '',
}

/** 联系方式编辑器 */
export function ContactInfoEditor() {
  const t = useTranslations('AdminSettings')
  const [data, setData] = useState<ContactInfo>(EMPTY_CONTACT)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/config')
      .then((res) => {
        const config = res.data.find((c: any) => c.key === 'contact_info')
        if (config?.value) {
          setData(config.value)
        }
      })
      .catch(() => toast.error(t('fetchError')))
      .finally(() => setLoading(false))
  }, [t])

  /** 更新字段 */
  function updateField(field: keyof ContactInfo, value: string): void {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  /** 保存 */
  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await api.put('/admin/config/contact_info', { value: data })
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
        <CardTitle>{t('contactInfo')}</CardTitle>
        <CardDescription>{t('contactInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">{t('contactAddress')}</label>
            <Input
              value={data.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder={t('contactAddressPlaceholder')}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('contactPhone')}</label>
            <Input
              value={data.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder={t('contactPhonePlaceholder')}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('contactEmail')}</label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={t('contactEmailPlaceholder')}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('contactWechat')}</label>
            <Input
              value={data.wechat}
              onChange={(e) => updateField('wechat', e.target.value)}
              placeholder={t('contactWechatPlaceholder')}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t('contactOfficeHours')}</label>
            <Input
              value={data.office_hours}
              onChange={(e) => updateField('office_hours', e.target.value)}
              placeholder={t('contactOfficeHoursPlaceholder')}
              className="mt-1"
            />
          </div>
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
