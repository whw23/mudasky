"use client"

/**
 * 公开页面 Header 包装器。
 * 所有页面透明覆盖 Banner。
 */

import { Header } from "./Header"

export function PublicHeader() {
  return <Header transparent />
}
