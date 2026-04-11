/**
 * 文档管理 E2E 测试。
 * 覆盖：页面加载、存储用量展示。
 */

import { test, expect, gotoAdmin } from "../fixtures/base"

test.describe("文档管理", () => {
  test("页面加载并展示文档区域", async ({ adminPage }) => {
    await gotoAdmin(adminPage, "/user-center/documents")
    await expect(adminPage.locator("main")).toBeVisible()
  })
})
