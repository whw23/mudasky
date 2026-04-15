/**
 * E2E 测试共享 fixtures。
 * 登录通过 globalSetup + storageState 处理。
 */

import { test as base, type Page } from "@playwright/test"

/**
 * 导航到页面并等待 Next.js dev 编译完成 + React 水合。
 * 通过监听 "Compiling..." 指示器消失来判断编译完成。
 */
export async function gotoAdmin(page: Page, pagePath: string) {
  await page.goto(pagePath, { waitUntil: "load", timeout: 60_000 })
  /* 等待 Next.js dev 编译完成 — "Compiling..." 指示器消失后再等 JS 执行 */
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Compiling"),
    { timeout: 60_000 },
  ).catch(() => {
    /* 如果没有 Compiling 指示器也不报错 */
  })
  await page.waitForLoadState("networkidle")
  /* 等待 main 区域渲染完成，替代固定等待 */
  await page.locator("main").waitFor({ timeout: 15_000 }).catch(() => {})
}

/**
 * 点击按钮并等待 dialog 出现。
 * 处理 JS 还未水合导致首次 click 无效的情况。
 */
export async function clickAndWaitDialog(page: Page, buttonName: string) {
  const btn = page.getByRole("button", { name: buttonName })
  const dialog = page.getByRole("dialog")

  for (let i = 0; i < 5; i++) {
    await btn.click()
    try {
      await dialog.waitFor({ timeout: 3_000 })
      return
    } catch {
      await page.waitForTimeout(1000)
    }
  }
  await btn.click()
  await dialog.waitFor({ timeout: 10_000 })
}

export const test = base.extend<{
  adminPage: Page
}>({
  adminPage: async ({ page }, use) => {
    await use(page)
  },
})

export { expect } from "@playwright/test"
