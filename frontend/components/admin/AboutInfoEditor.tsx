'use client'

/**
 * 关于我们内容编辑器组件。
 * 管理员可编辑关于页面的公司历史、使命、愿景和合作内容。
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { AboutInfo } from '@/types/config'

/** 空白关于我们内容 */
const EMPTY_ABOUT: AboutInfo = {
  history: '',
  mission: '',
  vision: '',
  partnership: '',
}

/** 关于我们内容编辑器 */
export function AboutInfoEditor() {
  const t = useTranslations('AdminSettings')
  const [data, setData] = useState<AboutInfo>(EMPTY_ABOUT)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/config')
      .then((res) => {
        const config = res.data.find((c: any) => c.key === 'about_info')
        if (config?.value) {
          setData(config.value)
        }
      })
      .catch(() => toast.error(t('fetchError')))
      .finally(() => setLoading(false))
  }, [t])

  /** 更新字段 */
  function updateField(field: keyof AboutInfo, value: string): void {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  /** 保存 */
  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await api.put('/admin/config/about_info', { value: data })
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
        <CardTitle>{t('aboutInfo')}</CardTitle>
        <CardDescription>{t('aboutInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">{t('aboutHistory')}</label>
          <Textarea
            value={data.history}
            onChange={(e) => updateField('history', e.target.value)}
            placeholder={t('aboutHistoryPlaceholder')}
            rows={4}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('aboutMission')}</label>
          <Textarea
            value={data.mission}
            onChange={(e) => updateField('mission', e.target.value)}
            placeholder={t('aboutMissionPlaceholder')}
            rows={3}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('aboutVision')}</label>
          <Textarea
            value={data.vision}
            onChange={(e) => updateField('vision', e.target.value)}
            placeholder={t('aboutVisionPlaceholder')}
            rows={3}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t('aboutPartnership')}</label>
          <Textarea
            value={data.partnership}
            onChange={(e) => updateField('partnership', e.target.value)}
            placeholder={t('aboutPartnershipPlaceholder')}
            rows={4}
            className="mt-1"
          />
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
