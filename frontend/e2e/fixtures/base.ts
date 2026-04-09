/**
 * E2E 测试共享 fixtures。
 * 提供已登录的管理员和普通用户页面。
 */

import { test as base, type Page } from "@playwright/test"

export const test = base.extend<{
  adminPage: Page
  userPage: Page
}>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/")
    await page.getByText("登录").click()
    await page.locator('input[name="phone"]').fill("mudasky")
    await page.locator('input[type="password"]').fill("mudasky@12321.")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/admin/**")
    await use(page)
    await context.close()
  },
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/")
    await page.getByText("登录").click()
    await page.locator('input[name="phone"]').fill("13800000001")
    await page.locator('input[type="password"]').fill("Test@12345")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/dashboard")
    await use(page)
    await context.close()
  },
})

export { expect } from "@playwright/test"
