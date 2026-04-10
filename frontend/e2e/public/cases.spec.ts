import { test, expect } from "@playwright/test"

test.describe("成功案例", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/cases")
    await expect(page.locator("body")).toBeVisible()
  })
})
