'use client'

/**
 * 面板配置 Context。
 * 仅在 admin/portal 面板中加载,首页不加载。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/api'

/** 面板页面配置项 */
interface PanelPage {
  key: string
  icon: string
  permissions?: string[]
}

/** 面板配置 */
export interface PanelConfig {
  admin: PanelPage[]
  portal: PanelPage[]
}

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  admin: [],
  portal: [],
}

const PanelConfigContext = createContext<PanelConfig>(DEFAULT_PANEL_CONFIG)

/** 面板配置 Provider */
export function PanelConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PanelConfig>(DEFAULT_PANEL_CONFIG)

  useEffect(() => {
    api.get('/public/panel-config')
      .then((res) => setConfig({ ...DEFAULT_PANEL_CONFIG, ...res.data.value }))
      .catch(() => {})
  }, [])

  return (
    <PanelConfigContext.Provider value={config}>
      {children}
    </PanelConfigContext.Provider>
  )
}

/** 获取面板配置 */
export function usePanelConfig(): PanelConfig {
  return useContext(PanelConfigContext)
}
