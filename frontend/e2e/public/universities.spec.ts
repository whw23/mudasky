import { test, expect } from "../fixtures/base"

test.describe("院校列表", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/universities")
    await expect(page.locator("body")).toBeVisible()
  })
})
