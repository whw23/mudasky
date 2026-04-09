import { test, expect } from "@playwright/test"

test.describe("留学生活", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/life")
    await expect(page.locator("body")).toBeVisible()
  })
})
