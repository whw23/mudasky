import { test, expect } from "../fixtures/base"

test.describe("角色管理", () => {
  test("展示角色列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/roles")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
