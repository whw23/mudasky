import { test, expect } from "../fixtures/base"

test.describe("我的文章", () => {
  test("可访问文章列表页", async ({ userPage }) => {
    await userPage.goto("/articles")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
