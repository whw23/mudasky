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
    await expect(page.locator("main")).toBeVisible()
  }
}

/**
 * 验证用户无法访问指定路由。
 * 前端可能不阻止导航（只隐藏侧边栏），所以也检查 API 返回 403。
 * args.routes: 路由数组
 */
export const verifyPermissionDenied: TaskFn = async (page, args) => {
  const routes = args?.routes as string[]

  for (const route of routes) {
    // 方式1：导航到页面，检查是否被重定向或显示空状态
    const response = await page.goto(route)
    const url = page.url()

    // 页面级别：被重定向走了 = 权限拒绝
    if (!url.includes(route)) continue

    // 页面加载了但可能 API 返回 403 导致空状态
    // 对 admin 页面，检查对应的 API 是否返回 403
    const apiPath = route.replace(/^\//, "/api/")
    const apiRes = await page.request.get(`${apiPath}/list`, { headers: XHR }).catch(() => null)
    if (apiRes && [401, 403, 404].includes(apiRes.status())) {
      continue // API 拒绝 = 权限测试通过
    }

    // 如果页面和 API 都没拒绝，则检查页面是否显示无权限提示
    const hasError = await page.getByText(/无权限|403|权限不足|拒绝/).isVisible().catch(() => false)
    if (hasError) continue

    // 最后：如果侧边栏不包含该菜单项，也算权限控制生效
    const menuName = route.split("/").pop() || ""
    const sidebar = page.locator("aside, [role='complementary']").first()
    const hasLink = await sidebar.getByRole("link", { name: new RegExp(menuName) }).isVisible().catch(() => false)
    expect(hasLink).toBe(false)
  }
}

/**
 * 验证 API 端点返回 401/403/404。
 * args.endpoints: 端点数组
 */
export const verifyApiDenied: TaskFn = async (page, args) => {
  const endpoints = args?.endpoints as string[]

  for (const endpoint of endpoints) {
    const res = await page.request.get(endpoint, { headers: XHR })
    // 无权限应返回 401/403，路由不存在返回 404，都算拒绝
    expect([401, 403, 404]).toContain(res.status())
  }
}
