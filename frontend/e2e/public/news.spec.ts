import { test, expect } from "../fixtures/base"

test.describe("新闻中心", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/news")
    await expect(page.locator("body")).toBeVisible()
  })
})
