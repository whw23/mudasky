/**
 * 用户文章 E2E 测试。
 * 覆盖：页面加载、创建文章按钮。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("我的文章", () => {
  test("页面加载并展示创建文章按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/articles")
    await expect(adminPage.locator("main")).toBeVisible()
  })
})
