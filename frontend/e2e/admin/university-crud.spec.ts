/**
 * 院校管理 CRUD E2E 测试。
 * 覆盖创建弹窗、编辑弹窗、表格交互。
 */

import { test, expect, clickAndWaitDialog, gotoAdmin } from "../fixtures/base"

test.describe("院校管理 CRUD", () => {
  test.beforeEach(async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/universities")
  })

  test("创建院校按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /创建|添加/ })).toBeVisible()
  })

  test("点击创建院校打开弹窗", async ({ adminPage }) => {
    const createBtn = adminPage.getByRole("button", { name: /创建|添加/ })
    await createBtn.click()
    const dialog = adminPage.getByRole("dialog")
    await expect(dialog).toBeVisible()
  })

  test("空状态提示", async ({ adminPage }) => {
    // 如果没有数据，应该有空状态提示
    const body = adminPage.locator("body")
    const hasData = await body.getByRole("table").isVisible().catch(() => false)
    if (!hasData) {
      await expect(body).toContainText(/暂无|没有/)
    }
  })

  test("完整 CRUD 流程", async ({ adminPage }) => {
    const TS = Date.now()
    const NAME = `E2E院校${TS}`
    const EDITED = `E2E院校改${TS}`

    /* 创建 */
    const createBtn = adminPage.getByRole("button", { name: /创建|添加/ })
    await createBtn.click()
    const dialog = adminPage.getByRole("dialog")
    await expect(dialog).toBeVisible()
    const inputs = dialog.getByRole("textbox")
    await inputs.nth(0).fill(NAME)        /* name */
    await inputs.nth(2).fill("E2E国家")    /* country (跳过 nameEn) */
    await inputs.nth(4).fill("E2E城市")    /* city (跳过 province) */
    await dialog.getByRole("button", { name: /保存|确定/ }).click()
    await expect(dialog).toBeHidden()
    await expect(adminPage.getByText(NAME)).toBeVisible()

    /* 编辑 */
    const row = adminPage.locator("tr", { hasText: NAME })
    await row.getByRole("button", { name: /编辑/ }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    const editDialog = adminPage.getByRole("dialog")
    const editInputs = editDialog.getByRole("textbox")
    await editInputs.nth(0).clear()
    await editInputs.nth(0).fill(EDITED)
    await editDialog.getByRole("button", { name: /保存|确定/ }).click()
    await expect(editDialog).toBeHidden()
    await expect(adminPage.getByText(EDITED)).toBeVisible()

    /* 删除 */
    adminPage.on("dialog", (d) => d.accept())
    const delRow = adminPage.locator("tr", { hasText: EDITED })
    await delRow.getByRole("button", { name: /删除/ }).click()
    await expect(adminPage.getByText(EDITED)).toBeHidden()
  })
})
