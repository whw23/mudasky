/**
 * 分类管理 E2E 测试。
 * 覆盖：CRUD 完整流程 + 反向验证。
 */

import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

const TS = Date.now()
const CAT_NAME = `E2E分类${TS}`
const CAT_SLUG = `e2e-cat-${TS}`
const CAT_NAME_EDITED = `E2E分类改${TS}`

test.describe("分类管理", () => {
  test("完整 CRUD 流程", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/categories")
    await expect(adminPage.getByRole("heading", { name: "分类管理" })).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "创建分类" })).toBeVisible()

    /* === 反向测试：空名称 === */
    await clickAndWaitDialog(adminPage, "创建分类")
    await adminPage.getByPlaceholder("分类标识").fill("empty-name")
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    await adminPage.getByRole("dialog").getByRole("button", { name: "取消" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()

    /* === 创建分类 === */
    await clickAndWaitDialog(adminPage, "创建分类")
    await adminPage.getByPlaceholder("分类名称").fill(CAT_NAME)
    await adminPage.getByPlaceholder("分类标识").fill(CAT_SLUG)
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText(CAT_NAME)).toBeVisible({ timeout: 30_000 })

    /* === 编辑分类 === */
    const row = adminPage.locator("tr", { hasText: CAT_NAME })
    await row.getByRole("button", { name: "编辑" }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    const nameInput = adminPage.getByPlaceholder("分类名称")
    await nameInput.clear()
    await nameInput.fill(CAT_NAME_EDITED)
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText(CAT_NAME_EDITED)).toBeVisible({ timeout: 30_000 })

    /* === 删除分类 === */
    adminPage.on("dialog", (dialog) => dialog.accept())
    const editedRow = adminPage.locator("tr", { hasText: CAT_NAME_EDITED })
    await editedRow.getByRole("button", { name: "删除" }).click()
    await expect(adminPage.getByText(CAT_NAME_EDITED)).toBeHidden({ timeout: 30_000 })
  })
})
