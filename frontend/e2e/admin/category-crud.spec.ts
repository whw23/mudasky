/**
 * 分类管理 CRUD E2E 测试。
 * 覆盖创建弹窗、编辑弹窗、删除确认。
 */

import { test, expect, clickAndWaitDialog, gotoAdmin } from "../fixtures/base"

test.describe("分类管理 CRUD", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/categories")
  })

  test("创建分类按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /创建分类/ })).toBeVisible()
  })

  test("点击创建分类打开弹窗", async ({ adminPage }) => {
    await clickAndWaitDialog(adminPage, "创建分类")
    const dialog = adminPage.getByRole("dialog")
    await expect(dialog).toBeVisible()
  })

  test("创建分类弹窗包含必要字段", async ({ adminPage }) => {
    await clickAndWaitDialog(adminPage, "创建分类")
    const dialog = adminPage.getByRole("dialog")
    // 检查输入字段存在
    await expect(dialog.getByRole("textbox").first()).toBeVisible()
  })

  test("表格显示列头", async ({ adminPage }) => {
    await expect(adminPage.getByText("名称")).toBeVisible()
    await expect(adminPage.getByText("标识")).toBeVisible()
  })

  test("完整 CRUD 流程", async ({ adminPage }) => {
    const TS = Date.now()
    const NAME = `E2E分类${TS}`
    const EDITED = `E2E分类改${TS}`

    /* 创建 */
    await clickAndWaitDialog(adminPage, "创建分类")
    const dialog = adminPage.getByRole("dialog")
    const inputs = dialog.getByRole("textbox")
    await inputs.nth(0).fill(NAME)
    await inputs.nth(1).fill(`e2e-slug-${TS}`)
    await dialog.getByRole("button", { name: /保存|确定/ }).click()
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await expect(adminPage.getByText(NAME)).toBeVisible({ timeout: 10_000 })

    /* 编辑 */
    const row = adminPage.locator("tr", { hasText: NAME })
    await row.getByRole("button", { name: /编辑/ }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 10_000 })
    const editDialog = adminPage.getByRole("dialog")
    const editInputs = editDialog.getByRole("textbox")
    await editInputs.nth(0).clear()
    await editInputs.nth(0).fill(EDITED)
    await editInputs.nth(1).clear()
    await editInputs.nth(1).fill(`e2e-slug-edited-${TS}`)
    await editDialog.getByRole("button", { name: /保存|确定/ }).click()
    await expect(editDialog).toBeHidden({ timeout: 15_000 })
    await expect(adminPage.getByText(EDITED)).toBeVisible({ timeout: 10_000 })

    /* 删除 */
    adminPage.on("dialog", (d) => d.accept())
    const delRow = adminPage.locator("tr", { hasText: EDITED })
    await delRow.getByRole("button", { name: /删除/ }).click()
    await expect(adminPage.getByText(EDITED)).toBeHidden({ timeout: 15_000 })
  })
})
