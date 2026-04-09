import { test, expect } from "../fixtures/base"

test.describe("文章管理", () => {
  test("展示文章列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
