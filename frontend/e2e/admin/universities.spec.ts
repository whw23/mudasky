/**
 * 院校管理 E2E 测试。
 * 覆盖：CRUD 完整流程 + 反向验证。
 */

import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

const TS = Date.now()
const UNIV_NAME = `E2E院校${TS}`
const UNIV_NAME_EDITED = `E2E院校改${TS}`

test.describe("院校管理", () => {
  test("完整 CRUD 流程", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/universities")
    await expect(adminPage.getByRole("heading", { name: "院校管理" })).toBeVisible()

    /* === 反向测试：必填字段为空 === */
    await clickAndWaitDialog(adminPage, "添加院校")
    await adminPage.getByPlaceholder("请输入校名").fill("test")
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    await adminPage.getByRole("dialog").getByRole("button", { name: "取消" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()

    /* === 创建院校 === */
    await clickAndWaitDialog(adminPage, "添加院校")
    await adminPage.getByPlaceholder("请输入校名").fill(UNIV_NAME)
    await adminPage.getByPlaceholder("请输入国家").fill("日本")
    await adminPage.getByPlaceholder("请输入城市").fill("东京")
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText(UNIV_NAME)).toBeVisible({ timeout: 30_000 })

    /* === 编辑院校 === */
    const row = adminPage.locator("tr", { hasText: UNIV_NAME })
    await row.getByRole("button", { name: "编辑" }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 15_000 })
    const nameInput = adminPage.getByPlaceholder("请输入校名")
    await nameInput.clear()
    await nameInput.fill(UNIV_NAME_EDITED)
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText(UNIV_NAME_EDITED)).toBeVisible({ timeout: 30_000 })

    /* === 删除院校 === */
    adminPage.on("dialog", (dialog) => dialog.accept())
    const editedRow = adminPage.locator("tr", { hasText: UNIV_NAME_EDITED })
    await editedRow.getByRole("button", { name: "删除" }).click()
    await expect(adminPage.getByText(UNIV_NAME_EDITED)).toBeHidden({ timeout: 30_000 })
  })
})
