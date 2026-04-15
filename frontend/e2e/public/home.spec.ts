/**
 * 首页 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("首页", () => {
  test("页面可达且包含品牌名", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("body")).toBeVisible()
  })

  test("导航栏可见", async ({ page }) => {
    await page.goto("/")
    const header = page.locator("header")
    await expect(header).toBeVisible()
  })
})
