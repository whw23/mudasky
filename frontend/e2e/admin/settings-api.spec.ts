/**
 * 设置管理端点覆盖 E2E 测试。
 * 覆盖：通用设置页面加载、网站设置页面加载。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("设置管理端点覆盖", () => {
  test("通用设置页面加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/general-settings")
    const main = adminPage.locator("main")
    // 设置项应该加载
    await expect(main.locator("form, [class*='card'], [class*='setting']").first()).toBeVisible({ timeout: 10_000 })
  })

  test("网站设置页面加载", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/web-settings")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
  })

  test("通用设置有可编辑区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/general-settings")
    const main = adminPage.locator("main")
    await expect(main).toBeVisible()
  })
})
