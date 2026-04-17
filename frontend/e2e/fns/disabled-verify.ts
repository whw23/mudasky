/**
 * 用户禁用/启用验证业务操作函数。
 *
 * 注意：这些函数使用 page.request 直接调用 API。
 * 这是合理的，因为需要在禁用状态下验证 API 响应，
 * 此时无法通过 UI 登录访问。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

const XHR = { "X-Requested-With": "XMLHttpRequest" }

/**
 * 验证用户被禁用后 API 返回 401。
 */
export const verifyDisabledApi: TaskFn = async (page) => {
  await page.goto("/")
  const res = await page.request.get("/api/portal/overview", { headers: XHR })
  // 禁用用户可能返回 401 或 403
  expect([401, 403]).toContain(res.status())
}

/**
 * 验证用户被启用后访问恢复。
 */
export const verifyEnabledApi: TaskFn = async (page) => {
  await page.goto("/")
  const res = await page.request.get("/api/portal/overview", { headers: XHR })
  expect(res.status()).toBe(200)
}
