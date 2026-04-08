'use client'

/**
 * 系统配置 Context。
 * 应用启动时获取配置并缓存，提供 useConfig hook。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/api'
import type { CountryCode } from '@/types/config'

/** 默认国家码（兜底） */
const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { code: '+86', country: '🇨🇳', label: '中国', digits: 11, enabled: true },
]

interface ConfigContextType {
  /** 启用的手机号国家码列表 */
  countryCodes: CountryCode[]
}

const ConfigContext = createContext<ConfigContextType>({
  countryCodes: DEFAULT_COUNTRY_CODES,
})

/** 系统配置 Provider */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>(DEFAULT_COUNTRY_CODES)

  useEffect(() => {
    api.get('/config/phone_country_codes')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          const enabled = res.data.value.filter((c: CountryCode) => c.enabled)
          setCountryCodes(enabled.length > 0 ? enabled : DEFAULT_COUNTRY_CODES)
        }
      })
      .catch(() => {
        // 请求失败时使用默认值，不阻塞渲染
      })
  }, [])

  return (
    <ConfigContext value={{ countryCodes }}>
      {children}
    </ConfigContext>
  )
}

/** 获取系统配置 */
export function useConfig(): ConfigContextType {
  return useContext(ConfigContext)
}
