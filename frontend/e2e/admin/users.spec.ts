import { test, expect } from "../fixtures/base"

test.describe("用户管理", () => {
  test("展示用户列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/users")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
