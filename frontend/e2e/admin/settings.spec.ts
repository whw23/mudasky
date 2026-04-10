/**
 * 系统设置 E2E 测试。
 * 覆盖：页面加载、可视化预览展示。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("系统设置", () => {
  test("页面加载并展示设置内容", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/settings")
    await expect(adminPage.locator("main").getByRole("heading", { name: "系统设置" })).toBeVisible()

    /* 预览区域应包含页头和首页统计 */
    await expect(adminPage.locator("main").getByText("页头")).toBeVisible({ timeout: 15_000 })
    await expect(adminPage.locator("main").getByText("首页统计")).toBeVisible()
  })
})
