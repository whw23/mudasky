/**
 * 立即咨询按钮 E2E 测试。
 * 未登录点击弹出登录弹窗，已登录跳转关于页面。
 */

import { test, expect } from "@playwright/test"

test.describe("立即咨询按钮（未登录）", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("未登录点击弹出登录弹窗", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const ctaBtn = page.getByRole("button", { name: /立即咨询/ })
    await ctaBtn.scrollIntoViewIfNeeded()
    await ctaBtn.click()

    await expect(page.getByRole("dialog")).toBeVisible()
  })
})

test.describe("立即咨询按钮（已登录）", () => {
  test("已登录点击跳转关于页面", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const ctaBtn = page.getByRole("button", { name: /立即咨询/ })
    await ctaBtn.scrollIntoViewIfNeeded()
    await ctaBtn.click()

    await page.waitForURL(/\/about/)
    expect(page.url()).toContain("/about")
  })
})
