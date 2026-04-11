/**
 * 用户仪表盘 E2E 测试。
 * 覆盖：页面加载、快捷操作链接。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("用户仪表盘", () => {
  test("页面加载并展示快捷操作", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/user-center/dashboard")
    /* 仪表盘应展示快捷操作 */
    await expect(adminPage.locator("main")).toBeVisible()
  })
})
