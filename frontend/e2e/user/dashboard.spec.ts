import { test, expect } from "../fixtures/base"

test.describe("用户仪表盘", () => {
  test("登录后可访问仪表盘", async ({ userPage }) => {
    await userPage.goto("/dashboard")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
