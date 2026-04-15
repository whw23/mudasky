/**
 * 退出登录 E2E 测试。
 * 验证退出后跳转到首页或显示登录按钮。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("退出登录", () => {
  test("点击退出后显示登录按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")

    const logoutBtn = adminPage.getByRole("button", { name: /退出/ })
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 })
    await logoutBtn.click()

    /* 退出后应显示登录/注册按钮 */
    await expect(adminPage.getByRole("button", { name: /登录/ })).toBeVisible({ timeout: 15_000 })
  })
})
