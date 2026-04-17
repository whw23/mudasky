/**
 * 权限验证业务操作函数。
 * 包含 UI 导航和 API 访问权限验证。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

const XHR = { "X-Requested-With": "XMLHttpRequest" }

/**
 * 验证用户可以访问指定路由。
 * args.routes: 路由数组
 */
export const verifyPermissionAllowed: TaskFn = async (page, args) => {
  const routes = args?.routes as string[]

  for (const route of routes) {
    await page.goto(route)
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  }
}

/**
 * 验证用户无法访问指定路由（被重定向或显示403）。
 * args.routes: 路由数组
 */
export const verifyPermissionDenied: TaskFn = async (page, args) => {
  const routes = args?.routes as string[]

  for (const route of routes) {
    await page.goto(route)
    await page.waitForURL(/.*/, { timeout: 10_000 })
    const url = page.url()

    // 不应停留在目标页面（被拦截）
    expect(
      url.includes(route) === false ||
      (await page.getByText(/无权限|403|权限不足/).isVisible().catch(() => false)),
    ).toBe(true)
  }
}

/**
 * 验证 API 端点返回 401/403。
 * args.endpoints: 端点数组
 */
export const verifyApiDenied: TaskFn = async (page, args) => {
  const endpoints = args?.endpoints as string[]

  for (const endpoint of endpoints) {
    const res = await page.request.get(endpoint, { headers: XHR })
    expect([401, 403]).toContain(res.status())
  }
}
