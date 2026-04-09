import { test, expect } from "../fixtures/base"

test.describe("个人信息", () => {
  test("可访问个人信息页", async ({ userPage }) => {
    await userPage.goto("/profile")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
