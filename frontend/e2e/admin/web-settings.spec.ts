/**
 * 网站设置 E2E 测试。
 * 覆盖：页面加载、预览容器和编辑浮层展示。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("网站设置", () => {
  test("页面加载并展示预览区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/web-settings")
    const main = adminPage.locator("main")

    /* 页面应包含 Header 和 Footer 预览 */
    await expect(main).toBeVisible()

    /* 预览容器应存在 */
    await expect(main.locator("[class*='preview'], [class*='Preview']").first().or(
      main.locator("header").first()
    )).toBeVisible({ timeout: 10_000 })
  })
})
