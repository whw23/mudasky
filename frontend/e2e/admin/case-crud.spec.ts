/**
 * 案例管理 CRUD E2E 测试。
 * 覆盖创建弹窗、表格交互。
 */

import { test, expect, clickAndWaitDialog } from "../fixtures/base"

test.describe("案例管理 CRUD", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
  })

  test("创建案例按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /创建|添加/ })).toBeVisible()
  })

  test("点击创建案例打开弹窗", async ({ adminPage }) => {
    const createBtn = adminPage.getByRole("button", { name: /创建|添加/ })
    await createBtn.click()
    await adminPage.waitForTimeout(2000)
    const dialog = adminPage.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 10000 })
  })

  test("空状态提示", async ({ adminPage }) => {
    const body = adminPage.locator("body")
    const hasTable = await body.getByRole("table").isVisible().catch(() => false)
    if (!hasTable) {
      await expect(body).toContainText(/暂无|没有/)
    }
  })
})
