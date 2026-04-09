import { test, expect } from "../fixtures/base"

test.describe("系统设置", () => {
  test("展示设置页面", async ({ adminPage }) => {
    await adminPage.goto("/admin/settings")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
