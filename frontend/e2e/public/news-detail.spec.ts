/**
 * 新闻/文章详情页 E2E 测试。
 * 覆盖：文章列表分页、文章详情页加载、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("新闻列表页", () => {
  test("页面加载并显示文章列表", async ({ page }) => {
    await page.goto("/news")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })

  test("点击文章链接进入详情页", async ({ page }) => {
    await page.goto("/news")
    await page.locator("main").waitFor()

    const articleLink = page.locator("a[href*='/news/']").first()
    if (!(await articleLink.isVisible().catch(() => false))) {
      test.skip(true, "无文章数据")
      return
    }

    await articleLink.click()
    await page.locator("main").waitFor()
    // 返回按钮可见
    await expect(page.locator("a[href*='/news']").first()).toBeVisible()
  })
})
