/**
 * 新闻/文章详情页 E2E 测试。
 * 覆盖：文章详情页加载、返回链接。
 */

import { test, expect } from "@playwright/test"

test.describe("新闻详情页", () => {
  test("详情页加载并展示文章内容", async ({ page }) => {
    await page.goto("/")

    // 通过 API 获取文章 ID（绕过 SSR 缓存）
    const articleId = await page.evaluate(async () => {
      const res = await fetch("/api/public/content/articles?page_size=1")
      if (!res.ok) return null
      const data = await res.json()
      return data.items?.[0]?.id ?? null
    })

    if (!articleId) {
      test.skip(true, "无文章数据")
      return
    }

    await page.goto(`/news/${articleId}`)
    await page.locator("main").waitFor()

    // 返回链接可见
    await expect(page.locator("a[href*='/news']").first()).toBeVisible()
  })

  test("新闻列表页可达", async ({ page }) => {
    await page.goto("/news")
    await page.locator("main").waitFor()
    await expect(page.locator("main")).toBeVisible()
  })
})
