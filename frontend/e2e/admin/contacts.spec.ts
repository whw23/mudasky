/**
 * 联系人管理 E2E 测试。
 * 覆盖：页面加载、联系人列表展示。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("联系人管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/contacts")
  })

  test("页面加载并展示联系人列表", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    await expect(main.getByRole("heading", { name: /联系人管理/ })).toBeVisible()
    await expect(main.locator("table").or(main.locator("[class*='grid']"))).toBeVisible({ timeout: 10_000 })
  })

  test("列表展示联系人信息", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    // 表格应有列头
    await adminPage.waitForTimeout(2000)
    await expect(main.locator("th, [role='columnheader']").first()).toBeVisible()
  })
})
