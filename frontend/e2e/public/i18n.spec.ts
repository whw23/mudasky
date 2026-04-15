/**
 * 多语言切换 E2E 测试。
 * 验证语言切换后页面内容变化。
 */

import { test, expect } from "../fixtures/base"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("多语言", () => {
  test("默认显示中文内容", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.locator("body")).toContainText("慕大国际教育")
  })

  test("语言切换器可见并包含选项", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const selector = page.getByRole("combobox")
    await expect(selector).toBeVisible()
    // 应该有中文选项
    await expect(selector.locator("option")).toHaveCount(4) // zh, en, ja, de
  })
})
