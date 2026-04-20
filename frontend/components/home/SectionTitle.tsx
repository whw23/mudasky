"use client"

/**
 * 通用节标题组件。
 * 从配置读取标题，翻译兜底。
 */

import { useLocalizedConfig } from "@/contexts/ConfigContext"

interface SectionTitleProps {
  configKey: "services_title" | "destinations_title"
  fallback: string
  className?: string
}

/** 从配置读取的节标题（翻译兜底） */
export function SectionTitle({ configKey, fallback, className }: SectionTitleProps) {
  const { siteInfo } = useLocalizedConfig()
  return <h3 className={className}>{siteInfo[configKey] || fallback}</h3>
}
