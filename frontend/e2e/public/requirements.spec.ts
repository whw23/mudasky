import { test, expect } from "../fixtures/base"

test.describe("申请条件", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/requirements")
    await expect(page.locator("body")).toBeVisible()
  })
})
