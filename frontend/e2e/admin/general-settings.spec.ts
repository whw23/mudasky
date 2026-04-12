/**
 * 通用设置 E2E 测试。
 * 覆盖：页面加载、favicon 区域展示、国家码区域展示。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("通用设置", () => {
  test("页面加载并展示 favicon 和国家码区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/general-settings")
    const main = adminPage.locator("main")

    /* 页面标题 */
    await expect(main.getByRole("heading").first()).toBeVisible()

    /* favicon 区域 */
    await expect(main.getByText("Favicon")).toBeVisible()

    /* 国家码区域 */
    await expect(main.getByRole("heading", { name: /国家码/ })).toBeVisible()
  })
})
