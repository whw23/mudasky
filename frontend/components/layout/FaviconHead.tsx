"use client"

/**
 * 动态 Favicon 组件。
 * 从 ConfigContext 读取 favicon_url，通过 DOM 设置 link[rel=icon]。
 */

import { useEffect } from "react"
import { useConfig } from "@/contexts/ConfigContext"

export function FaviconHead() {
  const { siteInfo } = useConfig()
  const faviconUrl = siteInfo.favicon_url

  useEffect(() => {
    if (!faviconUrl) return

    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [faviconUrl])

  return null
}
