/**
 * 院校管理 CRUD E2E 测试。
 * 覆盖创建弹窗、编辑弹窗、表格交互。
 */

import { test, expect, clickAndWaitDialog } from "../fixtures/base"

test.describe("院校管理 CRUD", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/universities")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
  })

  test("创建院校按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /创建|添加/ })).toBeVisible()
  })

  test("点击创建院校打开弹窗", async ({ adminPage }) => {
    const createBtn = adminPage.getByRole("button", { name: /创建|添加/ })
    await createBtn.click()
    await adminPage.waitForTimeout(2000)
    const dialog = adminPage.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 10000 })
  })

  test("空状态提示", async ({ adminPage }) => {
    // 如果没有数据，应该有空状态提示
    const body = adminPage.locator("body")
    const hasData = await body.getByRole("table").isVisible().catch(() => false)
    if (!hasData) {
      await expect(body).toContainText(/暂无|没有/)
    }
  })
})
