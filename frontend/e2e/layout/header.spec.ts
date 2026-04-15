/**
 * Header 交互 E2E 测试。
 * 覆盖用户名显示、管理后台入口、导航栏高亮。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("Header 交互（已登录）", () => {
  test("显示用户名和管理后台入口", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")
    await expect(adminPage.getByText("mudasky")).toBeVisible()
    await expect(adminPage.getByText("管理后台")).toBeVisible()
  })

  test("管理后台链接跳转", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/")
    await adminPage.getByText("管理后台").click()
    await adminPage.waitForURL(/\/admin/)
    expect(adminPage.url()).toContain("/admin")
  })
})

test.describe("Header 交互（未登录）", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("未登录显示登录/注册按钮", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByRole("button", { name: /登录/ })).toBeVisible()
  })
})
