'use client'

/**
 * 首页统计数字编辑器组件。
 * 管理员可增删改首页展示的统计数据。
 */

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { HomepageStat } from '@/types/config'

/** 首页统计编辑器 */
export function HomepageStatsEditor() {
  const t = useTranslations('AdminSettings')
  const [items, setItems] = useState<HomepageStat[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/config')
      .then((res) => {
        const config = res.data.find((c: any) => c.key === 'homepage_stats')
        if (Array.isArray(config?.value)) {
          setItems(config.value)
        }
      })
      .catch(() => toast.error(t('fetchError')))
      .finally(() => setLoading(false))
  }, [t])

  /** 更新条目字段 */
  function updateItem(index: number, field: keyof HomepageStat, value: string): void {
    setItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  /** 添加条目 */
  function addItem(): void {
    setItems((prev) => [...prev, { value: '', label: '' }])
  }

  /** 删除条目 */
  function removeItem(index: number): void {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  /** 保存 */
  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      await api.put('/admin/config/homepage_stats', { value: items })
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
        <CardTitle>{t('homepageStats')}</CardTitle>
        <CardDescription>{t('homepageStatsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium">{t('statValue')}</label>
              <Input
                value={item.value}
                onChange={(e) => updateItem(index, 'value', e.target.value)}
                placeholder="15+"
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">{t('statLabel')}</label>
              <Input
                value={item.label}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
                placeholder="年办学经验"
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeItem(index)}
              className="mb-0.5"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 size-4" />
          {t('add')}
        </Button>

        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
