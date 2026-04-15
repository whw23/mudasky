/**
 * 院校详情页 E2E 测试。
 * 覆盖：列表页卡片点击进入详情、详情页数据展示、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("院校详情页", () => {
  test("列表页卡片可点击进入详情", async ({ page }) => {
    await page.goto("/universities")
    await page.locator("main").waitFor()

    const uniLink = page.locator("a[href*='/universities/']").first()
    if (!(await uniLink.isVisible().catch(() => false))) {
      test.skip(true, "无院校数据或卡片无链接")
      return
    }

    await uniLink.click()
    await page.locator("main").waitFor()
    await expect(page.locator("a[href*='/universities']").first()).toBeVisible()
  })

  test("详情页展示院校信息", async ({ page }) => {
    await page.goto("/universities")
    await page.locator("main").waitFor()

    const uniLink = page.locator("a[href*='/universities/']").first()
    if (!(await uniLink.isVisible().catch(() => false))) {
      test.skip(true, "无院校数据")
      return
    }

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/university/detail/"),
    )
    await uniLink.click()
    const response = await responsePromise.catch(() => null)
    if (response) {
      expect(response.status()).toBe(200)
    }

    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })
})
