"use client"

/**
 * 公开页面 Header 包装器。
 * 首页透明覆盖，其他页面默认样式。
 */

import { usePathname } from "@/i18n/navigation"
import { Header } from "./Header"

export function PublicHeader() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  return <Header transparent={isHome} />
}
