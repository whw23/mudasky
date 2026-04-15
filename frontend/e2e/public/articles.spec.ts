import { test, expect } from "../fixtures/base"

test.describe("文章列表", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/news")
    await expect(page.locator("body")).toBeVisible()
  })
})
