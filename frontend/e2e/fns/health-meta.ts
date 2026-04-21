/**
 * 鍋ュ悍妫�鏌ュ拰鍏冩暟鎹� API 鍑芥暟銆俓n * 瑙﹀彂 /api/health, /api/meta/routes, /api/version 绛夌��鐐广�俓n */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 触发健康检查端点（/api/health）。 */
export const checkHealth: TaskFn = async (page) => {
  const healthResponse = page.waitForResponse(
    (r) => r.url().includes("/api/health"),
    { timeout: 15_000 },
  )
  await page.evaluate(() => fetch("/api/health", { credentials: "omit" }))
  await healthResponse
}

/** 触发元数据路由端点（/api/meta/routes）。 */
export const fetchMetaRoutes: TaskFn = async (page) => {
  const metaResponse = page.waitForResponse(
    (r) => r.url().includes("/api/meta/routes"),
    { timeout: 15_000 },
  )
  await page.evaluate(() => fetch("/api/meta/routes"))
  await metaResponse
}

/** 触发版本端点（/api/version）。 */
export const fetchVersion: TaskFn = async (page) => {
  const versionResponse = page.waitForResponse(
    (r) => r.url().includes("/api/version"),
    { timeout: 15_000 },
  )
  await page.evaluate(() => fetch("/api/version", { credentials: "omit" }))
  await versionResponse
}
