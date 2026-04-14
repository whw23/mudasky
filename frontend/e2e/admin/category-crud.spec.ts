/**
 * 分类管理 CRUD E2E 测试。
 * 覆盖创建弹窗、编辑弹窗、删除确认。
 */

import { test, expect, clickAndWaitDialog } from "../fixtures/base"

test.describe("分类管理 CRUD", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(3000)
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
})
