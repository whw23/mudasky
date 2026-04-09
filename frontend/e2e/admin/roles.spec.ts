/**
 * 角色管理 E2E 测试。
 * 覆盖：创建（含权限勾选）、编辑、删除。
 */

import { test, expect, gotoAdmin, clickAndWaitDialog } from "../fixtures/base"

const TS = Date.now()
const ROLE_NAME = `E2E角色${TS}`
const ROLE_NAME_EDITED = `E2E角色改${TS}`

test.describe("角色管理", () => {
  test("完整 CRUD 流程", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/roles")
    await expect(adminPage.getByRole("heading", { name: "角色管理" })).toBeVisible()

    /* === 反向测试：空名称 === */
    await clickAndWaitDialog(adminPage, "创建角色")
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await adminPage.waitForTimeout(500)
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    await adminPage.getByRole("dialog").getByRole("button", { name: "取消" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 30_000 })

    /* === 创建角色含权限 === */
    await clickAndWaitDialog(adminPage, "创建角色")
    await adminPage.getByPlaceholder("请输入角色名称").fill(ROLE_NAME)
    await adminPage.getByPlaceholder("请输入角色描述").fill("E2E测试描述")
    /* 勾选第一个权限 */
    const firstCheckbox = adminPage.getByRole("dialog").getByRole("checkbox").first()
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.click()
    }
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 30_000 })
    await expect(adminPage.getByText(ROLE_NAME)).toBeVisible({ timeout: 30_000 })

    /* === 编辑角色 === */
    const container = adminPage.getByText(ROLE_NAME).locator("..").locator("..")
    await container.getByRole("button", { name: "编辑" }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible({ timeout: 15_000 })
    const nameInput = adminPage.getByPlaceholder("请输入角色名称")
    await nameInput.clear()
    await nameInput.fill(ROLE_NAME_EDITED)
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 30_000 })
    await expect(adminPage.getByText(ROLE_NAME_EDITED)).toBeVisible({ timeout: 30_000 })

    /* === 删除角色 === */
    adminPage.on("dialog", (dialog) => dialog.accept())
    const delContainer = adminPage.getByText(ROLE_NAME_EDITED).locator("..").locator("..")
    await delContainer.getByRole("button", { name: "删除" }).click()
    await expect(adminPage.getByText(ROLE_NAME_EDITED)).toBeHidden({ timeout: 30_000 })
  })
})
