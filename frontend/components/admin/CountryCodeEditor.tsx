'use client'

/**
 * 国家码编辑器组件。
 * 管理员可增删改系统支持的手机号国家码。
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { CountryCode } from '@/types/config'

/** 带内部 ID 的国家码项 */
type CountryCodeItem = CountryCode & { _id: number }

/** 国家码编辑器 */
export function CountryCodeEditor() {
  const t = useTranslations('AdminSettings')
  const [items, setItems] = useState<CountryCodeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const nextId = useRef(0)

  useEffect(() => {
    setLoading(true)
    api.get('/admin/general-settings/list')
      .then((res) => {
        const config = res.data.find((c: { key: string; value: unknown }) => c.key === 'phone_country_codes')
        if (config && Array.isArray(config.value)) {
          setItems(config.value.map((v: CountryCode) => ({ ...v, _id: nextId.current++ })))
        }
      })
      .catch(() => toast.error(t('fetchError')))
      .finally(() => setLoading(false))
  }, [t])

  /** 更新某行某字段 */
  function updateItem(index: number, field: keyof CountryCode, value: string | number | boolean): void {
    setItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  /** 添加空行 */
  function addItem(): void {
    setItems((prev) => [...prev, { code: '+', country: '', label: '', digits: 10, enabled: true, _id: nextId.current++ }])
  }

  /** 删除行 */
  function removeItem(index: number): void {
    const item = items[index]
    if (item.code && !confirm(t('deleteConfirm', { code: item.code }))) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  /** 保存 */
  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const payload = items.map(({ _id, ...rest }) => rest)
      await api.post('/admin/general-settings/edit/phone_country_codes', { value: payload })
      toast.success(t('saveSuccess'))
    } catch (err) {
      const message = err instanceof AxiosError ? err.response?.data?.message : null
      toast.error(message || t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('phoneCountryCodes')}</CardTitle>
        <CardDescription>{t('phoneCountryCodesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noData')}</p>
        ) : (
          <div className="space-y-2">
            {/* 表头 */}
            <div className="grid grid-cols-[50px_100px_80px_1fr_80px_40px] gap-2 text-xs font-medium text-muted-foreground">
              <span>{t('enabled')}</span>
              <span>{t('code')}</span>
              <span>{t('country')}</span>
              <span>{t('labelField')}</span>
              <span>{t('digits')}</span>
              <span />
            </div>
            {/* 数据行 */}
            {items.map((item, i) => (
              <div key={item._id} className="grid grid-cols-[50px_100px_80px_1fr_80px_40px] gap-2 items-center">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => updateItem(i, 'enabled', e.target.checked)}
                  className="size-4 accent-primary"
                />
                <Input
                  value={item.code}
                  onChange={(e) => updateItem(i, 'code', e.target.value)}
                  placeholder={t('codePlaceholder')}
                  className="h-8 text-sm"
                />
                <Input
                  value={item.country}
                  onChange={(e) => updateItem(i, 'country', e.target.value)}
                  placeholder={t('countryPlaceholder')}
                  className="h-8 text-sm"
                />
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(i, 'label', e.target.value)}
                  placeholder={t('labelPlaceholder')}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  value={item.digits}
                  onChange={(e) => updateItem(i, 'digits', parseInt(e.target.value) || 0)}
                  placeholder={t('digitsPlaceholder')}
                  className="h-8 text-sm"
                  min={6}
                  max={15}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 size-4" />
            {t('add')}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
