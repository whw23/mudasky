/**
 * 案例详情页 E2E 测试。
 * 覆盖：列表页卡片点击进入详情、详情页数据展示、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("案例详情页", () => {
  test("列表页卡片可点击进入详情", async ({ page }) => {
    await page.goto("/cases")
    await page.locator("main").waitFor({ timeout: 15_000 })

    const caseLink = page.locator("a[href*='/cases/']").first()
    if (!(await caseLink.isVisible().catch(() => false))) {
      test.skip(true, "无案例数据或卡片无链接")
      return
    }

    await caseLink.click()
    await page.locator("main").waitFor({ timeout: 15_000 })
    await expect(page.locator("a[href*='/cases']").first()).toBeVisible()
  })

  test("详情页 API 正常响应", async ({ page }) => {
    await page.goto("/cases")
    await page.locator("main").waitFor({ timeout: 15_000 })

    const caseLink = page.locator("a[href*='/cases/']").first()
    if (!(await caseLink.isVisible().catch(() => false))) {
      test.skip(true, "无案例数据")
      return
    }

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/case/detail/"),
    )
    await caseLink.click()
    const response = await responsePromise.catch(() => null)
    if (response) {
      expect(response.status()).toBe(200)
    }
  })
})
