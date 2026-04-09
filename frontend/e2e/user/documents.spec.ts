import { test, expect } from "../fixtures/base"

test.describe("文档管理", () => {
  test("可访问文档页", async ({ userPage }) => {
    await userPage.goto("/documents")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
