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
  await page.locator("nav").waitFor()
  const navLinks = page.locator("nav a")
  const count = await navLinks.count()
  expect(count).toBeGreaterThanOrEqual(8)
}

/** 院校页面筛选（触发 provinces + cities API）。 */
export const filterUniversities: TaskFn = async (page) => {
  await page.goto("/universities")
  await page.locator("main").waitFor()

  const countrySelect = page.locator("main").getByRole("combobox")
  await countrySelect.first().click()

  const options = page.getByRole("option")
  await options.first().waitFor({ timeout: 10_000 })

  const count = await options.count()
  if (count <= 1) return

  const provincesResponse = page.waitForResponse(
    (r) => r.url().includes("/api/public/universities/provinces"),
    { timeout: 15_000 },
  )
  const citiesResponse = page.waitForResponse(
    (r) => r.url().includes("/api/public/universities/cities"),
    { timeout: 15_000 },
  )
  await options.nth(1).click()
  await Promise.all([provincesResponse, citiesResponse])
}

/**
 * 验证 Footer ICP 备案和联系信息。
 */
export const verifyFooter: TaskFn = async (page) => {
  await page.goto("/")
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
