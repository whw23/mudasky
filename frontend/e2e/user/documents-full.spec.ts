/**
 * 文档管理全面 E2E 测试。
 * 覆盖页面加载、上传区域、存储空间显示。
 */

import { test, expect } from "../fixtures/base"

test.describe("文档管理", () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto("/portal/documents")
    await adminPage.waitForLoadState("networkidle")
    await adminPage.waitForTimeout(2000)
  })

  test("页面加载显示文档管理标题", async ({ adminPage }) => {
    await expect(adminPage.getByRole("heading", { name: /文档/ })).toBeVisible()
  })

  test("显示存储空间信息", async ({ adminPage }) => {
    // 应该显示存储用量
    await expect(adminPage.locator("body")).toContainText(/存储|MB|KB/)
  })

  test("上传按钮可见", async ({ adminPage }) => {
    await expect(adminPage.getByRole("button", { name: /上传/ })).toBeVisible()
  })
})
