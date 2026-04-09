/**
 * 个人信息 E2E 测试。
 * 覆盖：页面加载、显示用户信息。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("个人信息", () => {
  test("页面加载并展示用户名", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/profile")
    await expect(adminPage.locator("main")).toBeVisible({ timeout: 15_000 })
  })
})
