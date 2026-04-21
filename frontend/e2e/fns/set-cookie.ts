/**
 * 设置 internal_secret cookie。
 * 唯一一个不走 UI 的 fn，直接通过浏览器 API 设置 cookie。
 */

import type { Page } from "@playwright/test"

export default async function setCookie(page: Page): Promise<void> {
  const internalSecret = process.env.INTERNAL_SECRET || ""
  if (!internalSecret) {
    throw new Error("INTERNAL_SECRET 环境变量未设置")
  }

  const baseURL = process.env.BASE_URL || "http://localhost"
  const url = new URL(baseURL)

  await page.context().addCookies([
    {
      name: "internal_secret",
      value: internalSecret,
      url: url.origin,
    },
  ])
}
