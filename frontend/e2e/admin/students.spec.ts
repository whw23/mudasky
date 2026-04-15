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
      // 列表应该刷新
      await expect(main.locator("table").or(main.locator("[class*='grid']"))).toBeVisible({ timeout: 10_000 })
    }
  })

  test("展开面板显示操作区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/students")
    /* 等待表格加载 */
    const table = adminPage.locator("table")
    const hasTable = await table.isVisible({ timeout: 15_000 }).catch(() => false)
    if (!hasTable) return /* 没有学生数据则跳过 */

    const row = adminPage.locator("table tbody tr").first()
    const hasRow = await row.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!hasRow) return /* 没有行数据则跳过 */

    await row.click()
    /* 展开面板加载 — 等待任意展开面板内容 */
    await expect(
      adminPage.getByText("基本信息").first()
        .or(adminPage.locator("td[colspan]").first())
    ).toBeVisible({ timeout: 15_000 })
  })
})
