/**
 * 管理仪表盘 E2E 测试。
 * 覆盖：页面加载、统计卡片展示、快捷操作链接。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("管理仪表盘", () => {
  test("页面加载并展示统计卡片和快捷操作", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/dashboard")
    await expect(adminPage.locator("main").getByRole("heading").first()).toBeVisible()

    /* 快捷操作 */
    await expect(adminPage.locator("main").getByText("快捷操作")).toBeVisible()
    await expect(adminPage.locator("main").getByText("用户管理")).toBeVisible()
    await expect(adminPage.locator("main").getByText("系统设置")).toBeVisible()
  })

  test("快捷操作链接可点击导航", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/dashboard")

    await adminPage.locator("main").getByText("用户管理").click()
    await expect(adminPage).toHaveURL(/admin\/users/)
  })

  test("统计卡片显示数字", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/dashboard")
    const main = adminPage.locator("main")
    /* 统计卡片应显示数字 */
    await expect(main.locator("text=/\\d+/").first()).toBeVisible()
  })

})
