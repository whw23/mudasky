import { test, expect } from "../fixtures/base"

test.describe("院校管理", () => {
  test("展示院校列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/universities")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
