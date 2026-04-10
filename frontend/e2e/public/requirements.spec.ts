import { test, expect } from "@playwright/test"

test.describe("申请条件", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/requirements")
    await expect(page.locator("body")).toBeVisible()
  })
})
