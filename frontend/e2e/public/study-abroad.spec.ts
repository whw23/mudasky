import { test, expect } from "../fixtures/base"

test.describe("留学指南", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/study-abroad")
    await expect(page.locator("body")).toBeVisible()
  })
})
