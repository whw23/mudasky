/**
 * E2E 测试共享 fixtures。
 * 登录通过 globalSetup + storageState 处理。
 * 页面编译通过 globalSetup 预热处理。
 */

import { test as base, type Page } from "@playwright/test"

/**
 * 导航到页面并等待 main 区域渲染。
 * 不加自定义超时 — 页面已在 globalSetup 中预热编译。
 */
export async function gotoAdmin(page: Page, pagePath: string) {
  await page.goto(pagePath)
  await page.locator("main").waitFor()
}

/**
 * 点击按钮并等待 dialog 出现。
 * 处理 JS 还未水合导致首次 click 无效的情况。
 */
export async function clickAndWaitDialog(page: Page, buttonName: string) {
  const btn = page.getByRole("button", { name: buttonName })
  const dialog = page.getByRole("dialog")

  for (let i = 0; i < 3; i++) {
    await btn.click()
    try {
      await dialog.waitFor({ timeout: 2_000 })
      return
    } catch {
      /* 水合未完成，重试 */
    }
  }
  await btn.click()
  await dialog.waitFor()
}

export const test = base.extend<{
  adminPage: Page
}>({
  adminPage: async ({ page }, use) => {
    await use(page)
  },
})

export { expect } from "@playwright/test"
