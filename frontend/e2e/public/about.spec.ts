import { test, expect } from "@playwright/test"

test.describe("关于我们", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/about")
    await expect(page.locator("body")).toBeVisible()
  })
})
