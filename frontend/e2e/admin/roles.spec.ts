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
    // 空名称提交后弹窗应仍可见（验证未通过）
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    await adminPage.getByRole("dialog").getByRole("button", { name: "取消" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()

    /* === 创建角色含权限（三栏面板） === */
    await clickAndWaitDialog(adminPage, "创建角色")
    await adminPage.getByPlaceholder("请输入角色名称").fill(ROLE_NAME)
    await adminPage.getByPlaceholder("请输入角色描述").fill("E2E测试描述")
    /* 三栏权限面板：点击第二栏"用户管理"，等待第三栏 API 列表加载，勾选权限 */
    const dialog = adminPage.getByRole("dialog")
    await dialog.getByText("用户管理").click()
    /* 等待第三栏出现 API 方法标签（GET/POST） */
    await dialog.getByText("GET").first().waitFor()
    /* 点击"全选"按钮勾选该页面所有 API */
    await dialog.getByRole("button", { name: "全选" }).click()
    await dialog.getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText(ROLE_NAME)).toBeVisible()

    /* === 编辑角色 === */
    const row = adminPage.locator("div.grid").filter({ hasText: ROLE_NAME }).first()
    await row.getByRole("button", { name: "编辑" }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible()
    const nameInput = adminPage.getByPlaceholder("请输入角色名称")
    await nameInput.clear()
    await nameInput.fill(ROLE_NAME_EDITED)
    await adminPage.getByRole("dialog").getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText(ROLE_NAME_EDITED)).toBeVisible()

    /* === 删除角色 === */
    adminPage.on("dialog", (dialog) => dialog.accept())
    const delRow = adminPage.locator("div.grid").filter({ hasText: ROLE_NAME_EDITED }).first()
    await delRow.getByRole("button", { name: "删除" }).click()
    await expect(adminPage.getByText(ROLE_NAME_EDITED)).toBeHidden()
  })

  test("权限树三栏交互", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/admin/roles")
    await clickAndWaitDialog(adminPage, "创建角色")
    const dialog = adminPage.getByRole("dialog")

    /* 面板栏应显示 admin 和 portal */
    await expect(dialog.getByText("管理后台")).toBeVisible()
    await expect(dialog.getByText("用户中心")).toBeVisible()

    /* 点击 admin 面板 */
    await dialog.getByText("管理后台").click()

    /* 页面栏应显示管理页面列表 */
    await expect(dialog.getByText("用户管理")).toBeVisible()

    /* 点击一个页面，第三栏显示 API 路由 */
    await dialog.getByText("用户管理").click()
    await expect(dialog.getByText("GET").first()).toBeVisible()

    /* 关闭弹窗 */
    await dialog.getByRole("button", { name: /取消/ }).click()
    await expect(dialog).toBeHidden()
  })
})
