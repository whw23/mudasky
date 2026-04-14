/**
 * 学生管理 E2E 测试。
 * 覆盖：页面加载、学生列表展示、筛选功能。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("学生管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
  })

  test("页面加载并展示学生列表", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    await expect(main.getByRole("heading", { name: /学生管理/ })).toBeVisible()
    // 表格应该可见
    await expect(main.locator("table").or(main.locator("[class*='grid']"))).toBeVisible({ timeout: 10_000 })
  })

  test("默认筛选我的学生", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    // 检查 "仅我的学生" 复选框默认选中
    const checkbox = main.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await expect(checkbox).toBeChecked()
    }
  })

  test("取消筛选显示全部学生", async ({ adminPage }) => {
    const main = adminPage.locator("main")
    const checkbox = main.getByLabel(/仅我的学生/)
    if (await checkbox.isVisible()) {
      await checkbox.uncheck()
      await adminPage.waitForTimeout(1000)
      // 列表应该刷新
      await expect(main.locator("table").or(main.locator("[class*='grid']"))).toBeVisible()
    }
  })
})
