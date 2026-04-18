/**
 * 获取手机号国家码列表的 Hook。
 * 从系统配置动态加载，提供默认值兜底。
 */

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import type { CountryCode } from '@/types/config'

/** 默认国家码列表 */
const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { code: '+86', country: '\u{1F1E8}\u{1F1F3}', label: '中国', digits: 11, enabled: true },
]

/**
 * 加载手机号国家码列表。
 * @returns 国家码数组
 */
export function useCountryCodes(): CountryCode[] {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>(DEFAULT_COUNTRY_CODES)

  useEffect(() => {
    api.get('/public/config/phone_country_codes')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          const enabled = res.data.value.filter((c: CountryCode) => c.enabled)
          if (enabled.length > 0) setCountryCodes(enabled)
        }
      })
      .catch(() => {})
  }, [])

  return countryCodes
}
