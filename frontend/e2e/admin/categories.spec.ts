/**
 * 分类管理 E2E 测试。
 * 覆盖：创建、编辑、删除分类的完整 CRUD 流程。
 */

import { test, expect } from "../fixtures/base"

test.describe("分类管理", () => {
  test("页面加载并展示表格", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")
    await expect(adminPage.getByRole("heading", { name: "分类管理" })).toBeVisible()
    await expect(adminPage.getByRole("button", { name: "创建分类" })).toBeVisible()
  })

  test("创建分类完整流程", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")

    /* 点击创建按钮 */
    await adminPage.getByRole("button", { name: "创建分类" }).click()

    /* 等待对话框出现 */
    await expect(adminPage.getByRole("dialog")).toBeVisible()

    /* 填写表单 */
    await adminPage.getByPlaceholder("分类名称").fill("E2E测试分类")
    await adminPage.getByPlaceholder("分类标识").fill("e2e-test-category")

    /* 点击保存 */
    await adminPage.getByRole("button", { name: "保存" }).click()

    /* 验证对话框关闭 */
    await expect(adminPage.getByRole("dialog")).toBeHidden()

    /* 验证新分类出现在列表中 */
    await expect(adminPage.getByText("E2E测试分类")).toBeVisible()
    await expect(adminPage.getByText("e2e-test-category")).toBeVisible()
  })

  test("编辑分类", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")

    /* 等待列表加载，找到之前创建的分类行 */
    await expect(adminPage.getByText("E2E测试分类")).toBeVisible()

    /* 点击编辑按钮（同行的操作按钮） */
    const row = adminPage.getByText("E2E测试分类").locator("..").locator("..")
    await row.getByRole("button", { name: /编辑/ }).click()

    /* 等待对话框 */
    await expect(adminPage.getByRole("dialog")).toBeVisible()

    /* 修改名称 */
    const nameInput = adminPage.getByPlaceholder("分类名称")
    await nameInput.clear()
    await nameInput.fill("E2E已修改分类")

    /* 保存 */
    await adminPage.getByRole("button", { name: "保存" }).click()

    /* 验证修改生效 */
    await expect(adminPage.getByRole("dialog")).toBeHidden()
    await expect(adminPage.getByText("E2E已修改分类")).toBeVisible()
  })

  test("删除分类", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")

    /* 等待列表加载 */
    await expect(adminPage.getByText("E2E已修改分类")).toBeVisible()

    /* 点击删除按钮 */
    const row = adminPage.getByText("E2E已修改分类").locator("..").locator("..")
    await row.getByRole("button", { name: /删除/ }).click()

    /* 确认删除对话框（如有） */
    const confirmBtn = adminPage.getByRole("button", { name: /确认|确定|删除/ }).last()
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click()
    }

    /* 验证分类从列表消失 */
    await expect(adminPage.getByText("E2E已修改分类")).toBeHidden()
  })

  test("创建分类时名称不能为空", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")
    await adminPage.getByRole("button", { name: "创建分类" }).click()
    await expect(adminPage.getByRole("dialog")).toBeVisible()

    /* 不填名称直接保存 */
    await adminPage.getByPlaceholder("分类标识").fill("empty-name-test")
    await adminPage.getByRole("button", { name: "保存" }).click()

    /* 对话框应该仍然打开（验证不通过） */
    await expect(adminPage.getByRole("dialog")).toBeVisible()

    /* 取消关闭 */
    await adminPage.getByRole("button", { name: "取消" }).click()
    await expect(adminPage.getByRole("dialog")).toBeHidden()
  })
})
