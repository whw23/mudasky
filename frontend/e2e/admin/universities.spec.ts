/**
 * 院校管理 E2E 测试。
 * 覆盖：创建、编辑、删除院校的完整 CRUD 流程。
 *
 * 注意：当前测试需要后端 API 可用且支持测试环境认证。
 * 如果 API 调用失败，dialog 将保持打开状态。
 */

import { test, expect } from "../fixtures/base"

test.describe("院校管理", () => {
  test("页面加载并展示创建按钮", async ({ adminPage }) => {
    await adminPage.goto("/admin/universities")
    await expect(adminPage.getByRole("heading", { name: "院校管理" })).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "添加院校" })).toBeVisible()
  })

  test("完整CRUD流程", async ({ adminPage }) => {
    await adminPage.goto("/admin/universities")

    // 创建院校
    await adminPage.getByRole("button", { name: "添加院校" }).click()
    await expect(adminPage.getByRole("dialog", { name: "添加院校" })).toBeVisible()

    await adminPage.getByPlaceholder("请输入校名").fill("E2E测试大学")
    await adminPage.getByPlaceholder("请输入国家").fill("日本")
    await adminPage.getByPlaceholder("请输入城市").fill("东京")

    await adminPage.getByRole("button", { name: "保存" }).click()

    // 等待创建完成 - dialog 应该关闭且数据出现在表格中
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 10000 })
    await expect(adminPage.getByText("E2E测试大学")).toBeVisible()

    // 编辑院校
    const row = adminPage.getByText("E2E测试大学").locator("..").locator("..")
    await row.getByRole("button", { name: /编辑/ }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible()

    const nameInput = adminPage.getByPlaceholder("请输入校名")
    await nameInput.clear()
    await nameInput.fill("E2E已修改大学")

    await adminPage.getByRole("button", { name: "保存" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden({ timeout: 10000 })
    await expect(adminPage.getByText("E2E已修改大学")).toBeVisible()

    // 删除院校 - 使用原生confirm对话框监听
    adminPage.once("dialog", (dialog) => dialog.accept())
    const editedRow = adminPage.getByText("E2E已修改大学").locator("..").locator("..")
    await editedRow.getByRole("button", { name: /删除/ }).click()

    // 等待删除完成 - 数据从表格中消失
    await expect(adminPage.getByText("E2E已修改大学")).toBeHidden({ timeout: 10000 })
  })
})
