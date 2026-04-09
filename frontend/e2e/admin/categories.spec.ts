import { test, expect } from "../fixtures/base"

test.describe("分类管理", () => {
  test("展示分类列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
