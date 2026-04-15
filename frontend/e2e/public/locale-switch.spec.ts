/**
 * 语言切换 E2E 测试。
 * 验证切换语言后 URL 和页面内容变化。
 */

import { test, expect } from "../fixtures/base"

test.describe("语言切换", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("切换到英文后 URL 包含 /en", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const langSelect = page.locator("select").first()
    await langSelect.selectOption("en")

    await page.waitForURL(/\/en/)
    expect(page.url()).toContain("/en")
  })

  test("切换回中文", async ({ page }) => {
    await page.goto("/en")
    await page.waitForLoadState("networkidle")

    const langSelect = page.locator("select").first()
    await langSelect.selectOption("zh")

    /* 中文是默认 locale，URL 可能是 / 而不是 /zh/ */
    await page.waitForURL((url) => !url.pathname.startsWith("/en"))
    expect(page.url()).not.toContain("/en")
  })
})
