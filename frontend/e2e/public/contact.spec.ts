import { test, expect } from "@playwright/test"

test.describe("联系我们", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/contact")
    await expect(page.locator("body")).toBeVisible()
  })
})
