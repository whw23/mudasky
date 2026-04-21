/**
 * 刷新 token（赋权后更新 JWT）。
 * 加载 target worker 的 storageState，打开新 context，触发 token refresh，保存更新的 storageState。
 */

import { chromium } from "@playwright/test"
import type { Page } from "@playwright/test"
import { getAuthFile } from "../constants"

export default async function refreshToken(
  page: Page,
  args?: Record<string, unknown>,
): Promise<void> {
  const worker = args?.worker as string

  if (!worker) {
    throw new Error("refreshToken fn 需要 worker 参数")
  }

  const authFile = getAuthFile(worker)
  const baseURL = process.env.BASE_URL || "http://localhost"

  // 启动新浏览器（不使用传入的 page，因为需要独立的 context）
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ storageState: authFile })
  const newPage = await ctx.newPage()

  try {
    // 导航到首页触发 auth interceptor
    await newPage.goto(baseURL)

    // 使用 page.evaluate + fetch 调用 refresh 接口（让浏览器处理 Set-Cookie）
    await newPage.evaluate(async () => {
      await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      })
    })

    // 保存更新后的 storageState
    await ctx.storageState({ path: authFile })
  } finally {
    await browser.close()
  }
}
