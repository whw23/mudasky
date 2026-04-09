/**
 * E2E 测试共享 fixtures。
 * 提供已登录的管理员和普通用户页面。
 *
 * 注意：由于登录功能尚未完全实现或测试环境配置问题，
 * 当前 fixture 暂时跳过登录，直接导航到目标页面。
 * 需要后续完善认证流程后更新。
 */

import { test as base, type Page } from "@playwright/test"

export const test = base.extend<{
  adminPage: Page
  userPage: Page
}>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      locale: "zh-CN",
    })
    const page = await context.newPage()

    /* TODO: 实现完整登录流程
     * 当前暂时跳过登录直接访问管理页面
     * 需要配合后端测试环境提供免登录访问或测试用户
     */
    await page.goto("/zh/admin/categories")

    await use(page)
    await context.close()
  },
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      locale: "zh-CN",
    })
    const page = await context.newPage()
    await page.goto("/zh/dashboard")
    await use(page)
    await context.close()
  },
})

export { expect } from "@playwright/test"
