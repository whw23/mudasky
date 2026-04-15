import { test, expect } from "../fixtures/base"

test.describe("签证服务", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/visa")
    await expect(page.locator("body")).toBeVisible()
  })
})
