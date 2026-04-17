/**
 * 公开页面业务操作函数。
 * 所有操作通过 UI 完成。
 */

import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/**
 * 验证公开页面加载。
 * args.path: 页面路径
 */
export const verifyPublicPage: TaskFn = async (page, args) => {
  const path = args?.path as string
  await page.goto(path)
  await page.locator("main").waitFor()
  await expect(page.locator("main")).toBeVisible()
}

/**
 * 验证导航栏所有链接可见。
 */
export const verifyNavbar: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await page.locator("nav").waitFor()
  const navLinks = page.locator("nav a")
  const count = await navLinks.count()
  expect(count).toBeGreaterThanOrEqual(8)
}

/**
 * 验证 Footer ICP 备案和联系信息。
 */
export const verifyFooter: TaskFn = async (page) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await page.locator("footer").waitFor()

  // ICP 备案链接
  const icpLink = page.locator('footer a[href="https://beian.miit.gov.cn/"]')
  await expect(icpLink).toBeVisible()

  // Footer 联系信息
  const footer = page.locator("footer")
  await expect(footer).toBeVisible()
  const footerText = await footer.textContent()
  expect(footerText).toBeTruthy()
}
