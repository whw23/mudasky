'use client'

/**
 * 首页统计数字区块。
 * 从系统配置获取统计数据，支持管理后台动态修改。
 */

import { useLocalizedConfig } from '@/contexts/ConfigContext'

/** 首页统计区块 */
export function StatsSection() {
  const { homepageStats } = useLocalizedConfig()

  return (
    <section className="border-b bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
        {homepageStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
