/**
 * 认证状态 E2E 测试。
 * 覆盖：已登录状态展示。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("认证状态", () => {
  test("已登录时显示退出按钮", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")
    await expect(adminPage.getByRole("button", { name: "退出" })).toBeVisible({ timeout: 15_000 })
  })
})
