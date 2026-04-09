import { test, expect } from "../fixtures/base"

test.describe("案例管理", () => {
  test("展示案例列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
