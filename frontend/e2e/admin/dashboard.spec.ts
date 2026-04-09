import { test, expect } from "../fixtures/base"

test.describe("管理仪表盘", () => {
  test("展示统计数据", async ({ adminPage }) => {
    await adminPage.goto("/admin/dashboard")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
